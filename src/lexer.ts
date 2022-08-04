import {
  Location,
  TokenKind,
  Token,
  ALPHA,
  QUOTES,
  NUM,
  KEYWORDS,
  LANGUAGE_LITERALS,
  KEYWORD,
} from './types';

export class Locator {
  col: number;
  row: number;
  file: string;

  constructor(file: string) {
    this.col = 1;
    this.row = 1;
    this.file = file;
  }

  advance(str: string) {
    for (let x of str) {
      if (x == '\n') {
        this.col = 1;
        this.row += 1;
      } else {
        this.col += 1;
      }
    }
  }

  get(str: string) {
    const loc = new Location({
      col: this.col,
      row: this.row,
      file: this.file,
      length: str.length,
    });
    this.advance(str);
    return loc;
  }
}

export function isIdentifier(str: string) {
  if (str == '') return false;
  let code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    const isNum = code > 47 && code < 58;
    const isAlpha = (code > 64 && code < 91) || (code > 96 && code < 123);
    const isUnderscore = code == 95;

    if (i == 0 && isNum) {
      return false;
    }
    if (!(isAlpha || isNum || isUnderscore)) {
      return false;
    }
  }
  return true;
}

export function parseStringLiteral(
  locator: Locator,
  body: string,
  idx: number
): [number, Token] {
  if (!["'", '"', '`'].includes(body[idx])) {
    throw 'Parser Error';
  }

  let offset = 1;
  let parsed = body[idx];
  const len = body.length;
  const start_quote = body[idx];

  const SPECIAL_CHARACTERS_MAP = {
    '\\n': '\n',
    '\\t': '\t',
  } as const;

  while (idx + offset < len && body[idx + offset] != start_quote) {
    parsed += body[idx + offset];
    offset++;
  }
  if (idx + offset >= len) {
    throw 'Missing matching quote.';
  }
  parsed += body[idx + offset];

  const loc = locator.get(parsed);
  return [
    idx + offset + 1,
    {
      kind:
        start_quote == '`'
          ? TokenKind.literal_format_string
          : TokenKind.literal_string,
      loc: loc,
      val: parsed.slice(1, parsed.length - 1),
    },
  ];
}

export function parseNumberLiteral(
  locator: Locator,
  body: string,
  idx: number
): [true, number, Token] | [false, number, undefined] {
  let offset = 0;
  let parsed = '';
  const len = body.length;
  let d_count = 0;
  let p_count = 0;
  let m_count = 0;
  let exp_pos = undefined;
  while (
    idx + offset < len &&
    '.0123456789_+-eE'.includes(body[idx + offset])
  ) {
    const pos = idx + offset;
    if (body[pos] == '.') {
      d_count++;
      if (d_count > 1) {
        break;
      }
    } else if (body[pos] == 'e' || body[pos] == 'E') {
      if (exp_pos) {
        throw 'Syntax Error: Too many exponents.';
      } else {
        exp_pos = offset;
      }
    } else if (body[pos] == '+') {
      p_count++;
      if (p_count > 1 || (body[pos - 1] != 'e' && body[pos - 1] != 'E')) {
        break;
      }
    } else if (body[pos] == '-') {
      m_count++;
      if (m_count > 1 || (body[pos - 1] != 'e' && body[pos - 1] != 'E')) {
        break;
      }
    }

    parsed += body[pos];
    locator.advance(body[pos]);
    offset++;
  }

  if (idx + offset < len && ALPHA.includes(body[idx + offset])) {
    throw "Syntax Error: Can't parse number.";
  }

  if ('eE'.includes(parsed[parsed.length - 1])) {
    throw 'Syntax Error: Missing exponent.';
  }

  if (parsed.length == 1 && (p_count == 1 || m_count == 1 || d_count == 1)) {
    return [false, idx, undefined];
  }

  const kind =
    d_count || exp_pos
      ? TokenKind.literal_number_flt
      : TokenKind.literal_number_int;

  return [
    true,
    idx + offset,
    {
      val: parsed,
      loc: locator.get(parsed),
      kind: kind,
    },
  ];
}

export function isWhiteSpace(str: string) {
  return [' ', '\n', '\r', '\t'].includes(str);
}

export function isIdentifierOrToken(str: string) {
  return (
    isIdentifier(str) ||
    KEYWORDS.includes(str as KEYWORD) ||
    LANGUAGE_LITERALS.includes(str)
  );
}

export function lex(file: string, body: string) {
  const _body = body.replaceAll('\r\n', '\n');

  const tokens: Token[] = [];
  const len = _body.length;
  const locator = new Locator(file);
  let idx = 0;

  while (idx < len) {
    if (isWhiteSpace(_body[idx])) {
      locator.advance(_body[idx]);
      idx += _body[idx].length;
      continue;
    }

    if (idx + 1 < len && _body[idx] + _body[idx + 1] === '//') {
      let offset = 0;
      let parsed = '';
      let line_ended = false;
      while (idx + offset < len && !line_ended) {
        if (_body[idx + offset] == '\n') {
          line_ended = true;
        }
        parsed += _body[idx + offset];
        offset++;
      }
      idx += offset;

      tokens.push({
        kind: TokenKind.comment,
        loc: locator.get(parsed),
        val: parsed,
      });
      continue;
    }

    if (QUOTES.includes(_body[idx])) {
      const [new_idx, tkn] = parseStringLiteral(locator, _body, idx);
      tokens.push(tkn);
      idx = new_idx;
      continue;
    }

    if (
      NUM.includes(_body[idx]) ||
      (idx + 1 < len && _body[idx] == '.' && NUM.includes(_body[idx + 1]))
    ) {
      const [success, new_idx, tkn] = parseNumberLiteral(locator, _body, idx);
      if (success) {
        tokens.push(tkn as Token);
        idx = new_idx;
        continue;
      }
    }

    let parsed = '';
    while (
      idx < len &&
      (parsed === '' || isIdentifierOrToken(parsed + _body[idx]))
    ) {
      parsed += _body[idx];
      idx += 1;
    }

    if (LANGUAGE_LITERALS.includes(parsed)) {
      tokens.push({
        loc: locator.get(parsed),
        kind: TokenKind.literal_lang,
        val: parsed,
      });
      continue;
    }

    if (KEYWORDS.includes(parsed as KEYWORD)) {
      tokens.push({
        loc: locator.get(parsed),
        kind: TokenKind.keyword,
        val: parsed,
      });
      continue;
    }

    tokens.push({
      loc: locator.get(parsed),
      val: parsed,
      kind: TokenKind.identifier,
    });
  }

  return tokens;
}
