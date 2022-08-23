import { writeFileSync } from 'fs';
import { SyntaxTree } from '../ast';
import {
  ContextNode,
  DefinitionType as DT,
  FunctionNode,
  Node,
  NodeType as NT,
  NumberLiteralNode,
  NumericalValueNode,
  SingleTypeNode,
} from '../ast/nodes';
import { Errors } from '../errors';
import { Types } from '../std/types';
import TypeHelper from '../types/helper';
import {
  LanguageObject,
  LanguageObjectInstance,
  LanguageObjectKind,
} from '../types/objects';
import { INFINITY, Location, NAN, OPERATOR } from '../types/types';
import { CompilerIO } from './compiler_io';
import { Instructions } from './instructions';
import { FunctionManger } from './objects/function_manager';
import { StringManager } from './objects/string_manager';
import { ErrorManager } from './std/error_manager';

export interface ParseResult {
  before: string;
  call: string;
  on_update: string;
  pointer_offset?: number;
  operation?: OPERATOR;
}

export interface Assembly {
  header: string;
  text: string;
  functions: string;
  data: string;
  rodata: string;
  bss: string;
}

export interface ExpressionParser {
  (
    node: Node,
    parent_context: ContextNode,
    register: typeof Instructions.prototype.registers[number],
    should_push: boolean
  ): ParseResult[];
}

