import { ExpressionParser, ParseResult } from '.';
import { ContextNode, Node, SingleTypeNode } from '../ast/nodes';
import { Errors } from '../errors';
import { Types } from '../std/types';
import TypeHelper from '../types/helper';
import { LanguageObjectKind } from '../types/objects';
import { Instructions } from './instructions';

export class CompilerIO {
  readonly expressionParser: ExpressionParser;
  readonly instructions: Instructions;
  constructor(instructions: Instructions, parser: ExpressionParser) {
    this.expressionParser = parser;
    this.instructions = instructions;
  }

  stdout(
    node: Node,
    type_node: SingleTypeNode,
    parent_context: ContextNode,
    line_feed: boolean = true,
    comment: boolean = true
  ): string {
    if (typeof type_node.type === 'string') throw Errors.CompilerError();

    // if (type_node.type.is_struct) {
    //   if (type_node.type.kind !== LanguageObjectKind.object)
    //     throw Errors.NotImplemented();
    //   if (!type_node.type.properties) throw Errors.CompilerError();

    //   const res = this.expressionParser(node, parent_context, 'ebx');

    // }

    switch (type_node.type) {
      case Types.string.object: {
        const res = this.expressionParser(node, parent_context, 'rax');
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before } = res[0];

        // if (middle === '') throw Errors.CompilerError('Missing value to log');

        return (
          (comment ? `\t; statement_debug (str)\n` : '') +
          before +
          this.instructions.pop('rsi') +
          this.instructions.mov('rdx', '[rsi + 16]', 'string length') +
          this.instructions.mov('rcx', '[rsi + 24]', 'char array pointer') +
          this.instructions.call(line_feed ? 'sprintLF' : 'sprint') +
          '\n'
        );
      }
      default:
        throw Errors.NotImplemented(TypeHelper.formatType(type_node));
    }
  }
}
