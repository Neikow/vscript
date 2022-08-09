import { parse } from '../parser/index';
import {
  ContextNode,
  ContextType, NodeType as NT
} from './nodes';


import { lexer } from '../lexer';
import { collapse } from './collapse';
import { compiler } from './compiler';
import { interpreter } from './interpreter';
import { typeChecker } from './type_check';

export class SyntaxTree {
  root: ContextNode;

  collapsed = false;
  type_checked = false;

  constructor(file: string, body: string) {
    const tokens = lexer(file, body);

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
    this.type_checked = typeChecker(this).success;
    return this.type_checked;
  }

  execute() {
    interpreter(this);
  }

  compile(path: string) {
    return compiler(this, path);
  }
}
