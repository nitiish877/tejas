export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_BYTES = 20 * 1024 * 1024;
export const MAX_ZIP_EXPANDED_BYTES = 100 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 5;
export const MAX_EXTRACTED_CHARS = 200_000;

export interface PreparedAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: 'image' | 'document';
  text?: string;
  dataUrl?: string;
  previewUrl?: string;
}

const CODE_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'vue',
  'svelte', 'py', 'pyi', 'java', 'kt', 'kts', 'go', 'rs', 'c', 'h', 'cc', 'cpp', 'hpp', 'cs',
  'php', 'rb', 'swift', 'sh', 'bash', 'zsh', 'ps1', 'sql', 'graphql', 'gql', 'prisma', 'dockerfile',
  'makefile', 'gradle', 'properties', 'env.example', 'lock', 'log', 'r', 'lua', 'dart', 'ex', 'exs',
  'elm', 'clj', 'cljs', 'edn', 'hs', 'lhs', 'scala', 'sc', 'tf', 'hcl', 'proto', 'wasm', 'svg', 'gitignore',
]);

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']);

function extension(name: string): string {
  const file = name.toLowerCase().split(/[\\/]/).pop() || '';
  if (file === 'dockerfile' || file === 'makefile' || file === '.gitignore') return file.replace(/^\./, '');
  return file.includes('.') ? file.split('.').pop() || '' : '';
}

function numberedText(path: string, contents: string, startLine = 1): string {
  const lines = contents.replace(/\r\n?/g, '\n').split('\n');
  return `### ${path}\n${lines.map((line, i) => `${startLine + i}: ${line}`).join('\n')}`;
}

function xmlText(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('*'))
    .filter((node) => node.localName === 't' || node.localName === 'v')
    .map((node) => node.textContent || '')
    .filter(Boolean)
    .join(' ');
}

async function imageToDataUrl(file: File): Promise<{ dataUrl: string; previewUrl: string }> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Could not open image: ${file.name}`));
      element.src = sourceUrl;
    });
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not process this image in your browser.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    return { dataUrl, previewUrl: sourceUrl };
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    throw error;
  }
}

async function parsePdf(file: File): Promise<string> {
  const [pdfjsLib, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lineGroups = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items as any[]) {
      const text = String(item.str || '').trim();
      if (!text) continue;
      const baseline = Math.round(Number(item.transform?.[5] || 0) / 3) * 3;
      const group = lineGroups.get(baseline) || [];
      group.push({ x: Number(item.transform?.[4] || 0), text });
      lineGroups.set(baseline, group);
    }
    const lines = Array.from(lineGroups.entries())
      .sort(([a], [b]) => b - a)
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '));
    if (!lines.length) lines.push('[No selectable text on this page; scanned-page OCR is not available.]');
    pages.push(`### ${file.name} — page ${pageNumber}\n${lines.map((line, i) => `${i + 1}: ${line}`).join('\n')}`);
    if (pages.join('\n\n').length >= MAX_EXTRACTED_CHARS) break;
  }
  return pages.join('\n\n');
}

