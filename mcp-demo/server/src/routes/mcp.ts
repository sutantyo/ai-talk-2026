import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ApiDeps } from './auth.js';
import type { LibraryStore } from '../store.js';
import type { ChangeHub } from '../events.js';
import type { LookupVideo } from '../youtube.js';
import type { LookupFacebookReel } from '../facebook.js';
import type { ChannelService } from '../channels.js';
import type { ChannelSource } from '../youtubeChannels.js';
import { mcpResourceUrl } from '../oauth/metadata.js';
import { verifyAccessToken } from '../oauth/accessToken.js';
import { bearerChallenge, bearerToken } from '../mcp/challenge.js';
import {
  parseJsonRpc,
  jsonRpcError,
  jsonRpcResult,
  INVALID_PARAMS,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INTERNAL_ERROR,
  type JsonRpcId
} from '../mcp/jsonRpc.js';
import { SERVER_INSTRUCTIONS } from '../mcp/instructions.js';
import { findTool, grantsScope, toolDescriptors } from '../mcp/tools.js';

/**
 * The MCP resource server: plan two of the remote connector design.
 *
 * PROTOCOL 2025-11-25, NOT THE DRAFT. See the 2026-08-23 correction in
 * docs/superpowers/specs/2026-08-22-remote-mcp-connector-design.md: the draft
 * removed the `initialize` handshake and protocol-level sessions, and Claude
 * does not speak it. Everything version-specific is in this file so that when
 * Claude does adopt the draft, the tools do not move.
 */

export interface McpDeps {
  library: LibraryStore;
  lookupVideo: LookupVideo;
  lookupFacebookReel: LookupFacebookReel;
  changes: ChangeHub;
  channels: ChannelService;
  channelSource: ChannelSource;
  /** Origin, no trailing slash. The token audience is derived from it. */
  publicBaseUrl: string;
}

/** Newest first: the version this server prefers when it has a choice. */
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

const SERVER_INFO = { name: 'couch-video-organiser', version: '0.1.0' };

