export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 10;
export const MAX_PER_PAGE = 100;
export const DEFAULT_MAX_CHARS = 16000;
export const SIZE_WARNING_THRESHOLD = 0.8;

export function paginateArray<T>(
  array: T[],
  page: number = DEFAULT_PAGE,
  perPage: number = DEFAULT_PER_PAGE,
): T[] {
  const safePerPage = Math.min(Math.max(1, perPage), MAX_PER_PAGE);
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * safePerPage;
  const end = start + safePerPage;
  return array.slice(start, end);
}

export function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'No data available';
  const headers = Object.keys(rows[0]);

  const colWidths = headers.map((header) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[header] ?? '').length),
    ),
  );

  const border = `+${colWidths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
  const headerRow = `|${headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('|')}|`;

  const bodyRows = rows.map(
    (row) =>
      `|${headers
        .map((h, i) => ` ${String(row[h] ?? '').padEnd(colWidths[i])} `)
        .join('|')}|`,
  );

  return [border, headerRow, border, ...bodyRows, border].join('\n');
}

export function formatOutput(
  data: unknown,
  format: 'pretty' | 'json' | 'table',
): string {
  if (format === 'table') {
    if (Array.isArray(data)) {
      return formatTable(data as Record<string, unknown>[]);
    }
    if (typeof data === 'object' && data !== null) {
      return formatTable([data as Record<string, unknown>]);
    }
    return String(data);
  }

  if (format === 'pretty') {
    return JSON.stringify(data, null, 2);
  }

  return JSON.stringify(data);
}

export interface TruncatedResult {
  text: string;
  truncated: boolean;
  chars: number;
  max_chars: number;
}

const TRUNCATION_FOOTER_TEMPLATE = (chars: number, maxChars: number) =>
  `\n\n--- WARNING: RESPONSE TRUNCATED ---\n` +
  `Output size (${chars} chars) exceeded max_chars limit (${maxChars}).\n` +
  `Recovery Hint: Use summary projection, lower per_page, or apply narrower search filters.\n` +
  `------------------------------------`;

export function truncateAndGuard(
  text: string,
  maxChars: number = DEFAULT_MAX_CHARS,
): TruncatedResult {
  const chars = text.length;
  if (chars <= maxChars) {
    return { text, truncated: false, chars, max_chars: maxChars };
  }

  const warningFooter = TRUNCATION_FOOTER_TEMPLATE(chars, maxChars);
  let truncatedText: string;
  if (warningFooter.length >= maxChars) {
    truncatedText = text.slice(0, maxChars);
  } else {
    truncatedText =
      text.slice(0, maxChars - warningFooter.length) + warningFooter;
  }
  if (truncatedText.length > maxChars) {
    truncatedText = truncatedText.slice(0, maxChars);
  }
  return { text: truncatedText, truncated: true, chars, max_chars: maxChars };
}

export function applySizeWarning<T extends Record<string, unknown>>(
  payload: T,
  chars: number,
  maxChars: number = DEFAULT_MAX_CHARS,
): T & { _size_warning?: string } {
  const threshold = Math.floor(maxChars * SIZE_WARNING_THRESHOLD);
  if (chars >= threshold) {
    return {
      ...payload,
      _size_warning: `Response size (${chars} chars) is at or above 80% of max_chars (${maxChars}). Consider using summary projection, lower per_page, or narrower search filters.`,
    };
  }
  return payload;
}

export interface ReadResponseOptions {
  format?: 'pretty' | 'json' | 'table';
  max_chars?: number;
  page?: number;
  per_page?: number;
  total?: number;
}

export interface ReadResponse<T> {
  ok: true;
  data: T;
  _meta: {
    truncated: boolean;
    chars: number;
    max_chars: number;
    page?: number;
    per_page?: number;
    total?: number;
  };
  _formattedText: string;
  _size_warning?: string;
}

export function buildReadResponse<T>(
  data: T,
  options: ReadResponseOptions = {},
): ReadResponse<T> {
  const format = options.format ?? 'pretty';
  const maxChars = options.max_chars ?? DEFAULT_MAX_CHARS;
  const formattedText = formatOutput(data, format);
  const guarded = truncateAndGuard(formattedText, maxChars);

  const base: ReadResponse<T> = {
    ok: true,
    data,
    _meta: {
      truncated: guarded.truncated,
      chars: guarded.chars,
      max_chars: maxChars,
      ...(options.page !== undefined && { page: options.page }),
      ...(options.per_page !== undefined && { per_page: options.per_page }),
      ...(options.total !== undefined && { total: options.total }),
    },
    _formattedText: guarded.text,
  };

  const withWarning = applySizeWarning(
    base as ReadResponse<T> & Record<string, unknown>,
    guarded.chars,
    maxChars,
  );

  return withWarning as ReadResponse<T>;
}
