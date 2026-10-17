// Model kabhi \( \), \[ \] delimiters bhejta hai, kabhi beech me kahin backslash kho jaata hai
// aur bare ( ), [ ] reh jaate hain. Ye function sab ko KaTeX-samajhne-wale $...$ / $$...$$ me badalta hai.
export function normalizeMath(input: string): string {
  if (!input) return input;

  let out = input;

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

  return out;
}
