/**
 * JSON-RPC 2.0, the framing MCP messages arrive in.
 *
 * Hand-rolled rather than taken from the MCP SDK, for the same reason
 * `session.ts` is not a JWT library: what this needs is one strict parser and
 * two constructors, and the SDK would bring a transport, a session model and a
 * server abstraction shaped around protocol revisions this server has
 * deliberately not adopted (see the 2026-08-23 correction in the design).
 */

/** The codes JSON-RPC 2.0 assigns. Not ours to choose. */
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export type JsonRpcId = string | number;

export interface JsonRpcCall {
  method: string;
  /** Always an object: absent params become `{}` so no caller has to check. */
  params: Record<string, unknown>;
  /**
   * `null` means NOTIFICATION -- no id was sent, and the transport answers
   * `202` with no body. It does not mean "the id was null": a literal `null`
   * id is refused by the parser, because accepting it would make the two
   * indistinguishable.
   */
  id: JsonRpcId | null;
}

/**
 * Returns the call, or `null` if the body is not a single valid JSON-RPC 2.0
 * request or notification.
 *
 * Strict on purpose. Everything this rejects, it rejects because accepting it
 * would leave a caller unable to tell what happened -- an unmatched id, a
 * response that never arrives, a batch answered with one object.
 */
export function parseJsonRpc(body: unknown): JsonRpcCall | null {
  // Arrays first: a batch is an object to `typeof`, and batching left the
  // protocol in 2025-06-18. Half-supporting it is worse than refusing it.
  //
  // Belt and braces, and knowingly so: an array carries no `jsonrpc` property
  // and no `method`, so the two checks below would refuse it anyway. The
  // mutation harness proved that -- removing this guard changes nothing
  // observable, and `parseJsonRpc refuses a batch` is the one test in this file
  // no single mutation can fail. It stays because it pins the behaviour, and
  // this note stays so the next reader knows it is not load-bearing.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
  const message = body as Record<string, unknown>;

  if (message.jsonrpc !== '2.0') return null;

  const method = message.method;
  if (typeof method !== 'string' || method === '') return null;

  let id: JsonRpcId | null = null;
  if ('id' in message) {
    const raw = message.id;
    // `typeof raw === 'number'` accepts 0, which is a legal id and a falsy
    // value: anything written as `if (raw)` would silently demote a request
    // to a notification and leave the client waiting forever.
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    id = raw;
  }

  let params: Record<string, unknown> = {};
  if ('params' in message && message.params !== undefined) {
    const raw = message.params;
    // Every MCP method takes named parameters, so positional params are not a
    // shape this server can act on.
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    params = raw as Record<string, unknown>;
  }

  return { id, method, params };
}

export function jsonRpcResult(id: JsonRpcId, result: unknown): Record<string, unknown> {
  return { jsonrpc: '2.0', id, result };
}

/**
 * `id` is `null` when the request was too malformed to have one -- a parse
 * error, or a body that is not a JSON-RPC message. JSON-RPC 2.0 requires the
 * field to be present and null in that case rather than omitted.
 */
export function jsonRpcError(
  id: JsonRpcId | null,
  code: number,
  message: string
): Record<string, unknown> {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
