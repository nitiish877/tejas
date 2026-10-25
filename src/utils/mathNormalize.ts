// Model kabhi \( \), \[ \] delimiters bhejta hai, kabhi beech me kahin backslash kho jaata hai
// aur bare ( ), [ ] reh jaate hain. Ye function sab ko KaTeX-samajhne-wale $...$ / $$...$$ me badalta hai.
export function normalizeMath(input: string): string {
  if (!input) return input;

  // Leave fenced and inline code untouched: a code sample may intentionally show
  // dollar signs or LaTeX commands as literal text.
  const codeBlocks: string[] = [];
  let out = input.replace(/```[\s\S]*?```|`[^`\n]*`/g, (code) => {
    const token = `TEJAS_MATH_CODE_${codeBlocks.length}_TOKEN`;
    codeBlocks.push(code);
    return token;
  });

  // 1) Properly-escaped delimiters (asli, poori backslash ke saath) — sabse pehle, sabse bharosemand.
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => `$${body.trim()}$`);
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `$$${body.trim()}$$`);

  // LaTeX command list jo "ye real math hai, random text nahi" pakadne ke kaam aati hai.
  const LATEX_CMDS =
    'frac|sum|int|prod|lim|sqrt|alpha|beta|gamma|theta|pi|infty|cdot|times|div|pm|leq|geq|neq|approx|mid|in|forall|exists|partial|nabla|left|right';

  // 2) Fallback: agar \[ \] ka backslash kahin upstream (markdown-escape handling waghera) khaa jaaye,
  // to bhi bare [ ... ] ko block-math maan lo — bracket-rule PEHLE chalti hai (paren-rule se pehle),
  // taaki poora expression (jisme andar function-call jaisi parens bhi ho sakti hain, jaise "P(C \mid X)")
  // ek hi baar me poora capture ho jaye, tukdon me nahi.
  out = out.replace(
    new RegExp(`(?<!!)\\[([^\\[\\]]*?\\\\(?:${LATEX_CMDS})[^\\[\\]]*?)\\]`, 'g'),
    (_m, body) => `$$${body.trim()}$$`
  );

  // Models sometimes mix plain LaTeX with a dollar-wrapped fragment, e.g.
  // `s_t = \beta s_{t-1} + $1-\beta$ g_t^2`. Treat a complete equation line
  // as one math expression so commands/subscripts outside that fragment do not
  // leak into the answer as raw text or get split into malformed math nodes.
  out = out.split('\n').map((line) => {
    const prefixMatch = line.match(/^(\s*(?:(?:[-*+]|\d+[.)])\s+)?)(.*)$/);
    if (!prefixMatch) return line;
    const [, prefix, source] = prefixMatch;
    const trimmedSource = source.trim();

    // Keep already-valid single-dollar inline math intact. Mixed/nested dollar
    // fragments (including a leading `$` before the equation) need to be merged.
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

    // Some model outputs escape underscores as if they were Markdown text.
    // Inside math mode, turn those back into LaTeX subscript markers.
    const body = equation.replace(/\\_/g, '_');
    return `${prefix}$${body}$`;
  }).join('\n');

  // 3) Fallback: bare (...) sirf tab math maano jab:
  //    - andar koi LaTeX command ho, aur
  //    - ye kisi function-call jaisa na dikhe (jaise "P(x)", "f(x)") — us case me turant pehle
  //      ek letter/digit hota hai, jo yahan negative lookbehind se exclude kiya gaya hai.
  //    Isse "P(C \mid X)" jaisi cheez (jo already upar wale bracket-block ke andar aa chuki hogi)
  //    dobara se tod-marod kar alag se match nahi hoti.
  out = out.replace(
    new RegExp(`(?<![A-Za-z0-9_])\\(([^()]*?\\\\(?:${LATEX_CMDS})[^()]*?)\\)`, 'g'),
    (_m, body) => `$${body.trim()}$`
  );

  return out.replace(/TEJAS_MATH_CODE_(\d+)_TOKEN/g, (_token, index) => codeBlocks[Number(index)]);
}
