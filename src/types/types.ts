import { LanguageObject } from './objects';
import {
  Associativity as Asso,
  FunctionNode,
  FunctionValueNode,
  NodeType,
  TypeNode,
} from '../ast/nodes';

export const BUILTIN_KWORD = 'std' as const;
export type BUILTIN_KWORD = typeof BUILTIN_KWORD;

export const COMPUTED_KWORD = 'computed' as const;
export type COMPUTED_KWORD = typeof COMPUTED_KWORD;

// LITERALS
export const NAN = 'NaN' as const;
export type NAN = typeof NAN;
export const INFINITY = 'Infinity' as const;
export type INFINITY = typeof INFINITY;
export const UNDEFINED = 'undefined' as const;
export type UNDEFINED = typeof UNDEFINED;
export const NULL = 'null' as const;
export type NULL = typeof NULL;
export const TRUE = 'true' as const;
export type TRUE = typeof TRUE;
export const FALSE = 'false' as const;
export type FALSE = typeof FALSE;

// TYPES
export const TYPE_POINTER = 'ptr' as const;
export type TYPE_POINTER = typeof TYPE_POINTER;
export const TYPE_BOOLEAN = 'bool' as const;
export type TYPE_BOOLEAN = typeof TYPE_BOOLEAN;
export const TYPE_FLOAT = 'flt' as const;
export type TYPE_FLOAT = typeof TYPE_FLOAT;
export const TYPE_INTEGER = 'int' as const;
export type TYPE_INTEGER = typeof TYPE_INTEGER;
export const TYPE_STRING = 'str' as const;
export type TYPE_STRING = typeof TYPE_STRING;
export const TYPE_FUNCTION = 'fun' as const;
export type TYPE_FUNCTION = typeof TYPE_FUNCTION;
export const TYPE_ANY = 'any' as const;
export type TYPE_ANY = typeof TYPE_ANY;
export const TYPE_NEVER = 'never' as const;
export type TYPE_NEVER = typeof TYPE_NEVER;
export const TYPE_VOID = 'void' as const;
export type TYPE_VOID = typeof TYPE_VOID;
export const TYPE_UNKNOWN = 'unknown' as const;
export type TYPE_UNKNOWN = typeof TYPE_UNKNOWN;
export const TYPE_UNDEFINED = 'undefined' as const;
export type TYPE_UNDEFINED = typeof TYPE_UNDEFINED;

export type TYPES_WITH_CONSTRUCTOR =
  | TYPE_POINTER
  | TYPE_BOOLEAN
  | TYPE_FLOAT
  | TYPE_INTEGER
  | TYPE_STRING;

export type BUILTIN_TYPES =
  | TYPE_POINTER
  | TYPE_BOOLEAN
  | TYPE_FLOAT
  | TYPE_INTEGER
  | TYPE_STRING
  | TYPE_FUNCTION
  | TYPE_UNKNOWN
  | TYPE_ANY;

export const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NUM = '0123456789';
export const ALNUM = ALPHA + NUM;
export const QUOTES = '\'"`';

export const LANGUAGE_LITERALS: string[] = [
  'true',
  'false',
  'undefined',
  'null',
  'NaN',
  'Infinity',
];
export const KEYWORDS = [
  ';',
  ':',
  '::',
  '?:',
  ',',
  '=',
  '+=',
  '-=',
  '*=',
  '**=',
  '/=',
  '%=',
  '~/=',
  '!',
  '&&',
  '|',
  '||',
  '!|',
  '<=',
  '>=',
  '==',
  '!=',
  '.',
  '..',
  '...',
  '+',
  '++',
  '-',
  '--',
  '/',
  '~/',
  '*',
  '%',
  '**',
  'debug',
  'error',
  'return',
  'const',
  'let',
  'exit',
  'fn',
  // 'obj',
  // 'default',
  // 'unary',
  // 'public',
  // 'private',
  // 'static',
  'if',
  'else',
  'for',
  'in',
  'while',
  'do',
  'here',
  'dump_mem',
  'builtin',
  'declare',
  'goto',
  'label',
  // 'switch',
  // 'assert',
  'use',
  'typeof',
  'as',
  'delete',
  'cast',
  'struct',
  '[',
  ']',
  '(',
  ')',
  '<',
  '>',
  '{',
  '}',

  // types
  'str',
  'i64',
  'u64',
  'fun',
  'f64',
  'f128',
  'ptr',
  'bool',
  'any',
  'unknown',

  //
  'console_input',
] as const;

export type KEYWORD = typeof KEYWORDS[number];

export const OPERATOR = [
  'add',
  'uadd',
  'sub',
  'usub',
  'mul',
  // 'ptr',
  'div',
  'wdiv',
  'mod',
  'pow',
  'geq',
  'decr',
  'incr',
  'leq',
  'lt',
  'gt',
  'eq',
  'neq',
  'not',
  'and',
  'or',
  'xor',
  'access_computed',
  'access_property',
  'access_call',
  'cast',
  'typeof',
  'in',
  'range',
  // 'as',
  'delete',
  'assign',
  'add_assign',
  'sub_assign',
  'pow_assign',
  'mul_assign',
  'div_assign',
  'mod_assign',
  'wdiv_assign',
] as const;

