/** Tag for T-SQL samples: keeps backslashes as written and trims the first/last blank lines. */
export const sql = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\r?\n/, '').trimEnd();
