import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import RichText from "./RichText";

const LATEX_SNIPPETS = [
  { labelKey: "composer.fraction", value: "$\\frac{[[cursor]]}{ }$" },
  { label: "sqrt", value: "$\\sqrt{[[cursor]]}$" },
  { label: "Delta H", value: "$$\\Delta H^\\circ = \\sum H_f(\\text{mahsulot}) - \\sum H_f(\\text{reagent})$$" },
  { label: "Keq", value: "$$K_{eq} = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$$" },
  { label: "pH", value: "$\\text{pH} = -\\log[H^+]$" },
];

const LATEX_GROUPS = [
  {
    id: "structures",
    label: "Structures",
    items: [
      { label: "Inline", before: "$", after: "$", fallback: "x" },
      { label: "Display", before: "$$\n", after: "\n$$", fallback: "E = mc^2" },
      { label: "Fraction", value: "$\\frac{[[cursor]]}{ }$" },
      { label: "Power", value: "$x^{[[cursor]]}$" },
      { label: "Index", value: "$x_{[[cursor]]}$" },
      { label: "Root", value: "$\\sqrt{[[cursor]]}$" },
      { label: "n-root", value: "$\\sqrt[n]{[[cursor]]}$" },
      { label: "Vector", value: "$\\vec{[[cursor]]}$" },
      { label: "Overline", value: "$\\overline{[[cursor]]}$" },
      { label: "Text", value: "$\\text{[[cursor]]}$" },
    ],
  },
  {
    id: "greek",
    label: "Greek",
    items: [
      { label: "alpha", value: "$\\alpha$" },
      { label: "beta", value: "$\\beta$" },
      { label: "gamma", value: "$\\gamma$" },
      { label: "Delta", value: "$\\Delta$" },
      { label: "theta", value: "$\\theta$" },
      { label: "lambda", value: "$\\lambda$" },
      { label: "mu", value: "$\\mu$" },
      { label: "pi", value: "$\\pi$" },
      { label: "sigma", value: "$\\sigma$" },
      { label: "Sigma", value: "$\\sum_{i=1}^{n} [[cursor]]$" },
      { label: "Omega", value: "$\\Omega$" },
      { label: "degree", value: "$^\\circ$" },
    ],
  },
  {
    id: "chemistry",
    label: "Chemistry",
    items: [
      { label: "Reaction", value: "$$[[cursor]] \\rightarrow $$" },
      { label: "Equilibrium", value: "$$[[cursor]] \\rightleftharpoons $$" },
      { label: "State aq", value: "$\\text{(aq)}$" },
      { label: "State s", value: "$\\text{(s)}$" },
      { label: "State g", value: "$\\text{(g)}$" },
      { label: "State l", value: "$\\text{(l)}$" },
      { label: "Precipitate", value: "$\\downarrow$" },
      { label: "Gas", value: "$\\uparrow$" },
      { label: "Electron", value: "$e^{-}$" },
      { label: "Ion", value: "$\\mathrm{Na}^{+}$" },
      { label: "Hydronium", value: "$\\mathrm{H_3O}^{+}$" },
      { label: "Water", value: "$\\mathrm{H_2O}$" },
    ],
  },
  {
    id: "thermo",
    label: "Thermo",
    items: [
      { label: "Delta H", value: "$$\\Delta H^\\circ = \\sum H_f^\\circ(\\text{mahsulot}) - \\sum H_f^\\circ(\\text{reagent})$$" },
      { label: "Delta G", value: "$$\\Delta G = \\Delta H - T\\Delta S$$" },
      { label: "G standard", value: "$$\\Delta G^\\circ = -RT\\ln K$$" },
      { label: "Entropy", value: "$$\\Delta S = \\frac{q_{rev}}{T}$$" },
      { label: "Heat", value: "$$q = mc\\Delta T$$" },
      { label: "Hess", value: "$$\\Delta H_{rxn} = \\sum \\Delta H_{steps}$$" },
      { label: "Arrhenius", value: "$$k = Ae^{-E_a/RT}$$" },
      { label: "Clausius", value: "$$\\ln\\frac{k_2}{k_1}= -\\frac{E_a}{R}\\left(\\frac{1}{T_2}-\\frac{1}{T_1}\\right)$$" },
    ],
  },
  {
    id: "equilibrium",
    label: "Equilibrium",
    items: [
      { label: "Keq", value: "$$K_{eq} = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$$" },
      { label: "Ksp", value: "$$K_{sp} = [M^{n+}]^a[X^{m-}]^b$$" },
      { label: "Q", value: "$$Q = \\frac{[\\text{products}]}{[\\text{reactants}]}$$" },
      { label: "pH", value: "$\\text{pH} = -\\log[H^+]$" },
      { label: "pOH", value: "$\\text{pOH} = -\\log[OH^-]$" },
      { label: "Buffer", value: "$$\\text{pH}=\\text{p}K_a + \\log\\frac{[A^-]}{[HA]}$$" },
      { label: "Ka", value: "$$K_a = \\frac{[H^+][A^-]}{[HA]}$$" },
      { label: "Kb", value: "$$K_b = \\frac{[BH^+][OH^-]}{[B]}$$" },
    ],
  },
  {
    id: "math",
    label: "Math",
    items: [
      { label: "Integral", value: "$\\int_{a}^{b} [[cursor]]\\,dx$" },
      { label: "Limit", value: "$\\lim_{x\\to 0} [[cursor]]$" },
      { label: "Derivative", value: "$\\frac{d}{dx}[[cursor]]$" },
      { label: "Partial", value: "$\\frac{\\partial [[cursor]]}{\\partial x}$" },
      { label: "Approx", value: "$\\approx$" },
      { label: "Not equal", value: "$\\ne$" },
      { label: "Less equal", value: "$\\le$" },
      { label: "Greater equal", value: "$\\ge$" },
      { label: "Infinity", value: "$\\infty$" },
      { label: "Matrix", value: "$$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$" },
      { label: "Cases", value: "$$\\begin{cases} [[cursor]], & x > 0 \\\\ 0, & x = 0 \\end{cases}$$" },
      { label: "Aligned", value: "$$\\begin{aligned} [[cursor]] &= \\\\ &= \\end{aligned}$$" },
    ],
  },
  {
    id: "units",
    label: "Units",
    items: [
      { label: "mol", value: "$\\mathrm{mol}$" },
      { label: "M", value: "$\\mathrm{mol\\,L^{-1}}$" },
      { label: "g/mol", value: "$\\mathrm{g\\,mol^{-1}}$" },
      { label: "kJ/mol", value: "$\\mathrm{kJ\\,mol^{-1}}$" },
      { label: "atm", value: "$\\mathrm{atm}$" },
      { label: "Kelvin", value: "$\\mathrm{K}$" },
      { label: "Celsius", value: "$^\\circ\\mathrm{C}$" },
      { label: "Faraday", value: "$F = 96485\\ \\mathrm{C\\,mol^{-1}}$" },
    ],
  },
];

