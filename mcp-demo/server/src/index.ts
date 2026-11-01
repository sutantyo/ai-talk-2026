import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildServer } from './app.js';
import { loadConfig } from './config.js';
import { createPgPool, createPgliteDb, migrate } from './db.js';
import { createLibraryStore, createUserStore } from './store.js';
import { createPostgresOAuthStore } from './oauth/store.js';
import { createGoogleVerifier } from './google.js';
import { parseAllowlist } from './allowlist.js';
import { resolveClientDir } from './clientDir.js';
import { loadEnvFile, envFilePath } from './envFile.js';
import { ChangeHub } from './events.js';
import { createOEmbedLookup } from './youtube.js';
import { ChannelService } from './channels.js';
import { createYouTubeChannelSource } from './youtubeChannels.js';

// A local .env tops up the environment; Railway's variables always win.
loadEnvFile(envFilePath());

const here = dirname(fileURLToPath(import.meta.url));
const client = resolveClientDir(here);
const config = loadConfig(process.env);

if (client.clientDir === null) {
  console.warn(
    'No built client found: serving the API only. Expected under `npm run dev:server`; on a deploy it means the build failed.'
  );
}

const allowedEmails = parseAllowlist(process.env.ALLOWED_EMAILS);
if (allowedEmails === null) {
  console.warn('ALLOWED_EMAILS is not set: Google sign-in will accept ANY Google account.');
}

let db;
if (config.databaseUrl === null) {
  const dataDir = resolve(process.cwd(), '.data', 'pglite');
  console.log(`No DATABASE_URL: using PGlite in ${dataDir}`);
  db = await createPgliteDb(dataDir);
} else {
  db = createPgPool(config.databaseUrl);
}
await migrate(db);

if (config.devLoginEmail !== null) {
  console.warn(`DEV_LOGIN_EMAIL is set: POST /api/auth/dev signs in as ${config.devLoginEmail}. Local testing only.`);
}

const changes = new ChangeHub();
const library = createLibraryStore(db);
const now = () => Date.now();
const channelSource = createYouTubeChannelSource();
const channels = new ChannelService(db, channelSource, changes, now);

const app = buildServer({
  clientDir: client.clientDir,
  logger: true,
  api: {
    store: createUserStore(db),
    verifyGoogleIdToken: createGoogleVerifier(config.googleClientId),
    sessionSecret: config.sessionSecret,
    secureCookies: config.secureCookies,
    allowedEmails,
    now
  },
  library: { library, changes, channels, devLoginEmail: config.devLoginEmail, googleClientId: config.googleClientId },
  mcp: { library, lookupVideo: createOEmbedLookup(), changes, channels, channelSource, publicBaseUrl: config.publicBaseUrl },
  oauth: {
    store: createPostgresOAuthStore(db),
    publicBaseUrl: config.publicBaseUrl,
    googleClientId: config.googleClientId
  }
});

// Close the database cleanly on Ctrl+C or a platform stop. PGlite in particular
// writes its files from memory, and a process killed mid-write can leave a data
// folder it cannot open again.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app
      .close()
      .then(() => db.end())
      .finally(() => process.exit(0));
  });
}

app.listen({ port: config.port, host: '0.0.0.0' }).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
