import { lex } from '../lexer';
import { parse } from '../parser/index';
import {
  ContextNode,
  ContextType, NodeType as NT
} from '../syntax_tree_nodes';


import { compile } from './compile';
import { collapse } from './collapse';
import { execute } from './execute';
import { type_check } from './type_check';

export class SyntaxTree {
  root: ContextNode;

  collapsed = false;
  type_checked = false;

  constructor(file: string, body: string) {
    const tokens = lex(file, body);

    const context = parse(tokens, {
      NT: NT.context,
      id: 0,
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
