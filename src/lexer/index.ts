import {
  KEYWORD,
  KEYWORDS,
  LANGUAGE_LITERALS,
  NUM,
  QUOTES,
  Token,
  TokenKind,
} from '../types/types';
import {
  isIdentifierOrToken,
  isWhiteSpace,
  parseNumberLiteral,
  parseStringLiteral,
} from './helper';
import { Locator } from './locator';

export function lexer(file: string, body: string) {
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
