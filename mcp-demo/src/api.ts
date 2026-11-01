import type { LibraryResponse, SessionResponse, Video } from '../shared/protocol';

export interface PublicConfig {
  googleClientId: string;
  devLogin: boolean;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`${response.status}`);
  return (await response.json()) as T;
}

export const api = {
  config: () => fetch('/api/config').then((r) => json<PublicConfig>(r)),
  session: () => fetch('/api/auth/session').then((r) => json<SessionResponse>(r)),
  library: () => fetch('/api/library').then((r) => json<LibraryResponse>(r)),
  signInWithGoogle: (credential: string) =>
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential })
    }),
  devSignIn: () => fetch('/api/auth/dev', { method: 'POST' }).then((r) => json<SessionResponse>(r)),
  signOut: () => fetch('/api/auth/signout', { method: 'POST' }),
  setWatched: (videoId: string, watched: boolean) =>
    fetch(`/api/videos/${videoId}/watched`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ watched })
    }).then((r) => json<Video>(r))
};
