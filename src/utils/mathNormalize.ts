// Model kabhi \( \), \[ \] bhejta hai, kabhi backslash kho jaata hai, kabhi bina delimiter ke
// seedha \theta, \beta likh deta hai. Ye function sab ko KaTeX-samajhne-wale $...$ / $$...$$ me badalta hai.
export function normalizeMath(input: string): string {
  if (!input) return input;

  // Code (fenced + inline) ko bilkul mat chhedo. Private-use chars use kiye taaki
  // koi regex placeholder ko galti se math na samajh le.
  const codeBlocks: string[] = [];
  let out = input.replace(/```[\s\S]*?```|`[^`\n]*`/g, (code) => {
    const token = `\uE000${codeBlocks.length}\uE001`;
    codeBlocks.push(code);
    return token;
  });

  // Real math commands ki badi list (Greek + operators + functions + accents + fonts)
  const LATEX_CMDS = [
    // Greek
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'vartheta',
    'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma', 'varsigma',
    'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
    // structure / operators
    'frac', 'dfrac', 'tfrac', 'binom', 'sum', 'int', 'iint', 'oint', 'prod', 'lim', 'sqrt', 'infty',
    'cdot', 'cdots', 'ldots', 'dots', 'times', 'div', 'pm', 'mp', 'ast', 'star', 'circ', 'oplus', 'otimes',
    'leq', 'le', 'geq', 'ge', 'neq', 'ne', 'approx', 'sim', 'simeq', 'equiv', 'propto', 'mid', 'parallel', 'perp',
    'in', 'notin', 'subset', 'subseteq', 'supset', 'cup', 'cap', 'forall', 'exists', 'partial', 'nabla',
    'land', 'lor', 'neg', 'angle', 'ell', 'hbar', 'top',
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'leftrightarrow', 'Leftrightarrow', 'to', 'mapsto',
    // functions
    'log', 'ln', 'exp', 'sin', 'cos', 'tan', 'max', 'min', 'arg', 'argmax', 'argmin', 'sup', 'inf', 'det', 'dim',
    // accents / fonts
    'hat', 'bar', 'vec', 'tilde', 'dot', 'ddot', 'overline', 'underline',
    'text', 'mathbf', 'mathrm', 'mathcal', 'mathbb', 'boldsymbol',
    // delimiters / env
    'left', 'right', 'langle', 'rangle', 'lceil', 'rceil', 'lfloor', 'rfloor', 'begin', 'end', 'quad', 'qquad',
  ].join('|');

  // `\cmd` ke baad letter nahi aana chahiye (\int vs \infty, \in vs \inf jaisa confusion nahi hoga)
  const CMD = String.raw`\\(?:${LATEX_CMDS})(?![A-Za-z])`;

  // 1) Properly-escaped delimiters — sabse pehle, sabse bharosemand.
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => `$${body.trim()}$`);
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `$$${body.trim()}$$`);

  // 2) Backslash kho gaya ho to bare [ ... ] ko block-math maano (agar andar LaTeX command ho).
  out = out.replace(
    new RegExp(String.raw`(?<!!)\[([^\[\]]*?${CMD}[^\[\]]*?)\]`, 'g'),
    (_m, body) => `$$${body.trim()}$$`
  );

  // Mixed plain-LaTeX + dollar fragment wali poori equation line ko ek math me merge karo.
  out = out.split('\n').map((line) => {
    const prefixMatch = line.match(/^(\s*(?:(?:[-*+]|\d+[.)])\s+)?)(.*)$/);
    if (!prefixMatch) return line;
    const [, prefix, source] = prefixMatch;
    const trimmedSource = source.trim();

    const dollarCount = (trimmedSource.match(/\$/g) || []).length;
    if (dollarCount === 2 && /^\$[^$]+\$$/.test(trimmedSource)) {
      const repaired = trimmedSource.replace(/\\_/g, '_');
      return repaired === trimmedSource ? line : `${prefix}${repaired}`;
    }
    if (trimmedSource.includes('$$')) return line;

    const equation = trimmedSource.replace(/\$/g, '').trim();
    const isEquation = /^(?:\\?[A-Za-z]+)(?:\\?_?(?:\{[^}]+\}|[A-Za-z0-9]+)|\^\{[^}]+\})?\s*(?:=|≈|≃|≤|≥)\s*.+$/.test(equation);
    const hasMathSyntax = /\\[A-Za-z]+|\\_|[_^]/.test(equation);
    if (!isEquation || !hasMathSyntax || dollarCount === 0) return line;

    const body = equation.replace(/\\_/g, '_');
    return `${prefix}$${body}$`;
  }).join('\n');

  // 3) Bare (...) tab math maano jab andar LaTeX command ho aur function-call jaisa (P(x)) na ho.
  out = out.replace(
    new RegExp(String.raw`(?<![A-Za-z0-9_])\(([^()]*?${CMD}[^()]*?)\)`, 'g'),
    (_m, body) => `$${body.trim()}$`
  );

  // 4) NAYA: bina kisi delimiter ke bacha hua LaTeX (\theta, \beta_1, \frac{a}{b}, \alpha = \beta + 1)
  //    ko $...$ me wrap karo. Sirf un hisson par jo pehle se $...$ / $$...$$ ke bahar hain.
  const BRACE = String.raw`\{(?:[^{}\n]|\{(?:[^{}\n]|\{[^{}\n]*\})*\})*\}`;
  const SCRIPTS = String.raw`(?:[_^](?:${BRACE}|\\[A-Za-z]+|[A-Za-z0-9]))*`;
  const ATOM = String.raw`${CMD}(?:${BRACE})*${SCRIPTS}`;
  const LR = String.raw`\\(?:left|right)(?![A-Za-z])\s*(?:\\[{}|]|[()\[\]|.])`;
  const ATOM_ANY = String.raw`(?:${LR}|${ATOM})`;
  const VAR = String.raw`(?:\d+(?:\.\d+)?|[A-Za-z])${SCRIPTS}(?![A-Za-z])`;
  const OP = String.raw`[=+\-*/<>≤≥≈]`;
  const TERM = String.raw`(?:${ATOM_ANY}|${VAR})`;
  const RUN = new RegExp(
    String.raw`(?<![A-Za-z0-9\\$])(?:${VAR}\s*${OP}\s*)*${ATOM_ANY}(?:\s*${OP}\s*${TERM}|\s*${ATOM_ANY})*`,
    'g'
  );

  out = out
    .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/g)
    .map((seg, i) =>
      i % 2 === 1 ? seg : seg.replace(RUN, (m) => `$${m.trim().replace(/\\_/g, '_')}$`)
    )
    .join('');

  return out.replace(/\uE000(\d+)\uE001/g, (_t, index) => codeBlocks[Number(index)]);
}