import { useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";

const LATEX_SNIPPETS = [
  { labelKey: "composer.fraction", value: "$\\frac{[A]}{[B]}$" },
  { label: "Delta H", value: "$$\\Delta H^\\circ = \\sum H_f(\\text{mahsulot}) - \\sum H_f(\\text{reagent})$$" },
  { label: "Keq", value: "$$K_{eq} = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$$" },
  { label: "pH", value: "$\\text{pH} = -\\log[H^+]$" },
  { label: "Delta G", value: "$$\\Delta G = \\Delta H - T\\Delta S$$" },
];

export default function AnswerEditorTools({ className = "", onChange, textareaRef, value }) {
  const { t } = useLanguage();
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
      <div className="chem-toolbar latex-toolbar" aria-label="LaTeX formulalari">
        <span>LaTeX</span>
        {LATEX_SNIPPETS.map((item) => (
          <button key={item.labelKey || item.label} onClick={() => insertSnippet(item.value)} type="button">
            {item.labelKey ? t(item.labelKey) : item.label}
          </button>
        ))}
      </div>

      <div className="chem-toolbar markdown-toolbar" aria-label={t('composer.formatting')}>
        <span>Markdown</span>
        <button aria-label={t('composer.bold')} onClick={() => wrapSelection("**", "**", "qalin matn")} title={t('composer.bold')} type="button">
          <strong>B</strong>
        </button>
        <button aria-label={t('composer.italic')} onClick={() => wrapSelection("*", "*", "kursiv matn")} title={t('composer.italic')} type="button">
          <em>I</em>
        </button>
        <button aria-label={t('composer.list')} onClick={() => insertSnippet("- Birinchi band\n- Ikkinchi band")} title={t('composer.list')} type="button">
          •
        </button>
        <button aria-label={t('composer.quote')} onClick={() => insertSnippet("> Iqtibos")} title={t('composer.quote')} type="button">
          "
        </button>
        <button aria-label={t('composer.code')} onClick={() => wrapSelection("`", "`", "kod")} title={t('composer.code')} type="button">
          &lt;/&gt;
        </button>
        <button aria-label={t('composer.link')} onClick={() => wrapSelection("[", "](https://)", "havola matni")} title={t('composer.link')} type="button">
          Link
        </button>
      </div>
    </div>
  );
}