async function parseZip(file: File): Promise<{ text: string; images: PreparedAttachment[] }> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(file, { checkCRC32: false });
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > 4000) throw new Error(`${file.name} has too many files (maximum 4,000).`);
  const expanded = entries.reduce((total, entry) => total + Number((entry as any)._data?.uncompressedSize || 0), 0);
  if (expanded > MAX_ZIP_EXPANDED_BYTES) throw new Error(`${file.name} expands beyond the 100 MB safety limit.`);

  const excluded = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|vendor|\.venv|venv|__pycache__)(\/|$)/i;
  const output: string[] = [];
  const imageAssets: string[] = [];
  const images: PreparedAttachment[] = [];
  let charCount = 0;
  let filesRead = 0;
  for (const entry of entries) {
    const path = entry.name.replace(/\\/g, '/');
    if (excluded.test(path) || /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(path)) continue;
    const ext = extension(path);
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
      imageAssets.push(path);
      if (images.length < 5 && Number((entry as any)._data?.uncompressedSize || 0) <= MAX_IMAGE_BYTES) {
        const blob = await entry.async('blob');
        if (blob.size <= MAX_IMAGE_BYTES) {
          const imageFile = new File([blob], path, { type: blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}` });
          const { dataUrl, previewUrl } = await imageToDataUrl(imageFile);
          images.push({
            id: `${path}-${Math.random().toString(36).slice(2)}`,
            name: path,
            size: blob.size,
            mimeType: 'image/jpeg',
            kind: 'image',
            dataUrl,
            previewUrl,
          });
        }
      }
      continue;
    }
    if (!CODE_EXTENSIONS.has(ext) && !['docx', 'pptx', 'xlsx', 'pdf'].includes(ext)) continue;
    const blob = await entry.async('blob');
    let text = '';
    if (['docx', 'pptx', 'xlsx', 'pdf'].includes(ext)) {
      text = await parseOfficeOrPdf(blob, path, ext);
    } else {
      text = numberedText(path, await blob.text());
    }
    if (!text) continue;
    const remaining = MAX_EXTRACTED_CHARS - charCount;
    if (text.length > remaining) {
      output.push(`${text.slice(0, Math.max(0, remaining))}\n[ZIP text limit reached; remaining files were not included.]`);
      break;
    }
    output.push(text);
    charCount += text.length;
    filesRead += 1;
    if (filesRead >= 1500) {
      output.push('[Maximum of 1,500 readable source files reached.]');
      break;
    }
  }
  const assetManifest = imageAssets.length
    ? `Image assets in archive (${images.length} sent for visual analysis):\n${imageAssets.slice(0, 500).map((path) => `- ${path}`).join('\n')}${imageAssets.length > 500 ? '\n- [Additional image paths omitted]' : ''}`
    : '';
  const extractedText = `ZIP archive: ${file.name}\nReadable source/document files: ${filesRead}\nExpanded archive size: ${Math.round(expanded / 1024)} KB${assetManifest ? `\n\n${assetManifest}` : ''}\n\n${output.join('\n\n') || 'No readable source or document files were found in this archive.'}`;
  return { text: extractedText, images };
}

async function parseOfficeOrPdf(file: Blob, name: string, ext: string): Promise<string> {
  if (ext === 'pdf') return parsePdf(new File([file], name));
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(file);
  if (ext === 'docx') {
    const document = zip.file('word/document.xml');
    if (!document) return '';
    const xml = await document.async('text');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const paragraphs = Array.from(doc.getElementsByTagName('*')).filter((node) => node.localName === 'p');
    return paragraphs.map((paragraph, index) => `${index + 1}: ${xmlText(new XMLSerializer().serializeToString(paragraph))}`).join('\n');
  }
  if (ext === 'pptx') {
    const slides = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path)).sort((a, b) =>
      Number(a.match(/slide(\d+)/i)?.[1]) - Number(b.match(/slide(\d+)/i)?.[1])
    );
    const result: string[] = [];
    for (const path of slides) {
      const xml = await zip.file(path)?.async('text');
      if (xml) result.push(`### ${name} — ${path.split('/').pop()}\n${xmlText(xml)}`);
    }
    return result.join('\n\n');
  }
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  if (!workbookXml) return '';
  const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
  const relsDoc = relsXml ? new DOMParser().parseFromString(relsXml, 'application/xml') : null;
  const relationshipTargets = new Map<string, string>();
  for (const rel of Array.from(relsDoc?.getElementsByTagName('*') || []).filter((node) => node.localName === 'Relationship')) {
    relationshipTargets.set(rel.getAttribute('Id') || '', rel.getAttribute('Target') || '');
  }
  const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('text');
  const sharedStringsDoc = sharedStringsXml ? new DOMParser().parseFromString(sharedStringsXml, 'application/xml') : null;
  const sharedStrings = Array.from(sharedStringsDoc?.getElementsByTagName('*') || [])
    .filter((node) => node.localName === 'si')
    .map((item) => Array.from(item.getElementsByTagName('*')).filter((node) => node.localName === 't').map((node) => node.textContent || '').join(''));
  const result: string[] = [];
  for (const sheetNode of Array.from(workbookDoc.getElementsByTagName('*')).filter((node) => node.localName === 'sheet')) {
    const sheetName = sheetNode.getAttribute('name') || 'Sheet';
    const relationId = Array.from(sheetNode.attributes).find((attribute) => attribute.localName === 'id')?.value || '';
    const target = relationshipTargets.get(relationId);
    if (!target) continue;
    const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const sheetXml = await zip.file(sheetPath)?.async('text');
    if (!sheetXml) continue;
    const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');
    const dimension = Array.from(sheetDoc.getElementsByTagName('*')).find((node) => node.localName === 'dimension')?.getAttribute('ref') || 'unknown range';
    const rows = Array.from(sheetDoc.getElementsByTagName('*')).filter((node) => node.localName === 'row');
    const content = rows.map((row, rowIndex) => {
      const cells = Array.from(row.getElementsByTagName('*')).filter((node) => node.localName === 'c');
      return `${row.getAttribute('r') || rowIndex + 1}: ${cells.map((cell) => {
        const address = cell.getAttribute('r') || '?';
        const type = cell.getAttribute('t');
        const rawValue = Array.from(cell.getElementsByTagName('*')).find((node) => node.localName === 'v')?.textContent || '';
        const inlineValue = Array.from(cell.getElementsByTagName('*')).filter((node) => node.localName === 't').map((node) => node.textContent || '').join('');
        const value = type === 's' ? sharedStrings[Number(rawValue)] || '' : type === 'inlineStr' ? inlineValue : type === 'b' ? (rawValue === '1' ? 'TRUE' : 'FALSE') : rawValue;
        const formula = Array.from(cell.getElementsByTagName('*')).find((node) => node.localName === 'f')?.textContent;
        return `${address}=${value}${formula ? ` [formula: ${formula}]` : ''}`;
      }).join(' | ')}`;
    });
    result.push(`### ${name} — sheet “${sheetName}” (${dimension})\n${content.join('\n')}`);
  }
  return result.join('\n\n');
}

async function parseDocument(file: File): Promise<string> {
  const ext = extension(file.name);
  if (ext === 'zip') return (await parseZip(file)).text;
  if (ext === 'pdf') return parsePdf(file);
  if (['docx', 'pptx', 'xlsx'].includes(ext)) return parseOfficeOrPdf(file, file.name, ext);
  if (['csv', 'tsv', 'txt', 'md', 'json', 'jsonl', 'xml', 'html', 'htm', 'yaml', 'yml'].includes(ext) || CODE_EXTENSIONS.has(ext)) {
    return numberedText(file.name, await file.text());
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

export async function prepareAttachments(files: File[]): Promise<PreparedAttachment[]> {
  if (files.length > MAX_FILES_PER_UPLOAD) throw new Error(`Attach up to ${MAX_FILES_PER_UPLOAD} files at a time.`);
  const prepared: PreparedAttachment[] = [];
  let totalImageBytes = 0;
  let totalEncodedImageChars = 0;
  let totalImageCount = 0;
  let totalTextChars = 0;
  for (const file of files) {
    const ext = extension(file.name);
    const isImage = IMAGE_TYPES.has(file.type) || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext);
    const isZip = ext === 'zip';
    const isText = ['csv', 'tsv', 'txt', 'md', 'json', 'jsonl', 'xml', 'html', 'htm', 'yaml', 'yml'].includes(ext) || CODE_EXTENSIONS.has(ext);
    const maxBytes = isImage ? MAX_IMAGE_BYTES : isZip ? MAX_ZIP_BYTES : isText ? MAX_TEXT_BYTES : MAX_DOCUMENT_BYTES;
    if (file.size > maxBytes) throw new Error(`${file.name} is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
    if (isImage) {
      if (totalImageCount >= 5) throw new Error('Attach up to 5 images in one message.');
      totalImageBytes += file.size;
      if (totalImageBytes > MAX_IMAGE_BYTES * 2) throw new Error('Images in one message can total up to 20 MB.');
      const { dataUrl, previewUrl } = await imageToDataUrl(file);
      totalEncodedImageChars += dataUrl.length;
      if (totalEncodedImageChars > 4 * 1024 * 1024) {
        URL.revokeObjectURL(previewUrl);
        throw new Error('Processed images in one message can total up to 3 MB.');
      }
      prepared.push({ id, name: file.name, size: file.size, mimeType: 'image/jpeg', kind: 'image', dataUrl, previewUrl });
      totalImageCount += 1;
    } else {
      const archive = isZip ? await parseZip(file) : null;
      let text = archive ? archive.text : await parseDocument(file);
      const remaining = MAX_EXTRACTED_CHARS - totalTextChars;
      if (remaining <= 0) throw new Error('Attachments in one message reached the 200,000 character reading limit.');
      if (text.length > remaining) text = `${text.slice(0, remaining)}\n[Attachment text limit reached; the rest of this file was not included.]`;
      totalTextChars += text.length;
      prepared.push({ id, name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream', kind: 'document', text });
      for (const image of archive?.images || []) {
        totalImageBytes += image.size;
        totalEncodedImageChars += image.dataUrl?.length || 0;
        if (totalImageCount >= 5 || totalImageBytes > MAX_IMAGE_BYTES * 2 || totalEncodedImageChars > 4 * 1024 * 1024) {
          releaseAttachmentPreviews([image]);
          continue;
        }
        prepared.push(image);
        totalImageCount += 1;
      }
    }
  }
  return prepared;
}

export function releaseAttachmentPreviews(attachments: PreparedAttachment[]) {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  });
}
