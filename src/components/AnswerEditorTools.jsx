import { useCallback } from "react";

const CHEMISTRY_SNIPPETS = [
  { label: "Formula", value: "H2SO4" },
  { label: "Reaksiya", value: "H2SO4 + CuO -> CuSO4 + H2O" },
  { label: "Qaytar", value: "N2 + 3H2 <-> 2NH3" },
  { label: "Zaryad", value: "SO4^2-" },
  { label: "Holat", value: "(aq)" },
  { label: "Cho'kma", value: "Ag+ + Cl- -> AgCl(s)" },
];

const LATEX_SNIPPETS = [
  { label: "Kasr", value: "$\\frac{[A]}{[B]}$" },
  { label: "Delta H", value: "$$\\Delta H^\\circ = \\sum H_f(\\text{mahsulot}) - \\sum H_f(\\text{reagent})$$" },
  { label: "Keq", value: "$$K_{eq} = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$$" },
  { label: "pH", value: "$\\text{pH} = -\\log[H^+]$" },
  { label: "Delta G", value: "$$\\Delta G = \\Delta H - T\\Delta S$$" },
];

export default function AnswerEditorTools({ className = "", onChange, textareaRef, value }) {
  const replaceSelection = useCallback((nextValue, selectionStart, selectionEnd) => {
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }, [onChange, textareaRef]);

  const insertSnippet = useCallback((snippet) => {
    const currentValue = value || "";
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const needsLeadingSpace = start > 0 && !/\s/.test(currentValue[start - 1]);
    const needsTrailingSpace = end < currentValue.length && !/\s/.test(currentValue[end]);
    const insertion = `${needsLeadingSpace ? " " : ""}${snippet}${needsTrailingSpace ? " " : ""}`;
    const nextValue = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`;
    const cursor = start + insertion.length;

    replaceSelection(nextValue, cursor, cursor);
  }, [replaceSelection, textareaRef, value]);

  const wrapSelection = useCallback((before, after, fallback) => {
    const currentValue = value || "";
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const selectedText = currentValue.slice(start, end) || fallback;
    const insertion = `${before}${selectedText}${after}`;
    const nextValue = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`;
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selectedText.length;

    replaceSelection(nextValue, selectionStart, selectionEnd);
  }, [replaceSelection, textareaRef, value]);

  return (
    <div className={`answer-editor-tools ${className}`.trim()}>
      <div className="chem-toolbar" aria-label="Kimyo formulalari asboblari">
        <span>Kimyo</span>
        {CHEMISTRY_SNIPPETS.map((item) => (
          <button key={item.label} onClick={() => insertSnippet(item.value)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      <div className="chem-toolbar latex-toolbar" aria-label="LaTeX formulalari">
        <span>LaTeX</span>
        {LATEX_SNIPPETS.map((item) => (
          <button key={item.label} onClick={() => insertSnippet(item.value)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      <div className="chem-toolbar markdown-toolbar" aria-label="Markdown formatlash">
        <span>Markdown</span>
        <button aria-label="Qalin" onClick={() => wrapSelection("**", "**", "qalin matn")} title="Qalin" type="button">
          <strong>B</strong>
        </button>
        <button aria-label="Kursiv" onClick={() => wrapSelection("*", "*", "kursiv matn")} title="Kursiv" type="button">
          <em>I</em>
        </button>
        <button aria-label="Ro'yxat" onClick={() => insertSnippet("- Birinchi band\n- Ikkinchi band")} title="Ro'yxat" type="button">
          •
        </button>
        <button aria-label="Iqtibos" onClick={() => insertSnippet("> Iqtibos")} title="Iqtibos" type="button">
          "
        </button>
        <button aria-label="Kod" onClick={() => wrapSelection("`", "`", "kod")} title="Kod" type="button">
          &lt;/&gt;
        </button>
        <button aria-label="Havola" onClick={() => wrapSelection("[", "](https://)", "havola matni")} title="Havola" type="button">
          Link
        </button>
      </div>
    </div>
  );
}
