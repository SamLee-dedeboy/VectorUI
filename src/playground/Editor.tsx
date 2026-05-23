import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { saveInstance } from "./api";

/**
 * The Playground's left panel: a CodeMirror editor over one real instance file
 * (src/playground/sketches/<name>.tsx).
 *
 *  • Mount it with `key={name}` so switching instances reseeds it cleanly.
 *  • Typing auto-saves after a short debounce (Cmd/Ctrl+S forces it); the save
 *    writes the file via the dev API, which hot-reloads the render.
 *  • `diskContent` is the file's current text (from the parent's `?raw` glob,
 *    kept live by HMR). When it changes from OUTSIDE the editor — i.e. Claude
 *    Code editing the file — we adopt it if there are no unsaved local edits,
 *    else show a conflict banner instead of clobbering.
 *  • Without the dev API (production build) saving fails and we show a notice.
 */

const SAVE_DEBOUNCE_MS = 500;

export function Editor({
  name,
  diskContent,
}: {
  name: string;
  diskContent: string;
}) {
  const [value, setValue] = useState(diskContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  // External (on-disk) content that conflicts with unsaved local edits.
  const [conflict, setConflict] = useState<string | null>(null);

  const valueRef = useRef(value);
  const lastSyncedRef = useRef(diskContent); // last content known to match disk
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  valueRef.current = value;

  const save = useCallback(
    async (code: string) => {
      setStatus("saving");
      try {
        await saveInstance(name, code);
        lastSyncedRef.current = code;
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    },
    [name],
  );

  const handleChange = useCallback(
    (next: string) => {
      setValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(next), SAVE_DEBOUNCE_MS);
    },
    [save],
  );

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

  // Pull external disk edits (e.g. from Claude Code) in when `diskContent`
  // changes — HMR refreshes the parent's ?raw glob, which flows down here.
  useEffect(() => {
    if (diskContent === lastSyncedRef.current) return; // our own save echoing back
    if (valueRef.current === lastSyncedRef.current) {
      lastSyncedRef.current = diskContent; // no local edits — adopt silently
      setValue(diskContent);
    } else {
      setConflict(diskContent); // diverged — let the user choose
    }
  }, [diskContent]);

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
        <span className="pg-file">src/playground/sketches/{name}.tsx</span>
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