export function compiler(tree: SyntaxTree, path: string) {
  if (!tree.collapsed) tree.collapse();
  if (!tree.type_check()) throw Errors.CompilerError('Type-check failed');

  const options = {
    memory: {
      size: 1024 * 1024, // 1MB
    },
  };

  const I = new Instructions();
  const counter = I.counter;

  const asm: Assembly = {
    header:
      '; --------------------------\n' +
      ';     Generated assembly    \n' +
      '; --------------------------\n' +
      "\n%include\t'utils.asm'\n" +
      "\n%include\t'std/types.asm'\n" +
      "\n%include\t'std/errors.asm'\n",
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
      '\n',
    functions: '',
    rodata: '',
    data: 'brk_init: dq 0x0\n' + 'brk_curr: dq 0x0\n',
    bss: 'output_buffer: resb 512\n',
  };

  const IO = new CompilerIO(I, parseExpression);

  const functions = new FunctionManger(asm, I, traveller);
  const strings = new StringManager(asm, I);

  const errors = new ErrorManager();

  function makeLiteral(literal: string) {
    asm.rodata += `str_${literal}: db '${literal}'\n`;
    asm.data += `lit_${literal}: dq '0x0'\n`;

    asm.text +=
      I.mov('rcx', `${literal.length}`, 'literal length') +
      I.mov('rdx', `str_${literal}`, 'literal string') +
      I.call('string_make') +
      I.mov(`[lit_${literal}]`, 'rax') +
      '\n';
  }

  makeLiteral('null');
  makeLiteral('true');
  makeLiteral('false');

  errors.new({
    code: 1,
    label: 'out_of_bounds',
    description: 'The given index is outside the bounds of the array.',
    display: 'Error [Out Of Bounds]',
  });

  asm.text +=
    '\n\n' +
    traveller(tree.root, tree.root) +
    I.xor('rcx', 'rcx', '0 exit code') +
    I.call('exit');

  errors.compile(asm, I, 'asm/std/errors.asm');

  writeFileSync(
    path,
    asm.header +
      asm.text +
      asm.functions +
      (asm.rodata === '' ? '' : '\nsection .rodata\n') +
      asm.rodata +
      (asm.data === '' ? '' : '\nsection .data\n') +
      asm.data +
      (asm.bss === '' ? '' : '\nsection .bss\n') +
      asm.bss
  );

  function toFunctionArguments(
    args: ParseResult[],
    populate_implicit_arg: boolean
  ): string {
    let res = '';
    const registers = ['rcx', 'rdx', 'r8', 'r9'] as const;

    const offset = populate_implicit_arg ? 0 : 1;

    for (
      let i = offset;
      i < Math.min(registers.length, args.length + offset);
      i++
    ) {
      res += args[i - offset].before + I.pop(registers[i]);
    }

    if (args.length + offset > registers.length) {
      for (let i = args.length - 1; i > 4 - offset; i--) {
        res += args[i].before;
      }
    }

    return res;
  }

  function parseExpression(
    node: Node,
    parent_context: ContextNode,
    register: typeof I.registers[number],
    should_push: boolean
  ): ParseResult[] {
    switch (node.NT) {
      case NT.expression: {
        return parseExpression(
          node.member!,
          parent_context,
          register,
          should_push
        );
      }
      case NT.literal_boolean: {
        return [
          {
            before:
              I.push('rcx') +
              I.mov('rcx', node.value ? '1' : '0', 'bool value') +
              I.call('bool_make') +
              I.pop('rcx') +
              (should_push ? I.push('rax') : ''),
            call: '',
            on_update: '',
          },
        ];
      }
      case NT.literal_string: {
        return [
          {
            before:
              strings.add(node.value).before +
              (should_push ? I.push('rax') : ''),
            call: '',
            on_update: '',
          },
        ];
      }
      case NT.literal_number: {
        if (node.value_type !== Types.u64.object)
          throw Errors.NotImplemented(node.value_type.display_name);
        return [
          {
            before:
              I.push('rcx') +
              I.mov('rcx', `${node.value}`) +
              I.call('u64_make') +
              I.pop('rcx') +
              (should_push ? I.push('rax') : ''),
            call: '',
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
                  (should_push
                    ? I.push(register, `= &${node.definition.name}`)
                    : ''),
                call: '',
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
          case 'and': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
            if (right.length > 1) throw Errors.NotImplemented();

            if (l_type.NT !== NT.type_single || r_type.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof l_type.type === 'string') throw Errors.NotImplemented();
            if (l_type.type !== r_type.type) throw Errors.NotImplemented();

            if (
              l_type.type.kind === LanguageObjectKind.instance ||
              r_type.type.kind === LanguageObjectKind.instance
            )
              throw Errors.NotImplemented();

            if (l_type.type === Types.bool.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('bool_and') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            }
          }
          case 'or': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
            if (right.length > 1) throw Errors.NotImplemented();

            if (l_type.NT !== NT.type_single || r_type.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof l_type.type === 'string') throw Errors.NotImplemented();
            if (l_type.type !== r_type.type) throw Errors.NotImplemented();

            if (
              l_type.type.kind === LanguageObjectKind.instance ||
              r_type.type.kind === LanguageObjectKind.instance
            )
              throw Errors.NotImplemented();

            if (l_type.type === Types.bool.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('bool_or') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            }
          }
          case 'xor': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
            if (right.length > 1) throw Errors.NotImplemented();

            if (l_type.NT !== NT.type_single || r_type.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof l_type.type === 'string') throw Errors.NotImplemented();
            if (l_type.type !== r_type.type) throw Errors.NotImplemented();

            if (
              l_type.type.kind === LanguageObjectKind.instance ||
              r_type.type.kind === LanguageObjectKind.instance
            )
              throw Errors.NotImplemented();

            if (l_type.type === Types.bool.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('bool_xor') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            }
          }
          case 'not': {
            if (node.left) throw Errors.CompilerError();
            if (!node.right) throw Errors.CompilerError();
            const r_type = TypeHelper.getType(node.right, undefined);
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
            if (right.length > 1) throw Errors.NotImplemented();

            if (r_type.NT !== NT.type_single) throw Errors.CompilerError();
            if (typeof r_type.type === 'string') throw Errors.NotImplemented();

            if (r_type.type === Types.bool.object) {
              return [
                {
                  before:
                    right[0].before +
                    I.pop('rcx') +
                    I.call('bool_not') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            }
          }
          case 'add': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
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
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            } else if (l_type.type === Types.u64.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('u64_add_u64') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            } else {
              throw Errors.NotImplemented(TypeHelper.formatType(l_type));
            }
          }
          case 'sub': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
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

            if (l_type.type === Types.u64.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('u64_sub_u64') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
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
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
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

            throw Errors.NotImplemented('should_push');

            // if (l_type.type === Types.string.object) {
            //   return [
            //     {
            //       before:
            //         left[0].before +
            //         right[0].before +
            //         I.pop('rdx') +
            //         I.pop('rcx') +
            //         I.call('string_concat') +
            //         I.inc('qword [rax + 1 * 8]') +
            //         left[0].on_update,
            //       on_update: '',
            //     },
            //   ];
            // } else {
            //   throw Errors.NotImplemented(TypeHelper.formatType(l_type));
            // }
          }
          case 'mul': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const l_type = TypeHelper.getType(node.left, undefined);
            const r_type = TypeHelper.getType(node.right, undefined);
            const left = parseExpression(
              node.left,
              parent_context,
              'rax',
              true
            );
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              'rbx',
              true
            );
            if (right.length > 1) throw Errors.NotImplemented();

            if (l_type.NT !== NT.type_single || r_type.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof l_type.type === 'string') throw Errors.NotImplemented();
            if (
              l_type.type === Types.string.object &&
              r_type.type === Types.u64.object
            ) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.mov('rdx', '[rdx + 2 * 8]') +
                    I.pop('rcx') +
                    I.call('string_repeat') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            }

            if (l_type.type !== r_type.type) throw Errors.NotImplemented();

            if (
              l_type.type.kind === LanguageObjectKind.instance ||
              r_type.type.kind === LanguageObjectKind.instance
            )
              throw Errors.NotImplemented();

            if (l_type.type === Types.u64.object) {
              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.pop('rcx') +
                    I.call('u64_mul_u64') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            } else {
              throw Errors.NotImplemented(TypeHelper.formatType(l_type));
            }
          }
          case 'access_property': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            if (node.right.NT !== NT.property_node)
              throw Errors.CompilerError();

            if (
              node.left.NT === NT.operator &&
              node.left.op === 'access_property'
            )
              throw Errors.NotImplemented('access operator expression');

            if (node.left.NT !== NT.reference) throw Errors.CompilerError();

            const [ref, stack] = TypeHelper.getPropertyStack(node);

            if (ref.definition.type?.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof ref.definition.type.type === 'string')
              throw Errors.NotImplemented();

            const res = parseExpression(
              node.left,
              parent_context,
              register,
              true
            );

            if (res.length > 1) throw Errors.NotImplemented('tuples');

            if (stack.length > 1) throw Errors.CompilerError();

            if (ref.definition.type.type === Types.string.object) {
              if (stack[0] === 'length')
                return [
                  {
                    before:
                      res[0].before +
                      I.pop('rax') +
                      I.mov('rcx', '[rax + 2 * 8]', 'string length') +
                      I.call('u64_make', 'convert length to object') +
                      (should_push ? I.push('rax') : ''),
                    call: '',
                    on_update: '',
                  },
                ];
            } else if (
              ref.definition.type.type.kind === LanguageObjectKind.instance &&
              ref.definition.type.type.object === Types.array.object
            ) {
              if (stack[0] === 'length') {
                return [
                  {
                    before:
                      res[0].before +
                      I.pop('rax') +
                      I.mov('rcx', '[rax + 3 * 8]', 'array length') +
                      I.call('u64_make', 'convert length to object') +
                      (should_push ? I.push('rax') : ''),
                    call: '',
                    on_update: '',
                  },
                ];
              } else if (stack[0] === 'push') {
                return [
                  {
                    before: res[0].before,
                    call: 'array_push',
                    on_update: '',
                  },
                ];
              } else if (stack[0] === 'pop') {
                return [
                  {
                    before: res[0].before,
                    call: 'array_pop',
                    on_update: '',
                  },
                ];
              }
            } else {
              throw Errors.NotImplemented(
                `${ref.definition.name} of type ${TypeHelper.formatType(
                  ref.definition.type
                )} with property stack: '${stack}'`
              );
            }
          }
          case 'access_call': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            if (node.left.NT === NT.operator) {
              if (node.left.op !== 'access_property')
                throw Errors.NotImplemented();
              const left = parseExpression(
                node.left,
                parent_context,
                'rcx',
                false
              );
              if (left.length > 1) throw Errors.CompilerError();

              const right = parseExpression(
                node.right,
                parent_context,
                'rax',
                true
              );

              const args = toFunctionArguments(right, false);
              return [
                {
                  before:
                    left[0].before +
                    args +
                    I.call(left[0].call) +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: '',
                },
              ];
            }

            throw Errors.NotImplemented(node.left.NT);
          }
          case 'access_computed': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            const left_type = TypeHelper.getType(node.left, undefined);

            if (left_type.NT !== NT.type_single) throw Errors.CompilerError();
            if (typeof left_type.type === 'string')
              throw Errors.CompilerError();
            if (
              left_type.type.kind !== LanguageObjectKind.instance ||
              left_type.type.object !== Types.array.object
            )
              throw Errors.NotImplemented();

            if (node.left.NT === NT.reference) {
              const left = parseExpression(
                node.left,
                parent_context,
                'rcx',
                false
              );
              if (left.length > 1) throw Errors.CompilerError();

              const right = parseExpression(
                node.right,
                parent_context,
                'rdx',
                true
              );

              if (right.length > 1) throw Errors.NotImplemented();

              return [
                {
                  before:
                    left[0].before +
                    right[0].before +
                    I.pop('rdx') +
                    I.call('array_access') +
                    (should_push ? I.push('rax') : ''),
                  call: '',
                  on_update: I.call('array_update'),
                },
              ];
            }

            throw Errors.NotImplemented(node.left.NT);
          }
          case 'assign': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            const left = parseExpression(
              node.left,
              parent_context,
              register,
              false
            );
            if (left.length > 1) throw Errors.NotImplemented();

            const right = parseExpression(
              node.right,
              parent_context,
              register,
              true
            );
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  left[0].before +
                  right[0].before +
                  I.pop('r8') +
                  left[0].on_update +
                  (should_push ? I.push('rax') : ''),
                call: '',
                on_update: '',
              },
            ];
          }

          default: {
            throw Errors.NotImplemented(node.op);
          }
        }
      }
      case NT.array: {
        const len_prop = node.value_type!.value_properties!.get(
          'length'
        ) as NumericalValueNode;
        if (len_prop === undefined) throw Errors.CompilerError();
        const len_string = TypeHelper.getLiteralValue(len_prop).value;
        if (len_string === NAN || len_string === INFINITY)
          throw Errors.CompilerError();

        const array_length = parseInt(len_string as string);

        let value =
          I.mov('rdx', '[brk_curr]', 'array base') +
          I.mov('rdi', 'rdx') +
          I.add('rdi', `${array_length} * 8`, 'allocate space for the array') +
          I.mov('[brk_curr]', 'rdi') +
          I.mov('rcx', `${array_length}`) +
          I.call('array_make') +
          I.push('rax', 'array address') +
          I.mov('rdi', 'rdx') +
          '\n' +
          '\t; initial values\n';

        for (let i = 0; i < node.list!.members.length; i++) {
          const type = TypeHelper.getType(node.list!.members[i], undefined);
          if (type.NT !== NT.type_single || typeof type.type === 'string')
            throw Errors.NotImplemented();

          if (type.type !== Types.u64.object) throw Errors.NotImplemented();

          const val = parseExpression(
            node.list!.members[i],
            parent_context,
            'rax',
            false
          );

          if (val.length > 1) throw Errors.CompilerError();
          value += val[0].before + I.mov(`[rdi + ${i} * 8]`, 'rax') + '\n';
        }

        value += I.pop('rax') + I.push('rax');

        value += I.mov(
          'qword [rax + 3 * 8]',
          `${node.list!.members.length}`,
          'initial size'
        );

        return [
          {
            before: value,
            on_update: '',
            call: '',
          },
        ];
      }
      case NT.expression_list: {
        let res: ParseResult[] = [];
        for (const member of node.members) {
          let list_member = parseExpression(
            member,
            parent_context,
            register,
            should_push
          );
          if (list_member.length > 1)
            throw Errors.NotImplemented('Nested lists');
          res.push(list_member[0]);
        }
        return res;
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
        const val = parseExpression(node, parent_context, 'rax', false);
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

            let value = parseExpression(
              node.value,
              parent_context,
              'rax',
              true
            );
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
      // case NT.statement_while: {
      //   let id = counter.getStatementID(node.NT);

      //   const label_success = `while${id}`;
      //   const label_fail = `end_while${id}`;

      //   if (!node.child) throw Errors.CompilerError();
      //   if (!node.condition) throw Errors.CompilerError();

      //   const body = aux(node.child, node.child);

      // }
      default:
        throw Errors.NotImplemented(node.NT);
    }
  }
}
