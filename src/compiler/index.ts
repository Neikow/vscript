import { writeFileSync } from 'fs';
import { SyntaxTree } from '../ast';
import {
  ContextNode,
  DefinitionType as DT,
  FunctionNode,
  Node,
  NodeType as NT,
  SingleTypeNode,
} from '../ast/nodes';
import { Errors } from '../errors';
import { Types } from '../std/types';
import TypeHelper from '../types/helper';
import { LanguageObjectKind } from '../types/objects';
import { Location, OPERATOR } from '../types/types';
import { CompilerIO } from './compiler_io';
import { Instructions } from './instructions';
import { FunctionManger } from './objects/function_manager';
import { StringManager } from './objects/string_manager';

export interface ParseResult {
  before: string;
  // middle: string;
  // after: string;
  on_update: string;
  pointer_offset?: number;
  operation?: OPERATOR;
}

export interface ExpressionParser {
  (
    node: Node,
    parent_context: ContextNode,
    register: typeof Instructions.prototype.registers[number]
  ): ParseResult[];
}

export function compiler(tree: SyntaxTree, path: string) {
  if (!tree.collapsed) tree.collapse();
  if (!tree.type_check()) throw Errors.CompilerError('Type-check failed');

  const options = {
    memory: {
      size: 16384, // 16kB
    },
  };

  const I = new Instructions();
  const counter = I.counter;

  const asm = {
    header:
      '; --------------------------\n' +
      ';     Generated assembly    \n' +
      '; --------------------------\n' +
      "\n%include\t'utils.asm'\n" +
      "\n%include\t'std/types/strings.asm'\n",
    text:
      '\nsection .text\n' +
      'global  _start\n' +
      '\n_start:\n' +
      I.xor('rax', 'rax') +
      I.xor('rbx', 'rbx') +
      I.xor('rcx', 'rcx') +
      I.xor('rdx', 'rdx') +
      I.mov('rbp', 'rsp', 'save program base pointer') +
      I.push('rbp') +
      '\n; Memory Allocation\n' +
      I.mov('rcx', `${options.memory.size}`) +
      I.call('memalloc') +
      '\n\n',
    functions: '',
    data: 'brk_init: dq 0x0\n' + 'brk_curr: dq 0x0\n' + 'brk_new: dq 0x0\n\n',
    bss: 'output_buffer: resb 128\n',
  };

  const IO = new CompilerIO(I, parseExpression);

  const functions = new FunctionManger(asm, I, traveller);
  const strings = new StringManager(asm, I);

  asm.text +=
    traveller(tree.root, tree.root) +
    I.xor('rcx', 'rcx', '0 exit code') +
    I.call('exit');

  writeFileSync(
    path,
    asm.header +
      asm.text +
      asm.functions +
      (asm.data === '' ? '' : '\nsection .data\n') +
      asm.data +
      (asm.bss === '' ? '' : '\nsection .bss\n') +
      asm.bss
  );

  function parseExpression(
    node: Node,
    parent_context: ContextNode,
    register: typeof I.registers[number]
  ): ParseResult[] {
    switch (node.NT) {
      case NT.expression: {
        return parseExpression(node.member!, parent_context, register);
      }
      case NT.literal_string: {
        const val = strings.add(node.value);

        return [
          {
            before: val.before,
            on_update: '',
          },
        ];
      }
      case NT.reference: {
        if (!node.definition.type || node.definition.type!.NT === NT.type_raw)
          throw Errors.CompilerError();

        if (
          node.definition.type.NT === NT.type_union ||
          node.definition.type.NT === NT.type_tuple
        )
          throw Errors.NotImplemented(node.definition.type.NT);

        if (typeof node.definition.type.type == 'string')
          throw Errors.NotImplemented('string type');

        if (node.definition.type.type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented(LanguageObjectKind.instance);

        const ARGUMENTS_OFFSET = 2;

        switch (node.definition.DT) {
          case DT.var: {
            if (node.definition.type_check_id === undefined)
              throw Errors.CompilerError();

            if (
              node.definition.global_offset === undefined ||
              node.definition.local_offset === undefined ||
              node.definition.definition_depth === undefined
            )
              throw Errors.CompilerError();

            let address: string;

            const current_function =
              counter.functions_stack[counter.functions_stack.length - 1];

            if (node.definition.context!.id === parent_context.id) {
              address = `[rbp - ${
                node.definition.local_offset -
                counter.functions_stack.length +
                (current_function ? current_function.arguments.length : 0)
              } * 8]`;
            } else {
              const global_arg_count = counter.functions_stack
                .map((v) => v.arguments.length)
                .reduce((p, c) => p + c, 0);
              const depth =
                counter.functions_stack.length -
                node.definition.definition_depth;
              const global_offset = counter.offsets_stack.reduce(
                (p, c) => p + c,
                0
              );

              address = `[rbp + ${
                global_arg_count +
                depth * ARGUMENTS_OFFSET +
                global_offset -
                node.definition.global_offset
              } * 8]`;
            }

            return [
              {
                before:
                  I.mov(register, address) +
                  I.push(register, `= &${node.definition.name}`),
                on_update: I.mov(address, register),
              },
            ];
          }
          default:
            throw Errors.NotImplemented(node.definition.DT);
        }
      }
      case NT.operator: {
        switch (node.op) {
          case 'add': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(node.left, parent_context, 'rax');
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, parent_context, 'rbx');
            if (right.length > 1) throw Errors.NotImplemented();

            if (l_type.NT !== NT.type_single || r_type.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof l_type.type === 'string') throw Errors.NotImplemented();
            if (l_type.type !== r_type.type) throw Errors.CompilerError();

            if (
              l_type.type.kind === LanguageObjectKind.instance ||
              r_type.type.kind === LanguageObjectKind.instance
            )
              throw Errors.NotImplemented();

            if (l_type.type === Types.string.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('string_concat') +
                    I.push('rax'),
                  on_update: '',
                },
              ];
            } else {
              throw Errors.NotImplemented(TypeHelper.formatType(l_type));
            }
          }
          case 'add_assign': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(node.left, parent_context, 'rax');
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, parent_context, 'rbx');
            if (right.length > 1) throw Errors.NotImplemented();

            if (l_type.NT !== NT.type_single || r_type.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof l_type.type === 'string') throw Errors.NotImplemented();
            if (l_type.type !== r_type.type) throw Errors.CompilerError();

            if (
              l_type.type.kind === LanguageObjectKind.instance ||
              r_type.type.kind === LanguageObjectKind.instance
            )
              throw Errors.NotImplemented();

            if (l_type.type === Types.string.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('string_concat') +
                    I.inc('qword [rax + 1 * 8]') +
                    left[0].on_update,
                  on_update: '',
                },
              ];
            } else {
              throw Errors.NotImplemented(TypeHelper.formatType(l_type));
            }
          }
          default: {
            throw Errors.NotImplemented(node.op);
          }
        }
      }
      default:
        throw Errors.NotImplemented(node.NT);
    }
  }

  function traveller(node: Node, parent_context: ContextNode): string {
    switch (node.NT) {
      case NT.context: {
        let code = '';
        for (const child of node.members) {
          code += traveller(child, node);
        }
        return code;
      }
      case NT.expression: {
        const val = parseExpression(node, parent_context, 'rax');
        if (val.length > 1) throw Errors.NotImplemented('tuples');
        return val[0].before;
      }
      case NT.definition: {
        switch (node.DT) {
          case DT.function: {
            functions.add(node);
            return '';
          }
          case DT.var: {
            if (!node.value) throw Errors.NotImplemented();

            let value = parseExpression(node.value, parent_context, 'rax');
            if (value.length > 1) throw Errors.NotImplemented('tuple');

            if (node.type_check_id === undefined)
              throw Errors.CompilerError(`${node.name} has no type_check_id`);

            if (node.type.NT !== NT.type_single)
              throw Errors.NotImplemented(node.type.NT);
            if (typeof node.type.type === 'string')
              throw Errors.NotImplemented('string type');

            node.global_offset = counter.global_stack_offset;
            node.local_offset = counter.local_stack_offset;
            node.definition_depth = counter.functions_stack.length;

            return value[0].before + I.inc('qword [rax + 1 * 8]') + '\n';
          }
          default:
            throw Errors.NotImplemented(node.DT);
        }
      }
      case NT.statement_debug: {
        const expression_type = TypeHelper.getType(node.member!, undefined);
        if (expression_type.NT === NT.type_union) {
          throw Errors.NotImplemented(expression_type.NT);
        }

        if (expression_type.NT === NT.type_single) {
          if (typeof expression_type.type === 'string')
            throw Errors.NotImplemented(TypeHelper.formatType(expression_type));
          if (expression_type.type.kind === LanguageObjectKind.instance)
            throw Errors.NotImplemented(LanguageObjectKind.instance);

          return IO.stdout(node.member!, expression_type, parent_context);
        }

        if (!node.member || node.member.NT !== NT.expression_list)
          throw Errors.CompilerError();

        let code = '\t; statement_debug (tuple)\n';

        for (let i = 0; i < expression_type.types.length - 1; i++) {
          if (expression_type.types[i].NT !== NT.type_single)
            throw Errors.NotImplemented(expression_type.types[i].NT);

          code += IO.stdout(
            node.member.members[i],
            <SingleTypeNode>expression_type.types[i],
            parent_context,
            false,
            false
          );

          code += IO.stdout(
            {
              NT: NT.literal_string,
              value: ' ',
              location: Location.computed,
              value_type: Types.string.object,
            },
            { NT: NT.type_single, type: Types.string.object },
            parent_context,
            false,
            false
          );
        }

        if (
          expression_type.types[expression_type.types.length - 1].NT !==
          NT.type_single
        )
          throw Errors.NotImplemented(
            expression_type.types[expression_type.types.length - 1].NT
          );

        code += IO.stdout(
          node.member.members[expression_type.types.length - 1],
          <SingleTypeNode>(
            expression_type.types[expression_type.types.length - 1]
          ),
          parent_context,
          true,
          false
        );

        return code;
      }
      default:
        throw Errors.NotImplemented(node.NT);
    }
  }
}
