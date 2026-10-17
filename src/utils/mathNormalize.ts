export function normalizeMath(input: string): string {
  if (!input) return input;

  let out = input;

  // Only normalize explicitly escaped math delimiters. Do not try to guess math
  // from plain parentheses, because that breaks normal prose and can generate
  // invalid KaTeX input that crashes the renderer.
  out = out.replace(/\\\(([[\s\S]*?)\\\)/g, (_m, body) => `$${body.trim()}$`);
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `$$${body.trim()}$$`);

  return out;
}
