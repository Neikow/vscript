import { ExpressionParser, ParseResult } from '.';
import { ContextNode, Node, NodeType, SingleTypeNode } from '../ast/nodes';
import { Errors } from '../errors';
import { Types } from '../std/types';
import TypeHelper from '../types/helper';
import {
  LanguageObject,
  LanguageObjectInstance,
  LanguageObjectKind,
} from '../types/objects';
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

    if (type_node.type.kind === LanguageObjectKind.instance) {
      switch (type_node.type.object) {
        case Types.array.object: {
          const res = this.expressionParser(node, parent_context, 'rcx', false);
          if (res.length > 1) throw Errors.NotImplemented('tuples');

          const { before } = res[0];

          const member_type = (
            type_node.type.type_properties as Map<
              string,
              LanguageObjectInstance | LanguageObject
            >
          ).get('type');
          if (!member_type) throw Errors.CompilerError();
          let printing_function: string;
          switch (member_type) {
            case Types.bool.object:
              printing_function = 'bool_stdout';
              break;
            case Types.u64.object:
              printing_function = 'u64_stdout';
              break;
            case Types.string.object:
              printing_function = 'string_stdout';
              break;
            default:
              throw Errors.NotImplemented(
                TypeHelper.formatType({
                  NT: NodeType.type_single,
                  type: member_type,
                })
              );
          }

          return (
            (comment ? `\t; statement_debug (array)\n` : '') +
            before +
            this.instructions.mov(
              'rdx',
              printing_function,
              'printing function address'
            ) +
            this.instructions.call('array_stdout') +
            (line_feed ? this.instructions.call('linefeed') : '') +
            '\n'
          );
        }
        default:
          throw Errors.NotImplemented(TypeHelper.formatType(type_node));
      }
    }

    switch (type_node.type) {
      case Types.string.object: {
        const res = this.expressionParser(node, parent_context, 'rcx', true);
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before } = res[0];

        // if (middle === '') throw Errors.CompilerError('Missing value to log');

        return (
          (comment ? `\t; statement_debug (str)\n` : '') +
          before +
          this.instructions.pop('rcx') +
          this.instructions.call('string_stdout') +
          (line_feed ? this.instructions.call('linefeed') : '') +
          '\n'
        );
      }
      case Types.u64.object: {
        const res = this.expressionParser(node, parent_context, 'rcx', true);
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before } = res[0];

        return (
          (comment ? `\t; statement_debug (int)\n` : '') +
          before +
          this.instructions.pop('rcx') +
          this.instructions.call('u64_stdout') +
          (line_feed ? this.instructions.call('linefeed') : '') +
          '\n'
        );
      }
      case Types.bool.object: {
        const res = this.expressionParser(node, parent_context, 'rcx', true);
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before } = res[0];

        return (
          (comment ? `\t; statement_debug (bool)\n` : '') +
          before +
          this.instructions.pop('rcx') +
          this.instructions.call('bool_stdout') +
          (line_feed ? this.instructions.call('linefeed') : '') +
          '\n'
        );
      }
      default:
        throw Errors.NotImplemented(TypeHelper.formatType(type_node));
    }
  }
}
