/// <reference types="node" />
import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Dev-only API behind the Playground page (src/playground).
 *
 * The Playground edits REAL files under `src/playground/sketches/*.tsx` — one
 * per "instance". Because they're real files, Vite compiles them with React
 * Fast Refresh, so the render panel needs no in-browser compiler: any change
 * (from this API OR from Claude Code editing a file directly) hot-reloads.
 * Runs only under `vite` dev (`configureServer`), never in a build.
 *
 *   GET    /api/playground/instances              → { names: string[] }
 *   POST   /api/playground/instances              → create { name } (starter)
 *   PUT    /api/playground/instances/:name        → overwrite with the body
 *   DELETE /api/playground/instances/:name        → remove the file
 *   POST   /api/playground/instances/:name/rename → rename to { to }
 *
 * Every path is confined to the sketches directory and names are validated, so
 * the API can only ever touch `src/playground/sketches/<valid-name>.tsx`.
 */

const BASE = "/api/playground/instances";
const NAME_RE = /^[A-Za-z0-9_-]{1,40}$/;

export function playgroundPlugin(): Plugin {
  return {
    name: "vectorui-playground",
    apply: "serve",
    configureServer(server) {
      const sketchesDir = path.resolve(
        server.config.root,
        "src/playground/sketches",
      );

      const fileFor = (name: string): string | null => {
        if (!NAME_RE.test(name)) return null;
        const p = path.join(sketchesDir, `${name}.tsx`);
        // Defence in depth: the resolved path must stay inside the dir.
        if (path.dirname(p) !== sketchesDir) return null;
        return p;
      };

      // Adding/removing a file changes the instance set, which the page reads
      // via `import.meta.glob`. Hot-updating that set mid-session can wedge React
      // Fast Refresh, so force a clean full reload instead: invalidate the graph
      // (next request re-scans the glob) and tell the client to reload. Saves
      // (PUT) deliberately don't do this — editing must stay on Fast Refresh.
      const reloadClients = () => {
        server.moduleGraph.invalidateAll();
        server.ws.send({ type: "full-reload" });
      };

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (url !== BASE && !url.startsWith(`${BASE}/`)) return next();

        const send = (code: number, body?: string) => {
          res.statusCode = code;
          res.end(body);
        };
        const sendJSON = (code: number, value: unknown) => {
          res.statusCode = code;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify(value));
        };

        try {
          await fs.mkdir(sketchesDir, { recursive: true });

          // ---- collection routes: /api/playground/instances ----
          if (url === BASE) {
            if (req.method === "GET") {
              const entries = await fs.readdir(sketchesDir);
              const names = entries
                .filter((f) => f.endsWith(".tsx"))
                .map((f) => f.slice(0, -4))
                .sort();
              return sendJSON(200, { names });
            }
            if (req.method === "POST") {
              const { name } = JSON.parse((await readBody(req)) || "{}");
              const file = fileFor(name);
              if (!file) return send(400, "invalid instance name");
              if (await exists(file)) return send(409, "instance already exists");
              await fs.writeFile(file, starterTemplate(name), "utf8");
              reloadClients();
              return sendJSON(201, { name });
            }
            return send(405, "method not allowed");
          }

          // ---- item routes: /api/playground/instances/<name>[/rename] ----
          const rest = url.slice(BASE.length + 1); // "<name>" or "<name>/rename"
          const [rawName, action] = rest.split("/");
          const name = decodeURIComponent(rawName ?? "");
          const file = fileFor(name);
          if (!file) return send(400, "invalid instance name");

          if (action === "rename" && req.method === "POST") {
            const { to } = JSON.parse((await readBody(req)) || "{}");
            const target = fileFor(to);
            if (!target) return send(400, "invalid target name");
            if (!(await exists(file))) return send(404, "instance not found");
            if (await exists(target)) return send(409, "target already exists");
            await fs.rename(file, target);
            reloadClients();
            return sendJSON(200, { name: to });
          }

          if (!action) {
            if (req.method === "PUT") {
              await fs.writeFile(file, await readBody(req), "utf8");
              return send(204);
            }
            if (req.method === "DELETE") {
              await fs.rm(file, { force: true });
              reloadClients();
              return send(204);
            }
          }

          return send(405, "method not allowed");
        } catch (e) {
          send(500, `playground error: ${(e as Error).message}`);
        }
      });
    },
  };
}

/** The component a freshly created instance starts from. */
function starterTemplate(name: string): string {
  return `import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { tokens } from "../../tokens";

export default function Sketch() {
  return (
    <VectorUIRoot
      style={{
        border: \`1px solid \${tokens.color.line}\`,
        background: tokens.color.surface,
        borderRadius: 12,
      }}
    >
      <Flow direction="column" padding={28} gap={12}>
        <Text {...tokens.type.title} fill={tokens.color.ink}>
          ${name}
        </Text>
        <Text {...tokens.type.body} fill={tokens.color.inkMuted}>
          A new instance. Edit this file, or ask Claude Code to edit
          src/playground/sketches/${name}.tsx.
        </Text>
      </Flow>
    </VectorUIRoot>
  );
}
`;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
