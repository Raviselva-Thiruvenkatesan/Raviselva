/** A tiny, safe C# syntax highlighter: returns tokens per line (rendered with bindings, no HTML). */
export type TokKind = 'kw' | 'type' | 'fn' | 'str' | 'num' | 'com' | 'p';
export interface Tok { k: TokKind; v: string }

const KEYWORDS = new Set((
  'abstract as async await base bool break byte case catch char checked class const continue decimal default ' +
  'delegate do double else enum event explicit extern false finally fixed float for foreach get goto if implicit ' +
  'in init int interface internal is lock long namespace new null object operator out override params private ' +
  'protected public readonly record ref return sbyte sealed set short sizeof stackalloc static string struct ' +
  'switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile when ' +
  'where while yield nameof and or not'
).split(' '));

const TOKEN = /(\/\/.*$)|(\$?@?"(?:[^"\\]|\\.)*"?)|('(?:[^'\\]|\\.)*')|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[fFdDmMlLuU]*\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;

export function highlight(code: string): Tok[][] {
  return code.split('\n').map(line => {
    const toks: Tok[] = [];
    const re = new RegExp(TOKEN.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const [all, com, str, chr, num, ident] = m;
      let k: TokKind = 'p';
      if (com) k = 'com';
      else if (str || chr) k = 'str';
      else if (num) k = 'num';
      else if (ident) {
        if (KEYWORDS.has(ident)) k = 'kw';
        else if (/^\s*\(/.test(line.slice(re.lastIndex))) k = 'fn';
        else if (/^[A-Z]/.test(ident)) k = 'type';
      }
      const last = toks[toks.length - 1];
      if (k === 'p' && last?.k === 'p') last.v += all;
      else toks.push({ k, v: all });
    }
    return toks;
  });
}