export type OPERATOR = typeof OPERATOR[number];

export const OPERATORS: {
  [key in OPERATOR]: {
    asso: Asso;
    left: boolean;
    right: boolean;
    prec: number;
  };
} = {
  assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  add_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  sub_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  pow_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  mul_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  div_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  mod_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  wdiv_assign: { asso: Asso.RTL, left: true, right: true, prec: 5 },
  add: { asso: Asso.LTR, left: true, right: true, prec: 12 },
  uadd: { asso: Asso.RTL, left: false, right: true, prec: 15 },
  sub: { asso: Asso.LTR, left: true, right: true, prec: 12 },
  usub: { asso: Asso.RTL, left: false, right: true, prec: 15 },
  mul: { asso: Asso.LTR, left: true, right: true, prec: 13 },
  mod: { asso: Asso.LTR, left: true, right: true, prec: 13 },
  // ptr: { asso: Asso.RTL, left: false, right: true, prec: 100000 },
  div: { asso: Asso.LTR, left: true, right: true, prec: 13 },
  wdiv: { asso: Asso.LTR, left: true, right: true, prec: 13 },
  pow: { asso: Asso.RTL, left: true, right: true, prec: 14 },
  geq: { asso: Asso.LTR, left: true, right: true, prec: 10 },
  leq: { asso: Asso.LTR, left: true, right: true, prec: 10 },
  lt: { asso: Asso.LTR, left: true, right: true, prec: 10 },
  gt: { asso: Asso.LTR, left: true, right: true, prec: 10 },
  eq: { asso: Asso.LTR, left: true, right: true, prec: 9 },
  neq: { asso: Asso.LTR, left: true, right: true, prec: 9 },
  not: { asso: Asso.RTL, left: false, right: true, prec: 15 },
  and: { asso: Asso.LTR, left: true, right: true, prec: 5 },
  or: { asso: Asso.LTR, left: true, right: true, prec: 4 },
  xor: { asso: Asso.LTR, left: true, right: true, prec: 4 },
  access_computed: { asso: Asso.LTR, left: true, right: true, prec: 18 },
  access_property: { asso: Asso.LTR, left: true, right: true, prec: 18 },
  access_call: { asso: Asso.LTR, left: true, right: true, prec: 18 },
  cast: { asso: Asso.LTR, left: true, right: true, prec: 10 },
  typeof: { asso: Asso.RTL, left: false, right: true, prec: 15 },
  delete: { asso: Asso.RTL, left: false, right: true, prec: 15 },
  in: { asso: Asso.LTR, left: true, right: true, prec: 10 },
  // as: { asso: Asso.LTR, left: true, right: true },
  decr: { asso: Asso.NA, left: true, right: false, prec: 16 },
  incr: { asso: Asso.NA, left: true, right: false, prec: 16 },
  range: { asso: Asso.LTR, left: true, right: true, prec: 11 },
} as const;

export const AssignmentToOperatorMap: { [key in OPERATOR]?: OPERATOR } = {
  add_assign: 'add',
  div_assign: 'div',
  mod_assign: 'mod',
  mul_assign: 'mul',
  pow_assign: 'pow',
  sub_assign: 'sub',
  wdiv_assign: 'wdiv',
};

export type OperatorSubmap = { [key in KEYWORD]?: OPERATOR };

export interface Token {
  kind: TokenKind;
  val: string;
  loc: Location;
}

export class Location {
  file: string;
  row: number;
  col: number;
  length: number;
  constructor(loc: { file: string; row: number; col: number; length: number }) {
    this.file = loc.file;
    this.row = loc.row;
    this.col = loc.col;
    this.length = loc.length;
  }

  format(): string {
    if (this.file === BUILTIN_KWORD) return BUILTIN_KWORD;
    if (this.file === COMPUTED_KWORD) return COMPUTED_KWORD;
    return `${this.file}:${this.row}:${this.col}`;
  }

  static get computed() {
    return new Location({ col: -1, row: -1, file: COMPUTED_KWORD, length: -1 });
  }

  static get std() {
    return new Location({ col: -1, row: -1, file: BUILTIN_KWORD, length: -1 });
  }
}

export enum TokenKind {
  literal_string = 'string',
  literal_format_string = 'f_string',
  literal_number_int = 'int',
  literal_number_flt = 'float',
  literal_lang = 'lang',
  keyword = 'kw',
  identifier = 'ident',
  comment = 'comment',
}

export interface VSCType {
  readonly display: string;
  readonly construct: FunctionValueNode;
  readonly object: LanguageObject;
}

export interface BranchParameters {
  return_type: TypeNode;
  variable_types: Map<number, TypeNode>;
}

export interface TypeCheckResult {
  success: boolean;
  found_return:
    | false
    | {
        success: boolean;
        partial: boolean;
        return_type: TypeNode | undefined;
        is_needed: boolean;
      };
  type_constraints: Map<number, TypeNode> | undefined;
}