export function registerMcpRoutes(app: FastifyInstance, api: ApiDeps, mcp: McpDeps): void {
  const audience = mcpResourceUrl(mcp.publicBaseUrl);

  /**
   * Neither the standalone SSE stream nor session termination is implemented,
   * and the transport says to answer `405` rather than `404` for both — a
   * `404` would look to a client like the endpoint is absent.
   */
  const methodNotAllowed = async (_request: unknown, reply: FastifyReply) =>
    reply.code(405).header('allow', 'POST').send();
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.post('/mcp', async (request, reply) => {
    reply.header('cache-control', 'no-store');

    /*
      Origin, first. The transport requires this check to stop a page in a
      browser from reaching an MCP endpoint via DNS rebinding. Claude's own
      requests are server-to-server and carry no Origin, so the rule is:
      absent is fine, present-and-not-us is 403.
    */
    const origin = request.headers.origin;
    if (typeof origin === 'string' && origin !== mcp.publicBaseUrl) {
      return reply.code(403).send(jsonRpcError(null, INVALID_REQUEST, 'Origin not allowed.'));
    }

    // Honoured when sent, not required when absent: a 2025-03-26 client does
    // not send it, and refusing those would narrow what can connect for no
    // gain.
    const requestedVersion = request.headers['mcp-protocol-version'];
    if (typeof requestedVersion === 'string' && !SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)) {
      return reply
        .code(400)
        .send(
          jsonRpcError(
            null,
            INVALID_REQUEST,
            `Unsupported protocol version. This server implements ${SUPPORTED_PROTOCOL_VERSIONS.join(', ')}.`
          )
        );
    }

    /*
      THE 401 HANDSHAKE. Claude discovers the authorization server entirely
      from this response, and it does NOT honour a `WWW-Authenticate` header on
      a `200` — so the header and the status have to arrive together or the
      connector simply never authenticates.

      Every failure answers identically: absent token, malformed token, forged
      MAC, expired, or minted for another audience. A prober learns only that
      it needs a token.
    */
    const token = bearerToken(request.headers.authorization);
    const claims =
      token === null
        ? null
        : verifyAccessToken(token, {
            // The resource server must reject a token whose audience is not
            // itself. `verifyAccessToken` requires the audience rather than
            // defaulting it, so this cannot be forgotten.
            audience,
            nowMs: api.now(),
            secret: api.sessionSecret
          });

    if (claims === null) {
      return reply
        .code(401)
        .header('www-authenticate', bearerChallenge(mcp.publicBaseUrl))
        .send(jsonRpcError(null, INVALID_REQUEST, 'Authorization required.'));
    }

    const call = parseJsonRpc(request.body);
    if (call === null) {
      return reply.code(400).send(jsonRpcError(null, INVALID_REQUEST, 'Not a JSON-RPC 2.0 message.'));
    }

    // A notification gets `202` and no body. Answering it with a result would
    // be a response to a message that has no id to match it against.
    if (call.id === null) {
      return reply.code(202).send();
    }
    const id: JsonRpcId = call.id;

    switch (call.method) {
      case 'initialize':
        return reply.send(jsonRpcResult(id, initializeResult(call.params)));

      // The spec's liveness check. Answering `{}` is the whole contract.
      case 'ping':
        return reply.send(jsonRpcResult(id, {}));

      case 'tools/list':
        return reply.send(jsonRpcResult(id, { tools: toolDescriptors() }));

      case 'tools/call':
        return callTool(reply, id, call.params, claims.subject, claims.scope);

      default:
        return reply.send(jsonRpcError(id, METHOD_NOT_FOUND, `Unknown method: ${call.method}`));
    }
  });

  function initializeResult(params: Record<string, unknown>): Record<string, unknown> {
    // Echo the client's version when this server implements it; otherwise
    // answer with its own newest and let the client decide. That is the
    // negotiation the initialization-based revisions describe.
    const asked = params.protocolVersion;
    const protocolVersion =
      typeof asked === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(asked)
        ? asked
        : SUPPORTED_PROTOCOL_VERSIONS[0];

    return {
      protocolVersion,
      // `tools` only, and no `listChanged`: the tool list is a constant in the
      // source, so promising change notifications would be a promise nothing
      // can keep.
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
      instructions: SERVER_INSTRUCTIONS
    };
  }

  async function callTool(
    reply: FastifyReply,
    id: JsonRpcId,
    params: Record<string, unknown>,
    userId: string,
    scope: string
  ): Promise<FastifyReply> {
    const tool = findTool(params.name);
    // An unknown tool is a PROTOCOL error: no change of arguments fixes it, so
    // the model gains nothing from being handed it as a result to retry.
    if (tool === null) {
      return reply.send(jsonRpcError(id, INVALID_PARAMS, `Unknown tool: ${String(params.name)}`));
    }

    const args = params.arguments;
    if (args !== undefined && (args === null || typeof args !== 'object' || Array.isArray(args))) {
      return reply.send(jsonRpcError(id, INVALID_PARAMS, 'arguments must be an object.'));
    }

    /*
      Scope, per tool. A TOOL EXECUTION ERROR rather than a `401`: the token is
      valid, so re-authenticating is not the fix, and a model that is told
      which scope is missing can say something the owner can act on. A bare
      401 here would also drop the whole MCP session over one tool.
    */
    if (!grantsScope(scope, tool.scope)) {
      return reply.send(
        jsonRpcResult(id, {
          content: [
            {
              type: 'text',
              text: `This connector was approved without the ${tool.scope} permission, so ${tool.name} cannot be used. Remove the connector in Claude and add it again to grant it.`
            }
          ],
          isError: true
        })
      );
    }

    try {
      const result = await tool.run((args ?? {}) as Record<string, unknown>, {
        library: mcp.library,
        lookupVideo: mcp.lookupVideo,
        lookupFacebookReel: mcp.lookupFacebookReel,
        changes: mcp.changes,
        channels: mcp.channels,
        channelSource: mcp.channelSource,
        userId,
        scope
      });
      return reply.send(jsonRpcResult(id, result));
    } catch (error) {
      // The message is withheld deliberately and logged instead — the same
      // discipline sync.ts uses for a store failure. A database error's text
      // is not something to hand to a model driving a conversation.
      request_log_error(reply, error);
      return reply.send(jsonRpcError(id, INTERNAL_ERROR, `${tool.name} failed.`));
    }
  }
}

/** Kept separate so the catch above reads as one line. */
function request_log_error(reply: FastifyReply, error: unknown): void {
  reply.request.log.error({ err: error }, 'mcp tool failed');
}
