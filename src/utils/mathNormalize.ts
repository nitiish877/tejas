export function normalizeMath(input: string): string {
  if (!input) return input;

  let out = input;
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => `$${body.trim()}$`);
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `$$${body.trim()}$$`);
  out = out.replace(
    /\((\s*\\(?:frac|sum|int|prod|lim|sqrt|alpha|beta|gamma|theta|pi|infty|cdot|times|div|pm|leq|geq|neq|approx|left|right)[\s\S]*?)\)/g,
    (_m, body) => `$${body.trim()}$`
  );

  return out;
}