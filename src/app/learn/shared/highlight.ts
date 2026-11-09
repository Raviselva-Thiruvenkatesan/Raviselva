/** Tiny, safe C# and T-SQL syntax highlighters: they return tokens per line (rendered with bindings, no HTML). */
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

export type CodeLang = 'cs' | 'sql';

export function highlight(code: string, lang: CodeLang = 'cs'): Tok[][] {
  if (lang === 'sql') return highlightSql(code);
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

const SQL_KEYWORDS = new Set((
  'add all alter and any apply as asc authorization backup begin between break by cascade case catch check checkpoint ' +
  'close clustered collate column commit constraint continue create cross current cursor database deallocate declare ' +
  'default delete deny desc distinct drop else end escape except exec execute exists fetch first for foreign from full ' +
  'function go goto grant group having holdlock identity if in include index inner insert intersect into is isolation ' +
  'join key kill left level like matched merge next nocount nonclustered not null of off offset on only open option or ' +
  'order outer output over partition percent pivot primary print proc procedure raiserror read references return ' +
  'returns revoke right rollback row rows rowcount schema select set some source table target then throw ties to top ' +
  'tran transaction trigger truncate try union unique unpivot update use using values view when where while with'
).split(' '));

const SQL_TYPES = new Set((
  'bigint binary bit char date datetime datetime2 datetimeoffset decimal float image int money nchar ntext numeric ' +
  'nvarchar real smalldatetime smallint smallmoney sql_variant text time timestamp tinyint uniqueidentifier varbinary ' +
  'varchar xml max'
).split(' '));

const SQL_TOKEN = /(--.*$)|(N?'(?:[^']|'')*'?)|(\[[^\]]*\]?)|(@@?\w+)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_#][\w#$]*)|(\s+)|(.)/g;

/** T-SQL: keywords and types are case-insensitive, strings use '' to escape a quote, [names] are bracketed. */
function highlightSql(code: string): Tok[][] {
  let inBlock = false;
  return code.split('\n').map(line => {
    const toks: Tok[] = [];
    let rest = line;
    if (inBlock) {
      const end = rest.indexOf('*/');
      if (end < 0) return rest ? [{ k: 'com', v: rest }] : [];
      toks.push({ k: 'com', v: rest.slice(0, end + 2) });
      rest = rest.slice(end + 2);
      inBlock = false;
    }
    const re = new RegExp(SQL_TOKEN.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(rest))) {
      const [all, com, str, bracket, variable, num, ident] = m;
      if (all === '/' && rest[re.lastIndex] === '*') {
        const end = rest.indexOf('*/', re.lastIndex + 1);
        const v = end < 0 ? rest.slice(m.index) : rest.slice(m.index, end + 2);
        toks.push({ k: 'com', v });
        if (end < 0) { inBlock = true; break; }
        re.lastIndex = end + 2;
        continue;
      }
      let k: TokKind = 'p';
      if (com) k = 'com';
      else if (str) k = 'str';
      else if (num) k = 'num';
      else if (bracket || variable) k = 'type';
      else if (ident) {
        const low = ident.toLowerCase();
        if (SQL_KEYWORDS.has(low)) k = 'kw';
        else if (SQL_TYPES.has(low)) k = 'type';
        else if (/^\s*\(/.test(rest.slice(re.lastIndex))) k = 'fn';
      }
      const last = toks[toks.length - 1];
      if (k === 'p' && last?.k === 'p') last.v += all;
      else toks.push({ k, v: all });
    }
    return toks;
  });
}
