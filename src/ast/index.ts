import chalk from 'chalk';
import { Errors } from '../errors';
import { lex } from '../lexer';
import { Memory } from '../memory';
import { LanguageObject, LanguageObjectKind } from '../objects';
import { parse } from '../parser/index';
import {
  ContextNode,
  ContextType,
  DefinitionType as DT,
  StringLiteralValueNode,
  Node,
  NodeType as NT,
  OperatorNode,
  RawTypeNode,
  SingleTypeNode,
  StatementLabelNode,
  TypeNode,
  UnionTypeNode,
  ValueNode,
  BooleanLiteralNode,
  StringLiteralNode,
  NumberLiteralNode,
  DefinitionNodeVar,
  DefinitionNodeConst,
  ExpressionListNode,
  ExpressionNode,
  DefinitionNodeFunction,
} from '../syntax_tree_nodes';
import {
  BranchParameters,
  INFINITY,
  Location,
  NAN,
  NULL,
  TypeCheckResult,
  TYPE_ANY,
  TYPE_NEVER,
  TYPE_UNDEFINED,
  TYPE_UNKNOWN,
  TYPE_VOID,
} from '../types';

import { LanguageDefinition } from '../definitions';
import { Types } from '../std/types';
import TypeHelper from '../type_helper';
import { writeFileSync } from 'fs';

import { collapse } from './collapse';
import { type_check } from './type_check';
import { execute } from './execute';
import { compile } from './compile';

export class SyntaxTree {
  root: ContextNode;

  collapsed = false;
  type_checked = false;

  constructor(file: string, body: string) {
    const tokens = lex(file, body);

    const context = parse(tokens, {
      NT: NT.context,
      id: -1,
      type: ContextType.program,
      label: 'program',
      holder: undefined,
      definitions: new Map(),
      objects: new Map(),
      parent: undefined,
      members: [],
    });

    this.root = context;
  }

  collapse(): boolean {
    if (this.collapsed) return true;
    this.root = collapse(this.root);
    this.collapsed = true;
    return true;
  }

  type_check(): boolean {
    if (this.type_checked) return true;
    this.type_checked = type_check(this).success;
    return this.type_checked;
  }

  execute() {
    execute(this);
  }

  compile(path: string) {
    compile(this, path);
  }
}
