import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { balanceEquation, formatChemicalFormula } from '../utils/equationBalancer';
import {
  calculateMolarMass,
  calculateStoichiometry,
  convertSubstanceAmount,
  formatScientific,
} from '../utils/chemistryCalculators';

const EQUATION_EXAMPLES = [
  'H2 + O2 -> H2O',
  'Fe + O2 -> Fe2O3',
  'C3H8 + O2 -> CO2 + H2O',
  'NaOH + HCl -> NaCl + H2O',
  'Ca(OH)2 + HCl -> CaCl2 + H2O',
];

const FORMULA_EXAMPLES = ['H2SO4', 'Ca(OH)2', 'C6H12O6', 'KMnO4', 'CuSO4'];

const TOOL_TABS = [
  { id: 'balance', label: 'Tenglashtirish', caption: 'Atomlar balansi', icon: 'balance' },
  { id: 'mass', label: 'Molyar massa', caption: 'Tarkib va konversiya', icon: 'molecule' },
  { id: 'stoich', label: 'Stoxiometriya', caption: 'Reagentdan mahsulotga', icon: 'flask' },
];

function ToolIcon({ name, size = 18 }) {
  const paths = {
    balance: 'M12 3v18M5 7h14M7 7l-4 8h8L7 7ZM17 7l-4 8h8l-4-8Z',
    table: 'M4 5h16M4 12h16M4 19h16M8 5v14M16 5v14',
    spark: 'M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z',
    copy: 'M8 8h11v11H8zM5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1',
    molecule: 'M9.5 4.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM9.5 19.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM8.7 6.2l6.1 4M8.7 17.8l6.1-4',
    flask: 'M9 3h6M10 3v6l-5.5 9.2A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.8L14 9V3M7.7 15h8.6',
    arrow: 'M5 12h14M13 6l6 6-6 6',
  };
  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={paths[name]} />
    </svg>
  );
}

function ResultEquation({ result }) {
  return (
    <div className="tool-result-equation">
      {result.balanced.split(/( → |\+ )/).map((part, index) => (
        <span
          className={part.trim() === '→' ? 'tool-arrow' : part.trim() === '+' ? 'tool-plus' : ''}
          key={`${part}-${index}`}
        >
          {part}
        </span>
      ))}
    </div>
  );
}

function ErrorPanel({ message }) {
  return (
    <div className="tool-error" role="alert">
      <strong>Hisoblab bo‘lmadi</strong>
      <span>{message}</span>
    </div>
  );
}

function UnitSwitch({ value, onChange }) {
  return (
    <div className="tool-unit-switch" aria-label="Miqdor birligi">
      {['g', 'mol'].map(unit => (
        <button
          className={value === unit ? 'is-active' : ''}
          key={unit}
          type="button"
          onClick={() => onChange(unit)}
        >
          {unit}
        </button>
      ))}
    </div>
  );
}

