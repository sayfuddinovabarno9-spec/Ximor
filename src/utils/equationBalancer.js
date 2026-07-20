const ELEMENTS = new Set([
  'H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl',
  'Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As',
  'Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In',
  'Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb',
  'Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl',
  'Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu',
]);

const SUBSCRIPT = { 0:'₀', 1:'₁', 2:'₂', 3:'₃', 4:'₄', 5:'₅', 6:'₆', 7:'₇', 8:'₈', 9:'₉' };

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function frac(n, d = 1) {
  if (d === 0) throw new Error('Nolga bo‘lish mumkin emas');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
const div = (a, b) => frac(a.n * b.d, a.d * b.n);
const neg = a => frac(-a.n, a.d);
const isZero = a => a.n === 0;

function normalizeEquation(input) {
  return input
    .replaceAll('→', '->')
    .replaceAll('⇒', '->')
    .replaceAll('=', '->')
    .replace(/\s+/g, '')
    .trim();
}

function splitEquation(input) {
  const normalized = normalizeEquation(input);
  const sides = normalized.split('->');
  if (sides.length !== 2 || !sides[0] || !sides[1]) {
    throw new Error('Tenglamada bitta reaksiya o‘qi kerak: masalan, H2 + O2 -> H2O');
  }
  const parseSide = side => side.split('+').filter(Boolean);
  const reactants = parseSide(sides[0]);
  const products = parseSide(sides[1]);
  if (!reactants.length || !products.length) {
    throw new Error('Chap va o‘ng tomonda kamida bittadan modda bo‘lishi kerak.');
  }
  return { reactants, products };
}

export function parseChemicalFormula(formula) {
  const clean = formula.replace(/^\d+/, '').replace(/\((aq|s|l|g)\)$/i, '');
  let i = 0;

  function parseGroup(stopChar) {
    const counts = {};
    while (i < clean.length) {
      const char = clean[i];
      if (stopChar && char === stopChar) {
        i += 1;
        return counts;
      }
      if (char === '(' || char === '[') {
        i += 1;
        const group = parseGroup(char === '(' ? ')' : ']');
        const mult = readNumber();
        for (const [el, count] of Object.entries(group)) {
          counts[el] = (counts[el] || 0) + count * mult;
        }
        continue;
      }
      if (char === ')' || char === ']') {
        throw new Error(`${formula}: qavslar mos emas.`);
      }
      if (!/[A-Z]/.test(char)) {
        throw new Error(`${formula}: "${char}" belgisi kutilmagan.`);
      }
      let symbol = char;
      i += 1;
      if (/[a-z]/.test(clean[i] || '')) {
        symbol += clean[i];
        i += 1;
      }
      if (!ELEMENTS.has(symbol)) {
        throw new Error(`${formula}: "${symbol}" elementi topilmadi.`);
      }
      counts[symbol] = (counts[symbol] || 0) + readNumber();
    }
    if (stopChar) throw new Error(`${formula}: qavs yopilmagan.`);
    return counts;
  }

  function readNumber() {
    let raw = '';
    while (/[0-9]/.test(clean[i] || '')) {
      raw += clean[i];
      i += 1;
    }
    return raw ? Number(raw) : 1;
  }

  if (!clean) throw new Error('Bo‘sh formula kiritildi.');
  return parseGroup(null);
}

function buildMatrix(reactants, products, formulas) {
  const elements = [...new Set(formulas.flatMap(f => Object.keys(f.counts)))].sort();
  const matrix = elements.map(element =>
    formulas.map((formula, idx) => {
      const sign = idx < reactants.length ? 1 : -1;
      return frac(sign * (formula.counts[element] || 0));
    })
  );

  const missing = elements.filter(element => {
    const left = reactants.some((_, idx) => formulas[idx].counts[element]);
    const right = products.some((_, idx) => formulas[reactants.length + idx].counts[element]);
    return !left || !right;
  });
  if (missing.length) {
    throw new Error(`${missing.join(', ')} faqat bir tomonda bor. Bu tenglama tenglashmaydi.`);
  }

  return { elements, matrix };
}

function solveCoefficients(matrix, compoundCount) {
  const pivotVars = [];
  const rows = matrix.map(row => row.map(cell => frac(cell.n, cell.d)));
  let r = 0;

  for (let c = 0; c < compoundCount && r < rows.length; c += 1) {
    let pivot = -1;
    for (let i = r; i < rows.length; i += 1) {
      if (!isZero(rows[i][c])) { pivot = i; break; }
    }
    if (pivot === -1) continue;
    [rows[r], rows[pivot]] = [rows[pivot], rows[r]];
    const pv = rows[r][c];
    rows[r] = rows[r].map(cell => div(cell, pv));
    for (let i = 0; i < rows.length; i += 1) {
      if (i === r || isZero(rows[i][c])) continue;
      const factor = rows[i][c];
      rows[i] = rows[i].map((cell, j) => sub(cell, mul(factor, rows[r][j])));
    }
    pivotVars.push(c);
    r += 1;
  }

  const freeVars = [];
  for (let c = 0; c < compoundCount; c += 1) {
    if (!pivotVars.includes(c)) freeVars.push(c);
  }
  if (!freeVars.length) throw new Error('Bu tenglama uchun erkin koeffitsiyent topilmadi.');

  const solution = Array(compoundCount).fill(null).map(() => frac(0));
  solution[freeVars[freeVars.length - 1]] = frac(1);
  for (let row = pivotVars.length - 1; row >= 0; row -= 1) {
    const pivot = pivotVars[row];
    let value = frac(0);
    for (const free of freeVars) {
      value = add(value, mul(rows[row][free], solution[free]));
    }
    solution[pivot] = neg(value);
  }

  const denom = solution.reduce((acc, item) => lcm(acc, item.d), 1);
  let ints = solution.map(item => item.n * (denom / item.d));
  if (ints.every(n => n <= 0)) ints = ints.map(n => -n);
  if (ints.some(n => n <= 0)) throw new Error('Musbat koeffitsiyentlar topilmadi.');
  const divisor = ints.reduce((acc, n) => gcd(acc, n), Math.abs(ints[0]));
  return ints.map(n => n / divisor);
}

export function formatChemicalFormula(token) {
  return token.replace(/[0-9]/g, digit => SUBSCRIPT[digit] || digit);
}

function formatEquation(reactants, products, coefficients) {
  const parts = [...reactants, ...products];
  const render = (token, idx) => `${coefficients[idx] === 1 ? '' : coefficients[idx]}${formatChemicalFormula(token)}`;
  return `${reactants.map((token, idx) => render(token, idx)).join(' + ')} → ${products.map((token, idx) => render(token, reactants.length + idx)).join(' + ')}`;
}

function countElements(side, formulas, coefficients, offset = 0) {
  const totals = {};
  side.forEach((_, idx) => {
    const formula = formulas[offset + idx];
    const coeff = coefficients[offset + idx];
    for (const [element, count] of Object.entries(formula.counts)) {
      totals[element] = (totals[element] || 0) + count * coeff;
    }
  });
  return totals;
}

function guessReactionType(reactants, products) {
  const hasO2 = reactants.some(item => item === 'O2');
  const hasCO2 = products.some(item => item === 'CO2');
  const hasH2O = products.some(item => item === 'H2O');
  if (hasO2 && hasCO2 && hasH2O) return 'Yonish reaksiyasi';
  if (reactants.length > 1 && products.length === 1) return 'Birikish reaksiyasi';
  if (reactants.length === 1 && products.length > 1) return 'Parchalanish reaksiyasi';
  if (reactants.some(item => item.includes('OH')) && products.includes('H2O')) return 'Kislota-asos neytrallanishi';
  if (reactants.length === 2 && products.length === 2) return 'Almashinish reaksiyasi';
  return 'Turi aniqlanmagan';
}

function buildExplanation(type, elements) {
  if (type === 'Yonish reaksiyasi') {
    return 'Kislorod ishtirokida yonish sodir bo‘ladi. Koeffitsiyentlar C, H va O atomlari sonini tenglashtirish uchun tanlandi.';
  }
  if (type === 'Birikish reaksiyasi') {
    return 'Bir nechta reagent bitta asosiy mahsulot hosil qilmoqda, shuning uchun atomlar chapdan o‘ngga bosqichma-bosqich tenglashtirildi.';
  }
  if (type === 'Parchalanish reaksiyasi') {
    return 'Bitta modda bir nechta mahsulotga ajralmoqda. Har bir element bo‘yicha umumiy atomlar soni saqlanadi.';
  }
  if (type === 'Kislota-asos neytrallanishi') {
    return 'OH guruhi va vodorod suv hosil qiladi. Tuz va suv miqdori atomlar balansi orqali tekshirildi.';
  }
  return `${elements.join(', ')} elementlari bo‘yicha atomlar soni chap va o‘ng tomonda tenglashtirildi.`;
}

export function balanceEquation(input) {
  const { reactants, products } = splitEquation(input);
  const formulas = [...reactants, ...products].map(token => ({ token, counts: parseChemicalFormula(token) }));
  const { elements, matrix } = buildMatrix(reactants, products, formulas);
  const coefficients = solveCoefficients(matrix, formulas.length);
  const leftTotals = countElements(reactants, formulas, coefficients);
  const rightTotals = countElements(products, formulas, coefficients, reactants.length);
  const type = guessReactionType(reactants, products);
  const table = elements.map(element => ({
    element,
    left: leftTotals[element] || 0,
    right: rightTotals[element] || 0,
    balanced: (leftTotals[element] || 0) === (rightTotals[element] || 0),
  }));

  return {
    input,
    reactants,
    products,
    coefficients,
    balanced: formatEquation(reactants, products, coefficients),
    table,
    type,
    explanation: buildExplanation(type, elements),
  };
}
