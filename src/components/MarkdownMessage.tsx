import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import { Copy, Check, Download, ExternalLink } from 'lucide-react';
import { copyText } from '../utils/clipboard';

// Kuch bundlers default export ko { default: fn } bana dete hain, isliye dono case handle
const unwrap = (m: any) => (m && m.default ? m.default : m);

const LANGS: Record<string, any> = {
  javascript, typescript, jsx, tsx, python, bash, json, css, markup, java, c, cpp, csharp, sql, go, rust, yaml, php,
};
Object.entries(LANGS).forEach(([name, def]) => SyntaxHighlighter.registerLanguage(name, unwrap(def)));
const codeTheme = {
  ...unwrap(oneDark),
  'code[class*="language-"]': { color: '#d7e5eb', background: 'transparent' },
  'pre[class*="language-"]': { color: '#d7e5eb', background: 'transparent' },
  comment: { color: '#8298a2', fontStyle: 'italic' },
  prolog: { color: '#8298a2' },
  doctype: { color: '#8298a2' },
  cdata: { color: '#8298a2' },
  punctuation: { color: '#a9bbc3' },
  'namespace': { color: '#a9bbc3', opacity: 0.85 },
  property: { color: '#81c9d0' },
  tag: { color: '#81c9d0' },
  boolean: { color: '#d5b985' },
  number: { color: '#d5b985' },
  constant: { color: '#d5b985' },
  symbol: { color: '#d5b985' },
  deleted: { color: '#d49a9a' },
  selector: { color: '#9bc9b1' },
  'attr-name': { color: '#9bc9b1' },
  string: { color: '#9bc9b1' },
  char: { color: '#9bc9b1' },
  builtin: { color: '#9bc9b1' },
  inserted: { color: '#9bc9b1' },
  operator: { color: '#86b7c4' },
  entity: { color: '#86b7c4' },
  url: { color: '#86b7c4' },
  atrule: { color: '#77c3ca' },
  'attr-value': { color: '#9bc9b1' },
  keyword: { color: '#79c6cd' },
  function: { color: '#9bb9df' },
  'class-name': { color: '#a8b7db' },
  regex: { color: '#d5b985' },
  important: { color: '#d5b985', fontWeight: 'bold' },
  variable: { color: '#d4a5c8' },
};

// Model kabhi "js", "py", "html" jaise short naam likhta hai
const ALIASES: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python', python3: 'python', sh: 'bash', shell: 'bash', zsh: 'bash',
  html: 'markup', xml: 'markup', svg: 'markup', yml: 'yaml', 'c++': 'cpp', 'c#': 'csharp', cs: 'csharp',
  golang: 'go', rs: 'rust', jsonc: 'json',
};
const normalizeLang = (raw: string): string => ALIASES[raw.toLowerCase()] || raw.toLowerCase();

// Language → file extension (for downloads)
const LANG_EXT: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  jsx: 'jsx',
  tsx: 'tsx',
  python: 'py',
  bash: 'sh',
  shell: 'sh',
  zsh: 'sh',
  json: 'json',
  jsonc: 'json',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  markup: 'html',
  html: 'html',
  xml: 'xml',
  svg: 'svg',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  sql: 'sql',
  go: 'go',
  rust: 'rs',
  yaml: 'yml',
  yml: 'yml',
  php: 'php',
  markdown: 'md',
  md: 'md',
  text: 'txt',
  plaintext: 'txt',
  txt: 'txt',
};
const getExtension = (lang: string): string => LANG_EXT[lang] || 'txt';

const LANG_BADGE: Record<string, string> = {
  javascript: '🟨', typescript: '🟦', jsx: '⚛️', tsx: '⚛️', python: '🐍', bash: '💻', json: '🧾', css: '🎨',
  markup: '🌐', java: '☕', c: '⚙️', cpp: '⚙️', csharp: '🔷', sql: '🗄️', go: '🐹', rust: '🦀', yaml: '📄', php: '🐘',
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const lang = normalizeLang(language);

  const handleCopy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const ext = getExtension(lang);
    const filename = `tejas-snippet-${Date.now()}.${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-cyan-800/60 shadow-md shadow-slate-950/10">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1d303c] border-b border-cyan-800/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex gap-1.5 shrink-0" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-[#a6dce0] truncate">
            {LANG_BADGE[lang] || '📝'} {language || 'code'}
          </span>
        </div>

        {/* Icon-only action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied' : 'Copy code'}
            aria-label="Copy code"
            className={`p-1.5 rounded-lg transition-all ${
              copied
                ? 'text-emerald-300 bg-emerald-500/15'
                : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download file"
            aria-label="Download code"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-[#172631]">
        <SyntaxHighlighter
          language={lang}
          style={codeTheme}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.85rem', lineHeight: '1.6', minWidth: '100%' }}
          codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const MarkdownMessage: React.FC<{ content: string; isDark: boolean; confirmExternalLinks?: boolean }> = ({ content, isDark, confirmExternalLinks = false }) => {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyPendingUrl = async () => {
    if (!pendingUrl || !(await copyText(pendingUrl))) return;
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 1800);
  };

  const trustAndOpen = () => {
    if (!pendingUrl) return;
    window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    setPendingUrl(null);
  };

  return <>
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      // <pre> ko khali rakho, warna CodeBlock ke upar dusra box ban jata hai
      pre: ({ children }) => <>{children}</>,
      code({ className, children, ...props }) {
        const text = String(children);
        const match = /language-([\w+#-]+)/.exec(className || '');
        // Fenced block (bina language wala multi-line bhi)
        if (match || text.includes('\n')) {
          return <CodeBlock code={text.replace(/\n$/, '')} language={match ? match[1] : ''} />;
        }
        // Inline code
        return (
          <code
            className={`px-1.5 py-0.5 rounded-md text-[0.9em] font-mono ${
              isDark ? 'bg-zinc-800 text-pink-300' : 'bg-zinc-100 text-pink-600'
            }`}
            {...props}
          >
            {children}
          </code>
        );
      },
      a: ({ children, href, ...props }) => (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer" onClick={(event) => {
          if (!confirmExternalLinks) return;
          if (!href) return;
          try {
            const url = new URL(href, window.location.href);
            if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
            event.preventDefault();
            setPendingUrl(url.href);
          } catch {
            event.preventDefault();
          }
        }}>
          {children}
        </a>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
  {pendingUrl && (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setPendingUrl(null)}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="external-link-title" className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`} onClick={(event) => event.stopPropagation()}>
        <h2 id="external-link-title" className="text-base font-semibold">Open this link?</h2>
        <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Only open it if you trust this destination.</p>
        <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-50'}`}>
          <a href={pendingUrl} onClick={(event) => event.preventDefault()} className="min-w-0 flex-1 break-all text-sm text-cyan-500 underline underline-offset-2">{pendingUrl}</a>
          <button type="button" onClick={copyPendingUrl} title="Copy link" aria-label="Copy link" className={`shrink-0 rounded-lg p-2 ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}>{copiedUrl ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setPendingUrl(null)} className={`rounded-xl px-4 py-2 text-sm font-medium ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}>Cancel</button>
          <button type="button" onClick={trustAndOpen} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"><ExternalLink className="h-4 w-4" />Trust &amp; Open</button>
        </div>
      </section>
    </div>
  )}
  </>;
};
