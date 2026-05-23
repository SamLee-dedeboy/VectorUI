import { Component, type ReactNode } from "react";
import { Editor } from "./Editor";
import Sketch from "./Sketch";

/**
 * Demo page — the Playground. Left: a CodeMirror editor over the real
 * `src/playground/Sketch.tsx`. Right: that same component, rendered live.
 *
 * No in-browser compiler is involved: Sketch.tsx is a real file, so Vite
 * compiles it and React Fast Refresh re-renders the right panel whenever it
 * changes — whether the edit came from the editor (via the dev save API) or
 * from Claude Code editing the file directly.
 */
export function Demo() {
  return (
    <div className="pg-split">
      <div className="pg-pane pg-pane-editor">
        <Editor />
      </div>
      <div className="pg-pane pg-pane-render">
        <SketchBoundary>
          <Sketch />
        </SketchBoundary>
      </div>
    </div>
  );
}

/**
 * Keeps a runtime error in the sketch from blanking the whole page. Fast
 * Refresh resets boundary state on the next successful edit, so fixing the
 * sketch clears the error automatically.
 */
class SketchBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="pg-error">
          <strong>Sketch threw at runtime</strong>
          <pre>{this.state.error.message}</pre>
          <p>Fix it in the editor — this clears on the next successful edit.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
