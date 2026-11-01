import { LIBRARY_READ, LIBRARY_WRITE } from './scope.js';

/**
 * The pages a person sees while connecting Claude: sign in, approve, or an
 * error. Server-rendered and standalone (no client bundle), so the look is
 * restated here in a few lines, matching the app's dark theme.
 */

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  state?: string;
  resource?: string;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  [LIBRARY_READ]: 'See your playlists and the videos in them.',
  [LIBRARY_WRITE]: 'Create playlists and add videos to them.'
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
  :root { color-scheme: dark; --bg: #0f0f10; --panel: #1b1b1d; --ink: #f4f1ec; --dim: #a8a39b;
          --rule: rgba(244,241,236,0.12); --accent: #e5484d; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
         font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background: var(--bg); color: var(--ink); }
  main { width: 100%; max-width: 27rem; padding: 2rem; background: var(--panel); border-radius: 10px; }
  .brand { font-weight: 800; letter-spacing: 0.08em; color: var(--accent); font-size: 0.9rem; margin-bottom: 1rem; }
  h1 { margin: 0 0 0.5rem; font-size: 1.35rem; }
  p { margin: 0 0 1rem; }
  .muted { color: var(--dim); font-size: 0.875rem; }
  .client { font-weight: 650; }
  ul { margin: 0 0 1.5rem; padding: 0; list-style: none; }
  li { padding: 0.65rem 0; border-top: 1px solid var(--rule); }
  .row { display: flex; gap: 0.6rem; }
  button { flex: 1; padding: 0.75rem 1rem; font: inherit; font-weight: 650; cursor: pointer; border-radius: 6px;
           border: 0; background: var(--accent); color: #fff; }
  button.secondary { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1px var(--rule); }
`;

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<div class="brand">COUCH</div>
${body}
</main>
</body>
</html>
`;
}

/** Every authorize parameter, carried through the form unchanged. */
function hidden(request: AuthorizeRequest): string {
  const fields: Array<[string, string | undefined]> = [
    ['response_type', request.responseType],
    ['client_id', request.clientId],
    ['redirect_uri', request.redirectUri],
    ['code_challenge', request.codeChallenge],
    ['code_challenge_method', request.codeChallengeMethod],
    ['scope', request.scope],
    ['state', request.state],
    ['resource', request.resource]
  ];
  return fields
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value as string)}">`)
    .join('\n');
}

/** Shown by `/oauth/authorize` when there is no session yet. Reloads itself once signed in. */
export function renderSignInPage(options: { googleClientId: string }): string {
  return page(
    'Sign in to continue',
    `<h1>Sign in to continue</h1>
<p>Claude is asking to connect to your video organiser. Sign in with your Google
account to see what it is asking for.</p>
<div id="g_id_onload"
     data-client_id="${escapeHtml(options.googleClientId)}"
     data-callback="onGoogleCredential"
     data-auto_prompt="false"></div>
<div class="g_id_signin" data-type="standard" data-theme="filled_black" data-text="signin_with" data-width="320"></div>
<p class="muted" id="problem" hidden></p>
<script src="${GSI_SCRIPT_URL}" async></script>
<script>
  function onGoogleCredential(response) {
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    }).then(function (res) {
      if (res.ok) { window.location.reload(); return; }
      return res.json().catch(function () { return {}; }).then(function (body) {
        var problem = document.getElementById('problem');
        problem.hidden = false;
        problem.textContent = body.error === 'not_allowlisted'
          ? 'That Google account is not allowed to use this organiser.'
          : body.error === 'verification_unavailable'
            ? 'Google could not be reached just now. Try again in a moment.'
            : 'That sign-in could not be completed.';
      });
    }).catch(function () {
      var problem = document.getElementById('problem');
      problem.hidden = false;
      problem.textContent = 'That sign-in could not be completed.';
    });
  }
</script>`
  );
}

export function renderConsentPage(options: { clientName: string; email: string; request: AuthorizeRequest }): string {
  const scopes = options.request.scope
    .split(' ')
    .map((scope) => `<li>${escapeHtml(SCOPE_DESCRIPTIONS[scope] ?? 'An unrecognised permission.')}</li>`)
    .join('\n');

  return page(
    'Connect Claude?',
    `<h1>Connect ${escapeHtml(options.clientName)}?</h1>
<p>It is asking for access to the organiser of <span class="client">${escapeHtml(options.email)}</span>. It will be able to:</p>
<ul>
${scopes}
</ul>
<form method="post" action="/oauth/authorize">
${hidden(options.request)}
<div class="row">
<button type="submit" name="decision" value="allow">Allow</button>
<button type="submit" name="decision" value="deny" class="secondary">Deny</button>
</div>
</form>
<p class="muted" style="margin-top:1rem">It can never delete, rename or move anything: those tools do not exist.</p>`
  );
}

export function renderRequestErrorPage(detail: string): string {
  return page(
    'This connector request cannot be completed',
    `<h1>This request cannot be completed</h1>
<p>${escapeHtml(detail)}</p>
<p class="muted">Nothing has been shared. If you were adding the connector in Claude, remove it and add it
again with the exact address ending in <code>/mcp</code>; if you did not start this, you can close this page.</p>`
  );
}
