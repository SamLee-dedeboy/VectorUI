/**
 * Browser client for the Playground dev API (see src/vite-playground-plugin.ts).
 * Manages the instance files under src/playground/sketches/. Only works under
 * `npm run dev`; in a production build the endpoints don't exist and these
 * throw, which the UI surfaces as a disabled/read-only state.
 */

const BASE = "/api/playground/instances";

async function ok(res: Response): Promise<Response> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

export async function createInstance(name: string): Promise<void> {
  await ok(
    await fetch(BASE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

export async function saveInstance(name: string, code: string): Promise<void> {
  await ok(
    await fetch(`${BASE}/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: code,
    }),
  );
}

export async function deleteInstance(name: string): Promise<void> {
  await ok(
    await fetch(`${BASE}/${encodeURIComponent(name)}`, { method: "DELETE" }),
  );
}

export async function renameInstance(name: string, to: string): Promise<void> {
  await ok(
    await fetch(`${BASE}/${encodeURIComponent(name)}/rename`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    }),
  );
}
