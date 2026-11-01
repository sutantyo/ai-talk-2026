import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Reads a local `.env` into `process.env`, if there is one.
 *
 * This closes a gap that had been documented shut. Every document in this
 * repository described the phase 2 variables as "Railway variables, locally
 * mirrored in a gitignored `.env`", and `config.ts`'s own failure message says
 * "or in a local .env" — but nothing anywhere loaded that file. There is no
 * `dotenv` dependency, and Vitest only reads `.env` for `VITE_`-prefixed values
 * it puts on `import.meta.env`, never on `process.env`. Proven rather than
 * assumed: a `.env` holding a deliberately bogus `DATABASE_URL` still produced
 * "DATABASE_URL is not set", not a connection error. Anyone following the
 * documented workflow got a server that refused to boot for no visible reason,
 * and `npm run test:db` needed an incantation
 * (`DATABASE_URL=$(grep ... .env | cut ... | tr -d '\r') npm run test:db`)
 * that was itself the evidence.
 *
 * Node's own `process.loadEnvFile` does the job, so no dependency is added.
 * Two of its properties are the reason it is safe to call in production as
 * well as in development, and both were verified on this machine rather than
 * taken from documentation:
 *
 *  - **The real environment wins.** A variable already set in `process.env` is
 *    *not* overwritten by the file. Railway's service variables therefore
 *    always beat anything a stray `.env` in the image might say. (Verified:
 *    `FOO=from_shell` + a file saying `FOO=from_file` leaves `FOO=from_shell`.)
 *  - **CRLF is handled.** A `.env` saved by a Windows editor does not smuggle a
 *    trailing `\r` into the value — which is exactly what the `tr -d '\r'` in
 *    the old incantation was there to strip.
 *
 * Absence is silent and normal: on Railway there is no `.env` at all, because
 * it is gitignored and never reaches the image. Only a file that was actually
 * read is announced, so that a variable coming from a file rather than from the
 * environment is never a surprise.
 */
export type EnvFileOutcome = 'loaded' | 'absent' | 'unsupported' | 'failed';

export interface EnvFileDeps {
  /** Whether the file is there. */
  exists(path: string): boolean;
  /**
   * Node's `process.loadEnvFile`, or `undefined` on a runtime too old to have
   * it (added in Node 20.12). Undefined is reported, never silently ignored:
   * "my variables are not being read" must not be something you have to guess.
   */
  load: ((path: string) => void) | undefined;
  /** Where the one line of announcement or complaint goes. */
  log(message: string): void;
}

const defaultDeps = (): EnvFileDeps => ({
  exists: existsSync,
  load: typeof process.loadEnvFile === 'function' ? (path) => process.loadEnvFile(path) : undefined,
  log: (message) => console.warn(message)
});

/**
 * @param file Absolute path to the env file. Callers pass
 *   `envFilePath()` — the `.env` beside the working directory, which is the
 *   repository root for every `npm` script in this project.
 */
export function loadEnvFile(file: string, deps: EnvFileDeps = defaultDeps()): EnvFileOutcome {
  if (!deps.exists(file)) return 'absent';

  if (deps.load === undefined) {
    deps.log(
      `Found ${file} but this Node cannot read it: process.loadEnvFile requires Node 20.12 or newer. ` +
        'Export the variables into your shell instead, or upgrade Node.'
    );
    return 'unsupported';
  }

  try {
    deps.load(file);
  } catch (error) {
    // A malformed or unreadable file must not take the server down on its own
    // — the variables may all be set in the real environment anyway, and
    // `loadConfig` is the thing entitled to refuse to start. But it says so.
    deps.log(`Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }

  deps.log(
    `Loaded environment from ${file}. Variables already set in the environment were left alone.`
  );
  return 'loaded';
}

/** The `.env` this project means: the one beside the working directory. */
export function envFilePath(cwd: string = process.cwd()): string {
  return resolve(cwd, '.env');
}
