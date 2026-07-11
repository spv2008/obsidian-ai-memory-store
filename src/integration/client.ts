export const BASE_URL = (process.env.OBSIDIAN_HOST ?? "http://localhost:27127").replace(/\/$/, "");
export const API_KEY = process.env.OBSIDIAN_API_KEY ?? "";

if (!API_KEY) {
  throw new Error("OBSIDIAN_API_KEY env var is required to run integration tests.");
}

export function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${API_KEY}`);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

export function unauthFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init);
}

export async function ensureServerReachable(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok && res.status !== 401) throw new Error(`status ${res.status}`);
  } catch (e) {
    throw new Error(
      `Cannot reach AI Memory Store at ${BASE_URL}. ` +
      `Start Obsidian with the plugin's insecure HTTP server enabled. Error: ${e}`,
    );
  }
}
