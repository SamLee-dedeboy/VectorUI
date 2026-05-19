import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import type { SourceFile } from "./demos/registry";

/**
 * The "Code" tab of a demo page — shows the exact source that produced the
 * demo (imported verbatim via Vite `?raw`), with syntax highlighting and a
 * file switcher when a demo spans more than one file.
 */
export function CodeView({ sources }: { sources: SourceFile[] }) {
  const [active, setActive] = useState(0);

  if (sources.length === 0) {
    return <p className="proves">No source available for this demo.</p>;
  }

  const index = Math.min(active, sources.length - 1);
  const file = sources[index];
  const language = file.name.endsWith(".tsx") ? "tsx" : "typescript";

  return (
    <div className="code-view">
      {sources.length > 1 ? (
        <div className="code-files" role="tablist" aria-label="Source files">
          {sources.map((source, i) => (
            <button
              key={source.name}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={i === index ? "code-file active" : "code-file"}
              onClick={() => setActive(i)}
            >
              {source.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="code-files">
          <span className="code-file static">{file.name}</span>
        </div>
      )}

      <Highlight
        code={file.code.trimEnd()}
        language={language}
        theme={themes.github}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`code-block ${className}`} style={style}>
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line });
              return (
                <div
                  {...lineProps}
                  key={i}
                  className={`code-line ${lineProps.className ?? ""}`}
                >
                  <span className="code-ln" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="code-text">
                    {line.map((token, k) => (
                      <span key={k} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
