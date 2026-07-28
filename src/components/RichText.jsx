import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const ELEMENT_SYMBOLS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl",
  "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As",
  "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In",
  "Sn", "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb",
  "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl",
  "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu",
]);

const SUBSCRIPT = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
const SUPERSCRIPT = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" };

function toSubscript(value) {
  return value.replace(/[0-9]/g, (digit) => SUBSCRIPT[digit]);
}

function toSuperscript(value) {
  return value.replace(/[0-9+-]/g, (char) => SUPERSCRIPT[char] || char);
}

function parseChemicalFormula(rawToken) {
  const stateMatch = rawToken.match(/(\((?:aq|s|l|g)\))$/i);
  const state = stateMatch?.[1];
  const token = (state ? rawToken.slice(0, -state.length) : rawToken).replace(/[•.]/g, "·");
  if (!token) return null;

  const pieces = [];
  let elementCount = 0;
  let index = 0;
  let afterHydrateDot = false;

  while (index < token.length) {
    const char = token[index];

    if (char === "·") {
      pieces.push({ text: "·", type: "dot" });
      afterHydrateDot = true;
      index += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      let number = "";
      while (/[0-9]/.test(token[index])) {
        number += token[index];
        index += 1;
      }

      if ((token[index] === "+" || token[index] === "-") && index === token.length - 1) {
        pieces.push({ text: toSuperscript(`${number}${token[index]}`), type: "sup" });
        index += 1;
      } else if (afterHydrateDot || (pieces.length === 0 && /[A-Z([]/.test(token[index] || ""))) {
        pieces.push({ text: number, type: "coeff" });
      } else {
        pieces.push({ text: toSubscript(number), type: "sub" });
      }
      afterHydrateDot = false;
      continue;
    }

    if (char === "^") {
      index += 1;
      let charge = "";
      while (/[0-9+-]/.test(token[index])) {
        charge += token[index];
        index += 1;
      }
      if (!charge) return null;
      pieces.push({ text: toSuperscript(charge), type: "sup" });
      afterHydrateDot = false;
      continue;
    }

    if ((char === "+" || char === "-") && index === token.length - 1) {
      pieces.push({ text: toSuperscript(char), type: "sup" });
      index += 1;
      afterHydrateDot = false;
      continue;
    }

    if ("()[]".includes(char)) {
      pieces.push({ text: char, type: "plain" });
      index += 1;
      afterHydrateDot = false;
      continue;
    }

    if (/[A-Z]/.test(char)) {
      let symbol = char;
      if (/[a-z]/.test(token[index + 1] || "")) symbol += token[index + 1];
      if (!ELEMENT_SYMBOLS.has(symbol)) return null;
      pieces.push({ text: symbol, type: "element" });
      elementCount += 1;
      index += symbol.length;
      afterHydrateDot = false;
      continue;
    }

    return null;
  }

  const hasChemMarker = /[0-9()[\]^+\-·]/.test(token) || elementCount > 1;
  if (!elementCount || !hasChemMarker) return null;
  if (state) pieces.push({ text: state.toLowerCase(), type: "state" });
  return pieces;
}

function renderChemistryToken(part, key) {
  const arrowMap = {
    "->": "→", "=>": "→", "<-": "←", "<->": "⇌", "=": "→",
    "⇌": "⇌", "→": "→", "←": "←",
  };

  if (arrowMap[part]) {
    return <span className="chem-arrow" key={key}>{arrowMap[part]}</span>;
  }
  if (part === "+") {
    return <span className="chem-plus" key={key}>+</span>;
  }
  if (/^\((aq|s|l|g)\)$/i.test(part)) {
    return <span className="chem-state" key={key}>{part.toLowerCase()}</span>;
  }

  const formula = parseChemicalFormula(part);
  if (!formula) return <span key={key}>{part}</span>;

  return (
    <span className="chem-formula" key={key}>
      {formula.map((piece, index) => (
        <span className={`chem-part chem-part--${piece.type}`} key={`${piece.text}-${index}`}>
          {piece.text}
        </span>
      ))}
    </span>
  );
}

function renderChemistryText(text, keyPrefix) {
  return text
    .split(/(<->|->|=>|<-|=|⇌|→|←|\+|\((?:aq|s|l|g)\)|\d*[A-Z][A-Za-z0-9()[\]^·.-]*(?:[0-9]*[+\-](?![0-9A-Z]))?)/g)
    .map((part, index) => (part ? renderChemistryToken(part, `${keyPrefix}-${index}`) : null));
}

function renderChildren(children, keyPrefix) {
  return Children.map(children, (child, index) => (
    typeof child === "string"
      ? renderChemistryText(child, `${keyPrefix}-${index}`)
      : child
  ));
}

function childrenText(children) {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (isValidElement(child)) return childrenText(child.props.children);
    return "";
  }).join("");
}

function isChemistryText(text) {
  if (/(->|=>|<->|=|⇌|→|←)/.test(text)) return true;
  const candidates = text.match(/\d*[A-Z][A-Za-z0-9()[\]^·.-]*/g) || [];
  return candidates.some((candidate) => parseChemicalFormula(candidate));
}

function getInternalQuestionHref(href) {
  if (!href) return "";
  if (/^\/q\/\d+(?:[#?].*)?$/.test(href)) return href;
  if (typeof window === "undefined") return "";

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || !/^\/q\/\d+$/.test(url.pathname)) return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

const markdownComponents = {
  p: ({ children }) => (
    <p className={isChemistryText(childrenText(children)) ? "chem-line" : ""}>
      {renderChildren(children, "p")}
    </p>
  ),
  li: ({ children }) => <li>{renderChildren(children, "li")}</li>,
  strong: ({ children }) => <strong>{renderChildren(children, "strong")}</strong>,
  em: ({ children }) => <em>{renderChildren(children, "em")}</em>,
  a: ({ children, href }) => {
    const internalHref = getInternalQuestionHref(href);
    return (
      <a
        href={internalHref || href}
        rel={internalHref ? undefined : "noreferrer"}
        target={internalHref ? undefined : "_blank"}
      >
        {renderChildren(children, "link")}
      </a>
    );
  },
  code: ({ children, className }) => <code className={className}>{children}</code>,
  img: ({ alt, src }) => <img alt={alt || ""} loading="lazy" src={src} />,
  td: ({ children }) => <td>{renderChildren(children, "td")}</td>,
  th: ({ children }) => <th>{renderChildren(children, "th")}</th>,
};

export default function RichText({ className = "", text }) {
  if (!text) return null;

  return (
    <div className={`rich-text markdown-body ${className}`}>
      <ReactMarkdown
        components={markdownComponents}
        rehypePlugins={[[rehypeKatex, {
          errorColor: "inherit",
          strict: false,
          throwOnError: false,
          trust: false,
        }]]}
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
