import { useEffect, useRef } from 'react';
import katex from 'katex';

// Renders a single LaTeX expression via KaTeX
export function KatexSpan({ tex, display = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(tex, ref.current, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: false,
        // chemistry support via mhchem macro emulation is handled via manual expansion
        macros: {
          '\\ce': '\\text{#1}', // basic fallback; real mhchem needs a KaTeX plugin
        },
      });
    } catch {
      ref.current.textContent = tex;
    }
  }, [tex, display]);

  return (
    <span
      ref={ref}
      className={`latex-span ${display ? 'latex-display' : 'latex-inline'} ${className}`}
    />
  );
}

// Parses text that may contain $...$ (inline) and $$...$$ (display) LaTeX,
// returning an array of segments: { type: 'text'|'inline'|'display', value: string }
export function parseLatexSegments(text) {
  const segments = [];
  // Match $$...$$ first (display), then $...$ (inline) — order matters
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('$$')) {
      segments.push({ type: 'display', value: raw.slice(2, -2).trim() });
    } else {
      segments.push({ type: 'inline', value: raw.slice(1, -1).trim() });
    }
    last = match.index + raw.length;
  }
  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }
  return segments;
}

// Renders text with embedded LaTeX.  Also passes plain-text segments through
// the renderText callback so callers can apply chemistry highlighting too.
export function LatexLine({ text, renderText }) {
  const segments = parseLatexSegments(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'inline') return <KatexSpan key={i} tex={seg.value} />;
        if (seg.type === 'display') return <KatexSpan key={i} tex={seg.value} display />;
        return renderText ? renderText(seg.value, i) : <span key={i}>{seg.value}</span>;
      })}
    </>
  );
}

// Quick utility: does this string contain any LaTeX markers?
export function hasLatex(text) {
  return /\$/.test(text);
}
