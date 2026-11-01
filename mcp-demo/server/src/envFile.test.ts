import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadEnvFile, envFilePath, type EnvFileDeps } from './envFile';

function fakeDeps(overrides: Partial<EnvFileDeps> = {}): EnvFileDeps & { logs: string[]; loaded: string[] } {
  const logs: string[] = [];
  const loaded: string[] = [];
  return {
    logs,
    loaded,
    exists: () => true,
    load: (path: string) => {
      loaded.push(path);
    },
    log: (message: string) => {
      logs.push(message);
    },
    ...overrides
  };
}

/**
 * A real file in a real temp directory, read by the real
 * `process.loadEnvFile`. The precedence rule below is the entire justification
 * for calling this in production as well as in development, so it is asserted
 * against Node itself and not against a double — a stubbed `load` could be
 * made to "prove" any precedence at all.
 */
const dirs: string[] = [];
const touchedEnv: string[] = [];

function envFileHolding(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'jpb-envfile-'));
  dirs.push(dir);
  const file = join(dir, '.env');
  writeFileSync(file, contents);
  return file;
}

afterEach(() => {
  for (const name of touchedEnv.splice(0)) delete process.env[name];
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('loadEnvFile', () => {
  it('does nothing, and says nothing, when there is no .env', () => {
    // Production: the file is gitignored, so it never reaches the image. This
    // must be an ordinary quiet path, not a warning on every Railway boot.
    const deps = fakeDeps({ exists: () => false });

    expect(loadEnvFile('/nowhere/.env', deps)).toBe('absent');
    expect(deps.loaded).toEqual([]);
    expect(deps.logs).toEqual([]);
  });

  it('reads the file it was given, and announces that it did', () => {
    const deps = fakeDeps();

    expect(loadEnvFile('/app/.env', deps)).toBe('loaded');
    expect(deps.loaded).toEqual(['/app/.env']);
    expect(deps.logs).toHaveLength(1);
    expect(deps.logs[0]).toContain('/app/.env');
  });

  it('says so, rather than silently ignoring the file, on a Node without loadEnvFile', () => {
    const deps = fakeDeps({ load: undefined });

    expect(loadEnvFile('/app/.env', deps)).toBe('unsupported');
    expect(deps.logs[0]).toContain('20.12');
  });

  it('survives a malformed file and reports it, leaving loadConfig to refuse', () => {
    const deps = fakeDeps({
      load: () => {
        throw new Error('bad env line');
      }
    });

    expect(loadEnvFile('/app/.env', deps)).toBe('failed');
    expect(deps.logs[0]).toContain('bad env line');
  });

  describe('against the real process.loadEnvFile', () => {
    it('fills in a variable that is not already set', () => {
      touchedEnv.push('JPB_ENVFILE_FRESH');
      const file = envFileHolding('JPB_ENVFILE_FRESH=from_file\n');

      expect(process.env.JPB_ENVFILE_FRESH).toBeUndefined();
      expect(loadEnvFile(file)).toBe('loaded');
      expect(process.env.JPB_ENVFILE_FRESH).toBe('from_file');
    });

    it('never overwrites a variable the real environment already set', () => {
      // The load-bearing property. Railway sets DATABASE_URL, SESSION_SECRET
      // and the rest as service variables; if a .env that somehow reached the
      // image could win, this would be a way to point production at the wrong
      // database. It cannot.
      touchedEnv.push('JPB_ENVFILE_HELD');
      process.env.JPB_ENVFILE_HELD = 'from_environment';
      const file = envFileHolding('JPB_ENVFILE_HELD=from_file\n');

      expect(loadEnvFile(file)).toBe('loaded');
      expect(process.env.JPB_ENVFILE_HELD).toBe('from_environment');
    });

    it('does not smuggle a trailing carriage return out of a CRLF file', () => {
      // What the old `tr -d '\r'` in the test:db incantation was stripping. A
      // DATABASE_URL with a trailing \r fails to connect in a way that reads
      // like a network problem.
      touchedEnv.push('JPB_ENVFILE_CRLF');
      const file = envFileHolding('JPB_ENVFILE_CRLF=postgres://u:p@localhost:5432/jpb_test\r\n');

      expect(loadEnvFile(file)).toBe('loaded');
      expect(process.env.JPB_ENVFILE_CRLF).toBe('postgres://u:p@localhost:5432/jpb_test');
    });
  });
});

describe('envFilePath', () => {
  it('is the .env beside the working directory', () => {
    expect(envFilePath('/app')).toBe(resolve('/app', '.env'));
  });
});
