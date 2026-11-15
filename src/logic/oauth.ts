/**
 * GitHub sign-in, step 1. The server binds a one-time `state` to this browser in an
 * httpOnly cookie; GitHub sends it back with the code and the server checks it matches.
 * Used both for signing in and for linking GitHub to a signed-in account.
 */
export async function startGitHubOAuth(clientId: string): Promise<void> {
  const res = await fetch('/api/auth/oauth/github/start', { method: 'POST', credentials: 'same-origin' });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok || !data?.state) {
    throw new Error(data?.error || 'Could not start GitHub sign-in.');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'read:user,user:email',
    redirect_uri: window.location.origin,
    state: data.state,
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function fetchOAuthConfig(): Promise<{ githubClientId: string | null; devMode: boolean }> {
  try {
    const res = await fetch('/api/auth/oauth/config');
    if (res.ok) return await res.json();
  } catch {}
  return { githubClientId: null, devMode: false };
}