function isEscaped(value, index) {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && value[i] === "\\"; i -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function getMathModeAt(value, position) {
  let mode = null;

  for (let i = 0; i < position; i += 1) {
    if (value[i] !== "$" || isEscaped(value, i)) continue;

    const delimiter = value[i + 1] === "$" && !isEscaped(value, i + 1) ? "$$" : "$";
    if (delimiter === "$$") i += 1;

    if (mode === delimiter) {
      mode = null;
    } else if (!mode) {
      mode = delimiter;
    }
  }

  return mode;
}

function stripOuterMathDelimiters(snippet) {
  const value = String(snippet || "");
  if (value.startsWith("$$") && value.endsWith("$$")) return value.slice(2, -2).trim();
  if (value.startsWith("$") && value.endsWith("$")) return value.slice(1, -1);
  return value;
}

export default function AnswerEditorTools({
  className = "",
  defaultKeyboardOpen = false,
  onChange,
  onKeyboardOpen,
  textareaRef,
  value,
}) {
  const { t } = useLanguage();
  const [keyboardOpen, setKeyboardOpen] = useState(defaultKeyboardOpen);
  const [activeGroupId, setActiveGroupId] = useState(LATEX_GROUPS[0].id);
  const activeGroup = useMemo(
    () => LATEX_GROUPS.find((group) => group.id === activeGroupId) || LATEX_GROUPS[0],
    [activeGroupId]
  );

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
    const cursorToken = "[[cursor]]";
    let rawSnippet = String(snippet || "");
    const textarea = textareaRef.current;
    const currentValue = textarea?.value ?? value ?? "";
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const insideMath = Boolean(getMathModeAt(currentValue, start) && getMathModeAt(currentValue, end));
    if (insideMath) rawSnippet = stripOuterMathDelimiters(rawSnippet);

    const selectedText = currentValue.slice(start, end);
    const cursorIndex = rawSnippet.indexOf(cursorToken);
    const cleanSnippet = rawSnippet.replace(cursorToken, selectedText);
    const needsLeadingSpace = !insideMath && start > 0 && !/\s/.test(currentValue[start - 1]);
    const needsTrailingSpace = !insideMath && end < currentValue.length && !/\s/.test(currentValue[end]);
    const insertion = `${needsLeadingSpace ? " " : ""}${cleanSnippet}${needsTrailingSpace ? " " : ""}`;
    const nextValue = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`;
    const selectionStart = cursorIndex >= 0
      ? start + (needsLeadingSpace ? 1 : 0) + cursorIndex
      : start + insertion.length;
    const selectionEnd = cursorIndex >= 0
      ? selectionStart + selectedText.length
      : selectionStart;

    replaceSelection(nextValue, selectionStart, selectionEnd);
  }, [replaceSelection, textareaRef, value]);

  const wrapSelection = useCallback((before, after, fallback) => {
    const textarea = textareaRef.current;
    const currentValue = textarea?.value ?? value ?? "";
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const selectedText = currentValue.slice(start, end) || fallback;
    const insertion = `${before}${selectedText}${after}`;
    const nextValue = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`;
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selectedText.length;

    replaceSelection(nextValue, selectionStart, selectionEnd);
  }, [replaceSelection, textareaRef, value]);

  const insertMathItem = useCallback((item) => {
    if (item.before || item.after) {
      wrapSelection(item.before || "", item.after || "", item.fallback || "x");
      return;
    }
    insertSnippet(item.value);
  }, [insertSnippet, wrapSelection]);

  const handleKeyboardToggle = useCallback(() => {
    if (onKeyboardOpen) {
      onKeyboardOpen();
      return;
    }
    setKeyboardOpen((open) => !open);
  }, [onKeyboardOpen]);

  return (
    <div className={`answer-editor-tools ${className}`.trim()}>
      <div className="chem-toolbar latex-toolbar" aria-label="LaTeX formulalari">
        <span>LaTeX</span>
        {LATEX_SNIPPETS.map((item) => (
          <button key={item.labelKey || item.label} onClick={() => insertSnippet(item.value)} type="button">
            {item.labelKey ? t(item.labelKey) : item.label}
          </button>
        ))}
        <button
          aria-expanded={keyboardOpen}
          aria-haspopup={onKeyboardOpen ? "dialog" : undefined}
          className="latex-keyboard-toggle"
          onClick={handleKeyboardToggle}
          type="button"
        >
          <span aria-hidden="true">⌨</span>
          {t('composer.mathKeyboard')}
        </button>
      </div>

      {keyboardOpen && (
        <div className="latex-keyboard-panel">
          <section className="latex-keyboard-picker" aria-label={t('composer.mathKeyboard')}>
            <div className="latex-keyboard-head">
              <div>
                <span>{t('composer.formulaGroup')}</span>
                <strong>{activeGroup.label}</strong>
              </div>
              <select
                aria-label={t('composer.formulaGroup')}
                onChange={(event) => setActiveGroupId(event.target.value)}
                value={activeGroupId}
              >
                {LATEX_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>{group.label}</option>
                ))}
              </select>
            </div>

            <div className="latex-group-tabs" role="tablist" aria-label={t('composer.formulaGroup')}>
              {LATEX_GROUPS.map((group) => (
                <button
                  aria-selected={group.id === activeGroupId}
                  className={group.id === activeGroupId ? "is-active" : ""}
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  role="tab"
                  type="button"
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="latex-symbol-grid">
              {activeGroup.items.map((item) => (
                <button key={`${activeGroup.id}-${item.label}`} onClick={() => insertMathItem(item)} type="button">
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="latex-keyboard-preview" aria-label={t('composer.previewLabel')}>
            <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
            <RichText text={value || t('composer.emptyPreview')} />
          </section>
        </div>
      )}
    </div>
  );
}
