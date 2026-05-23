/// <reference types="node" />
import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Dev-only API behind the Playground page (src/demos/playground).
 *
 * The Playground edits a single REAL file on disk — `src/playground/Sketch.tsx`.
 * Because the file is real, Vite already compiles it with React Fast Refresh, so
 * the render panel needs no in-browser compiler: any change (from this endpoint
 * OR from Claude Code editing the file directly) hot-reloads the render. The
 * editor seeds its initial value from the `?raw` import, so it only needs to
 * write — hence POST only. Runs under `vite` dev (`configureServer`), never in a
 * build.
 *
 *   POST /api/playground/sketch  → overwrite the file with the request body
 *
 * The target path is hardcoded (no client-supplied path), so the endpoint can
 * only ever touch this one file.
 */

const ROUTE = "/api/playground/sketch";

export function playgroundPlugin(): Plugin {
  return {
    name: "vectorui-playground",
    apply: "serve",
    configureServer(server) {
      const sketchPath = path.resolve(
        server.config.root,
        "src/playground/Sketch.tsx",
      );

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (url !== ROUTE) return next();

        try {
          if (req.method === "POST") {
            const body = await readBody(req);
            await fs.writeFile(sketchPath, body, "utf8");
            res.statusCode = 204;
            res.end();
            return;
          }

          res.statusCode = 405;
          res.end("method not allowed");
        } catch (e) {
          res.statusCode = 500;
          res.end(`playground error: ${(e as Error).message}`);
        }
      });
    },
  };
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
