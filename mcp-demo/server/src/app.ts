import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { registerAuthRoutes, type ApiDeps } from './routes/auth.js';
import { registerLibraryRoutes, type LibraryDeps } from './routes/library.js';
import { registerOAuthRoutes, type OAuthDeps } from './routes/oauth.js';
import { registerMcpRoutes, type McpDeps } from './routes/mcp.js';

export interface ServerDeps {
  /** Absolute path to the built client (`dist/`), or null to serve the API alone (dev, tests). */
  clientDir: string | null;
  logger?: boolean | FastifyBaseLogger;
  api: ApiDeps;
  library: LibraryDeps;
  oauth: OAuthDeps;
  mcp: McpDeps;
}

/**
 * The whole server from injected dependencies, so tests can use `app.inject()`.
 * One origin for page, API, OAuth and MCP: no CORS anywhere, on purpose.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const logger = deps.logger ?? false;
  const app = Fastify(typeof logger === 'object' ? { loggerInstance: logger } : { logger });

  app.register(fastifyCookie);
  app.get('/api/health', async () => ({ ok: true }));

  registerAuthRoutes(app, deps.api);
  registerLibraryRoutes(app, deps.api, deps.library);
  registerOAuthRoutes(app, deps.api, deps.oauth);
  registerMcpRoutes(app, deps.api, deps.mcp);

  if (deps.clientDir !== null) {
    app.register(fastifyStatic, { root: deps.clientDir, index: ['index.html'] });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) return reply.sendFile('index.html');
      return reply.code(404).send({ error: 'not_found' });
    });
  }

  return app;
}
