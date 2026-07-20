import {
  formatChemicalFormula,
  parseChemicalFormula,
} from './equationBalancer';

export const AVOGADRO = 6.02214076e23;

const ATOMIC_MASSES = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305,
  Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948,
  K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798,
  Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95,
  Tc: 98, Ru: 101.07, Rh: 102.906, Pd: 106.42, Ag: 107.868, Cd: 112.414,
  In: 114.818, Sn: 118.71, Sb: 121.76, Te: 127.6, I: 126.904, Xe: 131.293,
  Cs: 132.905, Ba: 137.327, La: 138.905, Ce: 140.116, Pr: 140.908,
  Nd: 144.242, Pm: 145, Sm: 150.36, Eu: 151.964, Gd: 157.25, Tb: 158.925,
  Dy: 162.5, Ho: 164.93, Er: 167.259, Tm: 168.934, Yb: 173.045, Lu: 174.967,
  Hf: 178.49, Ta: 180.948, W: 183.84, Re: 186.207, Os: 190.23, Ir: 192.217,
  Pt: 195.084, Au: 196.967, Hg: 200.592, Tl: 204.38, Pb: 207.2, Bi: 208.98,
  Po: 209, At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227, Th: 232.038,
  Pa: 231.036, U: 238.029, Np: 237, Pu: 244,
};

const SUPERSCRIPT = {
  '-': '⁻',
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
};

function numericAmount(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} noldan katta son bo‘lishi kerak.`);
  }
  return number;
}

export function calculateMolarMass(formula) {
  const counts = parseChemicalFormula(formula);
  const composition = Object.entries(counts).map(([element, count]) => {
    const atomicMass = ATOMIC_MASSES[element];
    if (!atomicMass) {
      throw new Error(`${element} uchun atom massasi topilmadi.`);
    }
    return {
      element,
      count,
      atomicMass,
      subtotal: atomicMass * count,
    };
  });
  const molarMass = composition.reduce((sum, row) => sum + row.subtotal, 0);

  return {
    formula,
    formatted: formatChemicalFormula(formula.replace(/^\d+/, '')),
    molarMass,
    totalAtoms: composition.reduce((sum, row) => sum + row.count, 0),
    composition: composition.map(row => ({
      ...row,
      percent: (row.subtotal / molarMass) * 100,
    })),
  };
}

export function convertSubstanceAmount(formula, amount, unit = 'g') {
  const value = numericAmount(amount, 'Miqdor');
  const mass = calculateMolarMass(formula);
  const moles = unit === 'mol' ? value : value / mass.molarMass;
  const grams = unit === 'g' ? value : value * mass.molarMass;

  return {
    ...mass,
    grams,
    moles,
    particles: moles * AVOGADRO,
  };
}

export function calculateStoichiometry({
  equation,
  sourceIndex,
  targetIndex,
  amount,
  unit = 'g',
}) {
  if (!equation?.coefficients?.length) {
    throw new Error('Avval tenglamani kiriting va tenglashtiring.');
  }

  const compounds = [...equation.reactants, ...equation.products];
  const sourceFormula = compounds[sourceIndex];
  const targetFormula = compounds[targetIndex];
  if (!sourceFormula || !targetFormula) {
    throw new Error('Boshlang‘ich va topiladigan moddani tanlang.');
  }

  const value = numericAmount(amount, 'Boshlang‘ich miqdor');
  const source = calculateMolarMass(sourceFormula);
  const target = calculateMolarMass(targetFormula);
  const sourceCoefficient = equation.coefficients[sourceIndex];
  const targetCoefficient = equation.coefficients[targetIndex];
  const sourceMoles = unit === 'mol' ? value : value / source.molarMass;
  const targetMoles = sourceMoles * (targetCoefficient / sourceCoefficient);

  return {
    source,
    target,
    sourceCoefficient,
    targetCoefficient,
    sourceMoles,
    targetMoles,
    targetGrams: targetMoles * target.molarMass,
    targetParticles: targetMoles * AVOGADRO,
    ratio: targetCoefficient / sourceCoefficient,
  };
}

export function formatScientific(value, digits = 3) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-3) {
    const [coefficient, exponent] = value.toExponential(digits).split('e');
    const power = String(Number(exponent))
      .split('')
      .map(character => SUPERSCRIPT[character] || character)
      .join('');
    return `${Number(coefficient)} × 10${power}`;
  }
  return Number(value.toFixed(digits)).toLocaleString('uz-UZ');
}
