/**
 * Browser client for the Playground dev API (see src/vite-playground-plugin.ts).
 * Writes the single real file `src/playground/Sketch.tsx`. Only works under
 * `npm run dev`; in a production build the endpoint doesn't exist and this
 * throws, which the editor surfaces as "save failed".
 */

const ENDPOINT = "/api/playground/sketch";

export async function saveSketch(code: string): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: code,
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
}
