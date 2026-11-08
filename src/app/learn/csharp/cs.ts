/** Tag for C# code samples: keeps backslashes as written and trims the first/last blank lines. */
export const cs = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\r?\n/, '').trimEnd();