function BalanceTool({ equation, setEquation, resultState }) {
  const [copied, setCopied] = useState(false);
  const questionDraft = resultState.result
    ? [
        `Tenglama: ${equation}`,
        `Tenglashtirilgan: ${resultState.result.balanced}`,
        `Reaksiya turi: ${resultState.result.type}`,
        resultState.result.explanation,
      ].join('\n')
    : '';

  const copyDraft = async () => {
    if (!questionDraft) return;
    try {
      await navigator.clipboard.writeText(questionDraft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="tool-workspace">
      <div className="tool-card tool-card--input">
        <label className="tool-input-label" htmlFor="equation-input">
          Reaksiya tenglamasi
        </label>
        <div className="tool-input-row">
          <input
            id="equation-input"
            value={equation}
            onChange={event => setEquation(event.target.value)}
            placeholder="Masalan: Fe + O2 -> Fe2O3"
          />
        </div>
        <div className="tool-examples">
          {EQUATION_EXAMPLES.map(example => (
            <button key={example} type="button" onClick={() => setEquation(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {resultState.error ? (
        <ErrorPanel message={resultState.error} />
      ) : (
        <div className="tool-results">
          <div className="tool-card tool-balanced-card">
            <div className="tool-card-title">
              <ToolIcon name="balance" />
              <span>Tenglashtirilgan tenglama</span>
            </div>
            <ResultEquation result={resultState.result} />
            <div className="tool-meta-grid">
              <div>
                <span>Reagentlar</span>
                <strong>{resultState.result.reactants.length}</strong>
              </div>
              <div>
                <span>Mahsulotlar</span>
                <strong>{resultState.result.products.length}</strong>
              </div>
              <div>
                <span>Reaksiya turi</span>
                <strong>{resultState.result.type}</strong>
              </div>
            </div>
          </div>

          <div className="tool-card">
            <div className="tool-card-title">
              <ToolIcon name="table" />
              <span>Atomlar balansi</span>
            </div>
            <div className="tool-table">
              <div className="tool-table-row tool-table-head">
                <span>Element</span>
                <span>Chap</span>
                <span>O‘ng</span>
                <span>Holat</span>
              </div>
              {resultState.result.table.map(row => (
                <div className="tool-table-row" key={row.element}>
                  <strong>{row.element}</strong>
                  <span>{row.left}</span>
                  <span>{row.right}</span>
                  <span className={row.balanced ? 'tool-ok' : 'tool-bad'}>
                    {row.balanced ? 'Teng' : 'Xato'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="tool-card tool-explain-card">
            <div className="tool-card-title">
              <ToolIcon name="spark" />
              <span>Nima sodir bo‘ldi?</span>
            </div>
            <p>{resultState.result.explanation}</p>
            <button className="soft-button" type="button" onClick={copyDraft}>
              <ToolIcon name="copy" />
              {copied ? 'Nusxalandi' : 'Forum savoli sifatida nusxalash'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MolarMassTool() {
  const [formula, setFormula] = useState(FORMULA_EXAMPLES[2]);
  const [amount, setAmount] = useState('18');
  const [unit, setUnit] = useState('g');

  const massState = useMemo(() => {
    try {
      return { result: calculateMolarMass(formula), error: '' };
    } catch (error) {
      return { result: null, error: error.message };
    }
  }, [formula]);

  const conversionState = useMemo(() => {
    if (!massState.result) return null;
    try {
      return { result: convertSubstanceAmount(formula, amount, unit), error: '' };
    } catch (error) {
      return { result: null, error: error.message };
    }
  }, [amount, formula, massState.result, unit]);

  return (
    <div className="tool-workspace">
      <div className="tool-card tool-card--input">
        <label className="tool-input-label" htmlFor="formula-input">
          Modda formulasi
        </label>
        <div className="tool-input-row">
          <input
            id="formula-input"
            value={formula}
            onChange={event => setFormula(event.target.value)}
            placeholder="Masalan: Ca(OH)2"
          />
        </div>
        <div className="tool-examples">
          {FORMULA_EXAMPLES.map(example => (
            <button key={example} type="button" onClick={() => setFormula(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {massState.error ? (
        <ErrorPanel message={massState.error} />
      ) : (
        <div className="tool-results tool-results--mass">
          <div className="tool-card tool-mass-hero">
            <div className="tool-card-title">
              <ToolIcon name="molecule" />
              <span>Molyar massa</span>
            </div>
            <div className="tool-mass-value">
              <strong>{massState.result.molarMass.toFixed(3)}</strong>
              <span>g/mol</span>
            </div>
            <div className="tool-formula-preview">{massState.result.formatted}</div>
            <p>
              Bir molekulada jami <strong>{massState.result.totalAtoms}</strong> ta atom.
            </p>
          </div>

          <div className="tool-card tool-converter-card">
            <div className="tool-card-title">
              <ToolIcon name="arrow" />
              <span>Miqdorni aylantirish</span>
            </div>
            <div className="tool-amount-control">
              <input
                aria-label="Miqdor"
                min="0"
                step="any"
                type="number"
                value={amount}
                onChange={event => setAmount(event.target.value)}
              />
              <UnitSwitch value={unit} onChange={setUnit} />
            </div>
            {conversionState?.error ? (
              <span className="tool-inline-error">{conversionState.error}</span>
            ) : conversionState?.result ? (
              <div className="tool-conversion-grid">
                <div>
                  <span>Massa</span>
                  <strong>{formatScientific(conversionState.result.grams)} g</strong>
                </div>
                <div>
                  <span>Modda miqdori</span>
                  <strong>{formatScientific(conversionState.result.moles)} mol</strong>
                </div>
                <div>
                  <span>Zarrachalar</span>
                  <strong>{formatScientific(conversionState.result.particles)}</strong>
                </div>
              </div>
            ) : null}
          </div>

          <div className="tool-card tool-composition-card">
            <div className="tool-card-title">
              <ToolIcon name="table" />
              <span>Massa tarkibi</span>
            </div>
            <div className="tool-table tool-table--composition">
              <div className="tool-table-row tool-table-head">
                <span>Element</span>
                <span>Soni</span>
                <span>Atom massasi</span>
                <span>Ulushi</span>
              </div>
              {massState.result.composition.map(row => (
                <div className="tool-table-row" key={row.element}>
                  <strong>{row.element}</strong>
                  <span>{row.count}</span>
                  <span>{row.atomicMass}</span>
                  <span>{row.percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoichiometryTool({ equation, setEquation, resultState }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(2);
  const [amount, setAmount] = useState('10');
  const [unit, setUnit] = useState('g');

  useEffect(() => {
    if (!resultState.result) return;
    setSourceIndex(0);
    setTargetIndex(resultState.result.reactants.length);
  }, [resultState.result?.balanced]);

  const compounds = resultState.result
    ? [...resultState.result.reactants, ...resultState.result.products]
    : [];

  const stoichState = useMemo(() => {
    if (!resultState.result) return { result: null, error: '' };
    try {
      return {
        result: calculateStoichiometry({
          equation: resultState.result,
          sourceIndex,
          targetIndex,
          amount,
          unit,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: error.message };
    }
  }, [amount, resultState.result, sourceIndex, targetIndex, unit]);

  return (
    <div className="tool-workspace">
      <div className="tool-card tool-card--input">
        <label className="tool-input-label" htmlFor="stoich-equation-input">
          Tenglashtiriladigan reaksiya
        </label>
        <div className="tool-input-row">
          <input
            id="stoich-equation-input"
            value={equation}
            onChange={event => setEquation(event.target.value)}
            placeholder="Masalan: C3H8 + O2 -> CO2 + H2O"
          />
        </div>
        <div className="tool-examples">
          {EQUATION_EXAMPLES.map(example => (
            <button key={example} type="button" onClick={() => setEquation(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {resultState.error ? (
        <ErrorPanel message={resultState.error} />
      ) : (
        <>
          <div className="tool-card tool-stoich-equation">
            <span className="tool-input-label">Avtomatik balans</span>
            <ResultEquation result={resultState.result} />
          </div>

          <div className="tool-stoich-controls">
            <div className="tool-card">
              <label className="tool-input-label" htmlFor="source-compound">
                Berilgan modda
              </label>
              <select
                id="source-compound"
                value={sourceIndex}
                onChange={event => setSourceIndex(Number(event.target.value))}
              >
                {compounds.map((compound, index) => (
                  <option key={`${compound}-${index}`} value={index}>
                    {formatChemicalFormula(compound)}
                    {index < resultState.result.reactants.length ? ' — reagent' : ' — mahsulot'}
                  </option>
                ))}
              </select>
              <div className="tool-amount-control">
                <input
                  aria-label="Boshlang‘ich miqdor"
                  min="0"
                  step="any"
                  type="number"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                />
                <UnitSwitch value={unit} onChange={setUnit} />
              </div>
            </div>

            <div className="tool-flow-arrow" aria-hidden>
              <ToolIcon name="arrow" size={22} />
            </div>

            <div className="tool-card">
              <label className="tool-input-label" htmlFor="target-compound">
                Topiladigan modda
              </label>
              <select
                id="target-compound"
                value={targetIndex}
                onChange={event => setTargetIndex(Number(event.target.value))}
              >
                {compounds.map((compound, index) => (
                  <option key={`${compound}-${index}`} value={index}>
                    {formatChemicalFormula(compound)}
                    {index < resultState.result.reactants.length ? ' — reagent' : ' — mahsulot'}
                  </option>
                ))}
              </select>
              <p className="tool-control-note">100% reaksiya chiqishi qabul qilinadi.</p>
            </div>
          </div>

          {stoichState.error ? (
            <ErrorPanel message={stoichState.error} />
          ) : stoichState.result ? (
            <div className="tool-results tool-results--stoich">
              <div className="tool-card tool-stoich-answer">
                <span className="eyebrow">Nazariy natija</span>
                <div className="tool-answer-value">
                  <strong>{formatScientific(stoichState.result.targetGrams)}</strong>
                  <span>g {stoichState.result.target.formatted}</span>
                </div>
                <div className="tool-conversion-grid">
                  <div>
                    <span>Mahsulot miqdori</span>
                    <strong>{formatScientific(stoichState.result.targetMoles)} mol</strong>
                  </div>
                  <div>
                    <span>Zarrachalar</span>
                    <strong>{formatScientific(stoichState.result.targetParticles)}</strong>
                  </div>
                  <div>
                    <span>Koeffitsiyent nisbati</span>
                    <strong>
                      {stoichState.result.sourceCoefficient}:{stoichState.result.targetCoefficient}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="tool-card tool-steps-card">
                <div className="tool-card-title">
                  <ToolIcon name="spark" />
                  <span>Yechim bosqichlari</span>
                </div>
                <ol className="tool-steps">
                  <li>
                    <span>1</span>
                    <p>
                      {stoichState.result.source.formatted} miqdori:{' '}
                      <strong>{formatScientific(stoichState.result.sourceMoles)} mol</strong>
                    </p>
                  </li>
                  <li>
                    <span>2</span>
                    <p>
                      Tenglama nisbati bo‘yicha × <strong>{formatScientific(stoichState.result.ratio)}</strong>
                    </p>
                  </li>
                  <li>
                    <span>3</span>
                    <p>
                      {stoichState.result.target.formatted} molyar massasi:{' '}
                      <strong>{stoichState.result.target.molarMass.toFixed(3)} g/mol</strong>
                    </p>
                  </li>
                </ol>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function ToolsPage({ theme, onThemeToggle }) {
  const [activeTool, setActiveTool] = useState('balance');
  const [equation, setEquation] = useState(EQUATION_EXAMPLES[1]);

  const resultState = useMemo(() => {
    try {
      return { result: balanceEquation(equation), error: '' };
    } catch (error) {
      return { result: null, error: error.message };
    }
  }, [equation]);

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="tools-shell">
        <section className="tools-main">
          <div className="tools-head">
            <span className="eyebrow">Kimyo asboblari</span>
            <h1>Hisoblash markazi</h1>
            <p>
              Tenglamani balanslang, moddaning tarkibini hisoblang va reagentdan qancha
              mahsulot chiqishini bosqichma-bosqich toping.
            </p>
          </div>

          <div className="tool-tabs" role="tablist" aria-label="Kimyo hisoblash asboblari">
            {TOOL_TABS.map(tool => (
              <button
                aria-selected={activeTool === tool.id}
                className={activeTool === tool.id ? 'is-active' : ''}
                key={tool.id}
                role="tab"
                type="button"
                onClick={() => setActiveTool(tool.id)}
              >
                <ToolIcon name={tool.icon} size={20} />
                <span>
                  <strong>{tool.label}</strong>
                  <small>{tool.caption}</small>
                </span>
              </button>
            ))}
          </div>

          {activeTool === 'balance' && (
            <BalanceTool
              equation={equation}
              resultState={resultState}
              setEquation={setEquation}
            />
          )}
          {activeTool === 'mass' && <MolarMassTool />}
          {activeTool === 'stoich' && (
            <StoichiometryTool
              equation={equation}
              resultState={resultState}
              setEquation={setEquation}
            />
          )}
        </section>

        <aside className="tools-side">
          <div className="tool-card tools-status-card">
            <span className="eyebrow">3 ta asbob</span>
            <h3>Bitta kimyo ish maydoni</h3>
            <p>
              Tenglama koeffitsiyentlari stoxiometriya hisobiga to‘g‘ridan-to‘g‘ri
              uzatiladi. Natijalar brauzerning o‘zida hisoblanadi.
            </p>
            <ul className="tool-check-list">
              <li>Oddiy formula va qavslar</li>
              <li>94 ta element atom massasi</li>
              <li>Gram, mol va zarrachalar</li>
              <li>Yechim bosqichlari bilan javob</li>
            </ul>
          </div>

          <div className="tool-card tool-next-card">
            <span className="eyebrow">Hisoblash qoidasi</span>
            <h3>Natija nazariy qiymat</h3>
            <p>
              Stoxiometriya asbobi reagent tozaligi va reaksiya chiqishini 100% deb
              oladi. Laboratoriya natijasi bundan farq qilishi mumkin.
            </p>
          </div>
        </aside>
      </main>
    </Layout>
  );
}
