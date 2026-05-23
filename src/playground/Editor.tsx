import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import sketchRaw from "./Sketch.tsx?raw";
import { saveSketch } from "./api";

/**
 * The Playground's left panel: a CodeMirror editor over the real
 * `src/playground/Sketch.tsx`.
 *
 *  • Initial contents come from the `?raw` import (the committed file).
 *  • Typing auto-saves after a short debounce (Cmd/Ctrl+S forces it now); the
 *    save hits the dev API, which writes the file, which hot-reloads the render.
 *  • Disk changes from OUTSIDE the editor — i.e. Claude Code editing the file —
 *    arrive via Vite HMR on the `?raw` module. With no unsaved local edits we
 *    adopt them silently; mid-edit we surface a banner instead of clobbering.
 *  • Without the dev API (production build) saving fails and we show a notice;
 *    the editor still renders the committed source read-only-ish.
 */

const SAVE_DEBOUNCE_MS = 500;

export function Editor() {
  const [value, setValue] = useState(sketchRaw);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  // External (on-disk) content that conflicts with unsaved local edits.
  const [conflict, setConflict] = useState<string | null>(null);

  // Refs so the once-mounted HMR handler always sees current values.
  const valueRef = useRef(value);
  const lastSyncedRef = useRef(value); // last content known to match disk
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  valueRef.current = value;

  const save = useCallback(async (code: string) => {
    setStatus("saving");
    try {
      await saveSketch(code);
      lastSyncedRef.current = code;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  const handleChange = useCallback(
    (next: string) => {
      setValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(next), SAVE_DEBOUNCE_MS);
    },
    [save],
  );

  // Cmd/Ctrl+S → save immediately.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        void save(valueRef.current);
      }
    },
    [save],
  );

  // Pull external disk edits (e.g. from Claude Code) in via HMR on ?raw.
  useEffect(() => {
    if (!import.meta.hot) return;
    import.meta.hot.accept("./Sketch.tsx?raw", (mod) => {
      const incoming = (mod as { default?: string })?.default;
      if (incoming == null) return;
      if (incoming === lastSyncedRef.current) return; // our own save echoing back
      if (valueRef.current === lastSyncedRef.current) {
        // No unsaved local edits — adopt the new disk contents.
        lastSyncedRef.current = incoming;
        setValue(incoming);
      } else {
        // Local edits diverge from disk — let the user choose.
        setConflict(incoming);
      }
    });
  }, []);

  const acceptConflict = () => {
    if (conflict == null) return;
    lastSyncedRef.current = conflict;
    setValue(conflict);
    setConflict(null);
    setStatus("idle");
  };

  return (
    <div className="pg-editor" onKeyDown={onKeyDown}>
      <div className="pg-editor-bar">
        <span className="pg-file">src/playground/Sketch.tsx</span>
        <span className={`pg-status pg-status-${status}`}>
          {status === "saving"
            ? "saving…"
            : status === "saved"
              ? "saved"
              : status === "error"
                ? "save failed — run npm run dev to edit"
                : ""}
        </span>
      </div>

      {conflict != null ? (
        <div className="pg-conflict">
          <span>File changed on disk (e.g. by Claude) while you were editing.</span>
          <button type="button" onClick={acceptConflict}>
            Load disk version
          </button>
          <button type="button" onClick={() => setConflict(null)}>
            Keep mine
          </button>
        </div>
      ) : null}

      <CodeMirror
        value={value}
        onChange={handleChange}
        theme={oneDark}
        extensions={[javascript({ jsx: true, typescript: true })]}
        height="100%"
        className="pg-cm"
      />
    </div>
  );
}
