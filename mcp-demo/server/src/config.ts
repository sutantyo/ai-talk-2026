export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface Config {
  port: number;
  /** Null locally: the server then uses PGlite, kept in `.data/`. */
  databaseUrl: string | null;
  /**
   * Local testing only: an email that `POST /api/auth/dev` signs in as, with no
   * Google round trip. Refused unless PUBLIC_BASE_URL is a localhost address.
   */
  devLoginEmail: string | null;
  sessionSecret: string;
  googleClientId: string;
  secureCookies: boolean;
  /**
   * The origin this server is reached at, with no trailing slash — e.g.
   * `https://phrases.example.com`, or `http://localhost:8080` locally.
   *
   * Every absolute URL in the OAuth metadata is built from this, including the
   * `resource` identifier, which must equal the connector URL the owner typed
   * into Claude exactly. Deliberately NOT derived from the request's `Host`
   * header: that header is attacker-controlled, and a server that learns its
   * own identity from an inbound request can be asked to advertise somebody
   * else's authorization server to a client that trusts it.
   */
  publicBaseUrl: string;
}

const DEFAULT_PORT = 8080;
const MIN_SECRET_LENGTH = 32;

/**
 * Reads configuration out of the environment. Nothing here has a default that
 * would let the server boot in a half-configured state: a missing
 * SESSION_SECRET must be a refusal to start, not a silently generated key that
 * signs out every user on every deploy.
 *
 * Every problem is collected before throwing. A Railway deploy that fails four
 * times in a row because it reports one missing variable per attempt is four
 * deploys; one message listing all four is one.
 *
 * The message never contains a value — only names. An error string ends up in
 * a build log, and build logs are not a place to put a database password.
 */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const problems: string[] = [];

  const required = (name: string): string => {
    const value = env[name];
    if (value === undefined || value === '') {
      problems.push(`${name} is not set`);
      return '';
    }
    return value;
  };

  const databaseUrl = env.DATABASE_URL === undefined || env.DATABASE_URL === '' ? null : env.DATABASE_URL;
  const devLoginEmail = env.DEV_LOGIN_EMAIL === undefined || env.DEV_LOGIN_EMAIL === '' ? null : env.DEV_LOGIN_EMAIL;
  const sessionSecret = required('SESSION_SECRET');
  const googleClientId = devLoginEmail === null ? required('GOOGLE_CLIENT_ID') : (env.GOOGLE_CLIENT_ID ?? '');
  const secureCookiesRaw = required('SECURE_COOKIES');
  const publicBaseUrl = required('PUBLIC_BASE_URL');

  if (sessionSecret !== '' && sessionSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  // Strict on purpose: this variable exists specifically to replace a guess
  // (the old `process.env.NODE_ENV === 'production'` inference) with an
  // explicit choice. Accepting `1`/`0`/`yes`/any other truthy-looking string
  // would reintroduce exactly the kind of silent misparse this variable was
  // added to remove — a server that thinks it said "secure" but didn't. Only
  // the two literal values are legal; everything else, including an unset
  // value, is a configuration error that must stop the server from starting
  // rather than fall back to the unsafe (non-Secure) direction.
  let secureCookies = false;
  if (secureCookiesRaw === 'true') {
    secureCookies = true;
  } else if (secureCookiesRaw === 'false') {
    secureCookies = false;
  } else if (secureCookiesRaw !== '') {
    // `secureCookiesRaw === ''` means `required` already recorded "not set";
    // adding a second problem for the same variable would be noise. This
    // branch is only for a variable that *is* set, to something other than
    // the two accepted literals. The message is a fixed string, never an
    // interpolation of what was typed — same discipline as never echoing a
    // secret's value, applied here even though this value isn't secret.
    problems.push('SECURE_COOKIES must be exactly "true" or "false"');
  }

  // Same "reject, never normalise" stance as SECURE_COOKIES, for the same
  // reason: this value's only job is to be byte-identical to what the owner
  // typed into Claude, so quietly trimming a trailing slash would leave them
  // with a server that runs and a `resource` identifier that does not match
  // their configuration — and nothing anywhere saying which of the two is
  // real.
  if (publicBaseUrl !== '' && !isOriginOnlyHttpUrl(publicBaseUrl)) {
    problems.push(
      'PUBLIC_BASE_URL must be an absolute http(s) origin with no path, query, fragment, ' +
        'credentials or trailing slash (for example: https://phrases.example.com)'
    );
  }

  if (devLoginEmail !== null && publicBaseUrl !== '' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(publicBaseUrl)) {
    problems.push('DEV_LOGIN_EMAIL is for local testing only: PUBLIC_BASE_URL must be http://localhost when it is set');
  }

  if (problems.length > 0) {
    throw new ConfigError(
      `Server configuration is incomplete:\n  - ${problems.join('\n  - ')}\n` +
        'Set these as Railway service variables (or in a local .env — see .env.example).'
    );
  }

  const parsedPort = Number(env.PORT);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT;

  return { port, databaseUrl, devLoginEmail, sessionSecret, googleClientId, secureCookies, publicBaseUrl };
}

/**
 * An origin and nothing else. A path is refused rather than supported because
 * RFC 8414 and RFC 9728 both put discovery at `/.well-known/...` on the
 * origin: a base URL carrying `/app` would make this server advertise
 * metadata URLs it does not serve, and that surfaces in Claude as a discovery
 * timeout with no cause a reader could see, rather than as the configuration
 * mistake it is.
 */
function isOriginOnlyHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  // `new URL` normalises an absent path to '/', so this accepts
  // `https://host` and refuses `https://host/app` — and the trailing-slash
  // check below is the only thing separating `https://host` from
  // `https://host/`.
  if (url.pathname !== '/') return false;
  if (url.search !== '' || url.hash !== '') return false;
  if (url.username !== '' || url.password !== '') return false;
  return !value.endsWith('/');
}
