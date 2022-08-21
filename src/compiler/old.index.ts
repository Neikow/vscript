import { open, writeFileSync } from 'fs';
import { SyntaxTree } from '../ast';
import { Errors } from '../errors';
import {
  LanguageObject,
  LanguageObjectKind,
  ObjectProperty,
  PropertyKind,
} from '../types/objects';
import { Types } from '../std/types';
import {
  ComputableNode,
  ContextNode,
  ContextType,
  DefinitionNodeFunction,
  DefinitionNodeFunctionArgument,
  DefinitionType as DT,
  ExpressionListNode,
  ExpressionNode,
  FunctionNode,
  Node,
  NodeType as NT,
  SingleTypeNode,
  StructFieldDefinitionNode,
  StructFieldInstanceNode,
  StructInstanceNode,
  TypeNode,
} from '../ast/nodes';
import {
  INFINITY,
  Location,
  NAN,
  OPERATOR,
  OPERATORS,
  TYPE_VOID,
} from '../types/types';
import TypeHelper from '../types/helper';

export const compiler = (tree: SyntaxTree, path: string) => {
  if (!tree.collapsed) tree.collapse();
  if (!tree.type_check()) throw Errors.CompilerError('Type-check failed');

  // const stack_offsets: Map<number, number> = new Map();

  const offsets_stack: number[] = [];
  const functions_stack: FunctionNode[] = [];
  const functions_base_offset_stack: number[] = [];

  const increase_function_base_offsets = (count: number) => {
    for (let i = 0; i < functions_base_offset_stack.length; i++) {
      functions_base_offset_stack[i] += count;
    }
  };

  const decrease_function_base_offsets = (count: number) => {
    for (let i = 0; i < functions_base_offset_stack.length; i++) {
      functions_base_offset_stack[i] -= count;
    }
  };

  let local_stack_offset: number = 0;
  let global_stack_offset: number = 0;

  function ret(comment?: string) {
    local_stack_offset--;
    global_stack_offset--;
    return `\tret` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jmp(v: string, comment?: string) {
    return `\tjmp\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function call(v: string, comment?: string) {
    // Increment the stack offset only if the function deals with decrementing,
    // Builtin functions are hard coded and do not decrement the counters after execution.
    if (!['iprintLF', 'iprint', 'sprintLF', 'sprint', '_exit'].includes(v)) {
      local_stack_offset++;
      global_stack_offset++;
    }

    return `\tcall\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function pop(v: string, comment?: string) {
    local_stack_offset--;
    global_stack_offset--;

    decrease_function_base_offsets(1);

    return `\tpop\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function push(v: string, comment?: string) {
    local_stack_offset++;
    global_stack_offset++;

    increase_function_base_offsets(1);

    return `\tpush\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function mov(v1: string, v2: string, comment?: string) {
    const val = `mov\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
    // if (v1 == v2) return '\t; ' + val;
    if (v1 == v2) return '';
    return '\t' + val;
  }

  function lea(v1: string, v2: string, comment?: string) {
    // if (v1 == v2) return '\t; ' + val;
    return `\tlea\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function add(v1: string, v2: string, comment?: string) {
    return `\tadd\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function sub(v1: string, v2: string, comment?: string) {
    return `\tsub\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function mul(v: string, comment?: string) {
    return `\tmul\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function xor(v1: string, v2: string, comment?: string) {
    return `\txor\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function and(v1: string, v2: string, comment?: string) {
    return `\tand\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function or(v1: string, v2: string, comment?: string) {
    return `\tor\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function cmp(v1: string, v2: string, comment?: string) {
    return `\tcmp\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function dec(v: string, comment?: string) {
    return `\tdec\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function inc(v: string, comment?: string) {
    return `\tinc\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jge(v: string, comment?: string) {
    return `\tjge\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jle(v: string, comment?: string) {
    return `\tjle\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jg(v: string, comment?: string) {
    return `\tjg\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jl(v: string, comment?: string) {
    return `\tjl\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function je(v: string, comment?: string) {
    return `\tje\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jne(v: string, comment?: string) {
    return `\tjne\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  const base =
    '; --------------------------\n' +
    ';     Generated assembly    \n' +
    '; --------------------------\n' +
    "\n%include\t'functions.asm'\n" +
    "%include\t'macros.asm'\n";

  let text =
    '\nsection .text\n' +
    'global  _start\n' +
    '\n_start:\n' +
    xor('eax', 'eax') +
    xor('ebx', 'ebx') +
    xor('ecx', 'ecx') +
    xor('edx', 'edx') +
    mov('ebp', 'esp', 'save program base pointer') +
    push('ebp') +
    '\n';

  let functions = '';

  let data = '';

  let bss = '';

  const pointers = ['eax', 'ebx', 'ecx', 'edx'] as const;

  function offsetPointer(pointer: typeof pointers[number], offset: number) {
    const idx = pointers.indexOf(pointer);
    return pointers[(idx + offset) % pointers.length];
  }

  function parseExpression(
    node: Node,
    parent_context: ContextNode,
    pointer: typeof pointers[number]
  ): ParseResult[] {
    switch (node.NT) {
      case NT.expression: {
        return parseExpression(node.member!, parent_context, pointer);
      }
      case NT.operator: {
        switch (node.op) {
          case 'add': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const left = parseExpression(node.left, parent_context, pointer);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              offsetPointer(pointer, 1)
            );
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  right[0].before +
                  left[0].before +
                  pop('eax') +
                  pop('ebx') +
                  add('eax', 'ebx') +
                  push('eax'),
                middle: 'eax',
                after: '',
                on_update: '',
                address: '',
                operation: 'add',
              },
            ];
          }
          case 'sub': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            const left = parseExpression(node.left, parent_context, pointer);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(
              node.right,
              parent_context,
              offsetPointer(pointer, 1)
            );
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  right[0].before +
                  left[0].before +
                  pop('eax') +
                  pop('ebx') +
                  sub('eax', 'ebx') +
                  push('eax'),
                middle: 'eax',
                after: '',
                on_update: '',
                address: '',
                operation: 'sub',
              },
            ];
          }
          case 'mul': {
            throw Errors.NotImplemented();
            // if (!node.left || !node.right) throw Errors.CompilerError();
            // const left = parseExpression(node.left, parent_context, pointer);
            // if (left.length > 1) throw Errors.NotImplemented();
            // const right = parseExpression(
            //   node.right,
            //   parent_context,
            //   offsetPointer(pointer, 1)
            // );
            // if (right.length > 1) throw Errors.NotImplemented();

            // return [
            //   {
            //     before:
            //       left[0].before +
            //       right[0].before +
            //       mov('eax', left[0].middle) +
            //       mul(offsetPointer(pointer, 1)),
            //     middle: pointer,
            //     after: '',
            //     on_update: '',
            //     address: '',
            //     operation: 'mul',
            //   },
            // ];
          }
          case 'decr': {
            throw Errors.NotImplemented();
            // if (!node.left) throw Errors.CompilerError();
            // if (node.left.NT !== NT.reference)
            //   throw Errors.NotImplemented('non reference decr');

            // const val = parseExpression(node.left, parent_context, pointer);
            // if (val.length > 1) throw Errors.CompilerError();

            // return [
            //   {
            //     before: val[0].before,
            //     middle: val[0].middle,
            //     after: dec(val[0].middle) + val[0].on_update,
            //     on_update: '',
            //     address: '',
            //     operation: 'decr',
            //   },
            // ];
          }
          case 'incr': {
            if (!node.left) throw Errors.CompilerError();
            if (node.left.NT !== NT.reference)
              throw Errors.NotImplemented('non reference decr');

            const val = parseExpression(node.left, parent_context, pointer);
            if (val.length > 1) throw Errors.CompilerError();

            return [
              {
                before: val[0].before,
                middle: val[0].middle,
                after: pop(pointer) + inc(pointer) + val[0].on_update + '\n',
                on_update: '',
                address: '',
                operation: 'incr',
              },
            ];
          }
          case 'assign': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            const left = parseExpression(node.left, parent_context, pointer);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, parent_context, pointer);
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  left[0].before +
                  right[0].before +
                  left[0].after +
                  right[0].after,
                middle: pointer,
                after: '',
                on_update: left[0].on_update,
                address: '',
                operation: 'assign',
              },
            ];
          }
          case 'sub_assign': {
            throw Errors.NotImplemented();

            // if (!node.left || !node.right) throw Errors.CompilerError();

            // const left = parseExpression(node.left, parent_context, pointer);
            // if (left.length > 1) throw Errors.NotImplemented();
            // const right = parseExpression(
            //   node.right,
            //   parent_context,
            //   offsetPointer(pointer, 1)
            // );
            // if (right.length > 1) throw Errors.NotImplemented();

            // return [
            //   {
            //     before:
            //       left[0].before +
            //       right[0].before +
            //       sub(pointer, offsetPointer(pointer, 1)) +
            //       left[0].after +
            //       right[0].after,
            //     middle: pointer,
            //     after: '',
            //     on_update: left[0].on_update,
            //     address: '',
            //     operation: 'sub_assign',
            //   },
            // ];
          }
          case 'access_call': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            if (node.left.NT !== NT.reference) throw Errors.NotImplemented();
            if (node.left.definition.DT !== DT.function)
              throw Errors.NotImplemented();

            const left = parseExpression(node.left, parent_context, pointer);
            if (left.length > 1) throw Errors.CompilerError();
            const right = parseExpression(
              node.right,
              parent_context,
              offsetPointer(pointer, 1)
            );

            let before = '';
            before += left[0].before;
            for (
              let i = node.left.definition.value.arguments.length - 1;
              i >= 0;
              i--
            ) {
              if (node.left.definition.value.arguments[i].is_optional)
                throw Errors.NotImplemented('is_optional');
              if (i > right.length)
                before += push('0', 'optional arguments are set to `null`');
              else
                before +=
                  right[i].before +
                  // push(right[i].middle, `arg ${i}`) +
                  right[i].after;
            }
            const arg_count = node.left.definition.value.arguments.length;
            before +=
              call(left[0].middle) +
              add('esp', `${arg_count} * 4`, 'removes arguments from stack');

            decrease_function_base_offsets(arg_count);

            return [
              {
                before: before,
                middle: '',
                after: '',
                on_update: '',
                address: '',
                operation: 'access_call',
              },
            ];
          }
          case 'access_property': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            if (node.right.NT !== NT.property_node)
              throw Errors.CompilerError();

            if (
              node.left.NT === NT.operator &&
              node.left.op === 'access_property'
            ) {
              const [ref, stack] = TypeHelper.getPropertyStack(node);

              if (ref.definition.type?.NT !== NT.type_single)
                throw Errors.CompilerError();
              if (typeof ref.definition.type.type === 'string')
                throw Errors.NotImplemented();
              if (ref.definition.type.type.kind === LanguageObjectKind.instance)
                throw Errors.NotImplemented();

              const offset = TypeHelper.getPropertyOffset(
                ref.definition.type.type,
                stack
              );

              const res = parseExpression(ref, parent_context, pointer);

              if (res.length > 1) throw Errors.CompilerError();

              if (res[0].address === '') throw Errors.CompilerError();

              return [
                {
                  before:
                    res[0].before +
                    (offset
                      ? sub(
                          pointer,
                          `${offset}`,
                          'offsets the struct pointer to field'
                        )
                      : '') +
                    mov(
                      pointer,
                      `[${pointer}]`,
                      'dereferencing the field address'
                    ),
                  middle: pointer,
                  after: '',
                  on_update:
                    push(offsetPointer(pointer, 1)) +
                    mov(
                      offsetPointer(pointer, 1),
                      res[0].address,
                      'struct address'
                    ) +
                    mov(`[${offsetPointer(pointer, 1)} - ${offset}]`, pointer) +
                    pop(offsetPointer(pointer, 1)) +
                    '\n',
                  address: '',
                  operation: 'access_property',
                },
              ];
            }

            if (node.left.NT !== NT.reference) throw Errors.CompilerError();

            const [ref, stack] = TypeHelper.getPropertyStack(node);

            if (ref.definition.type?.NT !== NT.type_single)
              throw Errors.CompilerError();
            if (typeof ref.definition.type.type === 'string')
              throw Errors.NotImplemented();
            if (ref.definition.type.type.kind === LanguageObjectKind.instance)
              throw Errors.NotImplemented();

            const offset = TypeHelper.getPropertyOffset(
              ref.definition.type.type,
              stack
            );

            const res = parseExpression(node.left, parent_context, pointer);

            if (res.length > 1) throw Errors.NotImplemented();

            return [
              {
                ...res[0],
                pointer_offset: (res[0].pointer_offset ?? 0) + offset,
              },
            ];
          }
          default:
            throw Errors.NotImplemented(node.op);
        }
      }
      case NT.reference: {
        if (!node.definition.type || node.definition.type.NT === NT.type_raw)
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

        // accounts for return address and function base pointer
        const ARGUMENTS_OFFSET = 2;

        switch (node.definition.DT) {
          case DT.function: {
            return [
              {
                before: '',
                middle: `fn_${node.definition.name}${
                  node.definition.value.context!.id
                }`,
                after: '',
                on_update: '',
                address: '',
              },
            ];
          }
          case DT.function_argument: {
            const definition_index = functions_stack.findIndex(
              (func) =>
                func ==
                (<DefinitionNodeFunctionArgument>node.definition).function
            );

            let address: string;

            if (parent_context === node.definition.function.context) {
              address = `[ebp + ${
                node.definition.index + ARGUMENTS_OFFSET
              } * 4]`;
            } else {
              address = `[ebp + ${
                functions_base_offset_stack[definition_index] +
                functions_stack
                  .slice(definition_index)
                  .map((n) => n.arguments.length)
                  .reduce((p, n) => p + n, 0) +
                (functions_stack.length - 1) * ARGUMENTS_OFFSET +
                node.definition.index -
                1
              } * 4]`;
            }

            return [
              {
                before:
                  mov(pointer, address) +
                  push(pointer, `(${node.definition.name})`),
                middle: '',
                after: '',
                on_update: mov(address, pointer),
                address: address,
              },
            ];
          }
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
              functions_stack[functions_stack.length - 1];

            if (node.definition.context!.id === parent_context.id) {
              address = `[ebp - ${
                node.definition.local_offset -
                functions_stack.length +
                (current_function ? current_function.arguments.length : 0)
              } * 4]`;
            } else {
              const global_arg_count = functions_stack
                .map((v) => v.arguments.length)
                .reduce((p, c) => p + c, 0);
              const depth =
                functions_stack.length - node.definition.definition_depth;
              const global_offset = offsets_stack.reduce((p, c) => p + c, 0);

              address = `[ebp + ${
                global_arg_count +
                depth * ARGUMENTS_OFFSET +
                global_offset -
                node.definition.global_offset
              } * 4]`;
            }

            return [
              {
                before:
                  mov(pointer, address) +
                  push(pointer, `= ${node.definition.name}`),
                middle: '',
                after: '',
                on_update: mov(address, pointer),
                address: address,
              },
            ];
          }
          default:
            throw Errors.NotImplemented(node.definition.DT);
        }
      }
      case NT.expression_list: {
        let res: ParseResult[] = [];
        for (const member of node.members) {
          let list_member = parseExpression(member, parent_context, pointer);
          if (list_member.length > 1)
            throw Errors.NotImplemented('Nested lists');
          res.push(list_member[0]);
        }
        return res;
      }
      case NT.literal_number: {
        if (node.value === NAN || node.value === INFINITY)
          throw Errors.NotImplemented();
        if (node.value_type === Types.f64.object)
          throw Errors.NotImplemented('floats');
        return [
          {
            before: mov('eax', node.value) + push('eax'),
            middle: 'eax',
            after: '',
            on_update: '',
            address: '',
          },
        ];
      }
      case NT.literal_string: {
        const val = addLiteralString(node.value);

        return [
          {
            before: mov('eax', val) + push('eax'),
            middle: 'eax',
            after: '',
            on_update: '',
            address: '',
          },
        ];
      }

      case NT.special: {
        switch (node.value) {
          case 'dump_mem': {
            const range = 6;

            let val =
              mov('eax', addLiteralString(`>>> begin dump`)) + call('sprintLF');

            for (let i = -range; i < range + 1; i++) {
              val +=
                mov('eax', addLiteralString(`value at [ebp + ${i} * 4] : `)) +
                call('sprint') +
                mov('eax', `[ebp + ${i} * 4]`) +
                call('iprintLF');
            }

            return [
              {
                before: val,
                middle: addLiteralString(`>>> end dump`),
                after: '',
                on_update: '',
                address: '',
              },
            ];
          }
          default:
            throw Errors.NotImplemented(node.value);
        }
      }

      case NT.struct_instance: {
        let before =
          mov(pointer, 'esp', 'save struct base pointer') +
          sub(pointer, '4') +
          push(pointer);

        if (!node.object.value.is_struct) throw Errors.CompilerError();
        if (!node.object.value.properties) throw Errors.CompilerError();

        function expressionFromPropertyStack(
          struct: StructInstanceNode,
          property_stack: string[]
        ): ComputableNode {
          if (property_stack.length === 1) {
            const res = struct.fields.filter(
              (v) => v.name === property_stack[0]
            );
            if (res.length !== 1) throw Errors.NotImplemented();
            return res[0].value;
          }

          const res = struct.fields.filter((v) => v.name === property_stack[0]);
          if (res.length !== 1) throw Errors.NotImplemented();

          return expressionFromPropertyStack(
            <StructInstanceNode>(<ExpressionNode>res[0].value).member,
            property_stack.slice(1)
          );
        }

        function getValue(
          struct: StructInstanceNode,
          property_stack: string[]
        ): ParseResult {
          const val = parseExpression(
            expressionFromPropertyStack(struct, property_stack),
            parent_context,
            offsetPointer(pointer, 1)
          );

          if (val.length !== 1) throw Errors.NotImplemented();

          return {
            before: val[0].before,
            middle: '',
            after: '',
            on_update: '',
            address: '',
          };
        }

        function aux(field: ObjectProperty, property_stack: string[]): void {
          if (field.kind === PropertyKind.type) throw Errors.CompilerError();
          const type = field.type;
          if (type.NT === NT.type_raw) throw Errors.CompilerError();
          if (type.NT !== NT.type_single) throw Errors.NotImplemented();
          if (typeof type.type === 'string') throw Errors.NotImplemented();

          if (type.type.is_struct) {
            if (type.type.kind !== LanguageObjectKind.object)
              throw Errors.CompilerError();
            if (!type.type.properties) throw Errors.CompilerError();

            return type.type.properties.forEach((_field) =>
              aux(_field, property_stack.concat(field.name))
            );
          }

          const value = getValue(
            <StructInstanceNode>node,
            property_stack.concat(field.name)
          );

          before += value.before + value.after + value.on_update;
        }

        node.object.value.properties.forEach((prop) => aux(prop, []));

        return [
          {
            before: before,
            middle: pointer,
            after: '',
            on_update: '',
            address: '',
          },
        ];
      }

      default: {
        throw Errors.NotImplemented(node.NT);
      }
    }
  }

  let statements_counter: { [key: string]: number } = {};

  function parseCondition(
    node: ExpressionListNode | ExpressionNode,
    label_success: string,
    label_fail: string,
    parent_context: ContextNode,
    pointer: typeof pointers[number]
  ): ParseResult {
    if (node.NT === NT.expression_list)
      throw Errors.NotImplemented(NT.expression_list);

    function aux(
      node: Node,
      depth: number,
      pointer: typeof pointers[number]
    ): ParseResult {
      switch (node.NT) {
        case NT.expression: {
          if (!node.member) throw Errors.CompilerError('Missing expression');
          return aux(node.member, depth + 1, pointer);
        }
        case NT.literal_number: {
          if (node.value_type !== Types.u64.object)
            throw Errors.NotImplemented();
          if (node.value === NAN || node.value === INFINITY)
            throw Errors.NotImplemented();
          return {
            before: mov(pointer, node.value),
            middle: '',
            after: '',
            on_update: '',
            address: '',
          };
        }
        case NT.reference: {
          const res = parseExpression(node, parent_context, 'eax');
          if (res.length > 1) throw Errors.CompilerError();

          if (depth < 2) {
            return {
              before: res[0].before,
              middle: cmp(res[0].middle, '0') + je(label_fail),
              after: '',
              on_update: res[0].on_update,
              address: '',
            };
          }

          return {
            before: res[0].before,
            middle: res[0].middle,
            after: '',
            on_update: res[0].after,
            address: '',
          };
        }
        case NT.operator: {
          if (depth > 1) throw Errors.NotImplemented(depth.toString());
          switch (node.op) {
            case 'lt': {
              if (!node.left || !node.right) throw Errors.CompilerError();

              const left = aux(node.left, depth + 1, pointer);
              const right = aux(
                node.right,
                depth + 1,
                offsetPointer(pointer, 1)
              );

              return {
                before:
                  left.before +
                  right.before +
                  // mov(pointer, left.middle) +
                  // mov(offsetPointer(pointer, 1), right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp(pointer, offsetPointer(pointer, 1)) +
                  jge(label_fail),
                middle: '',
                after: '',
                on_update: '',
                address: '',
              };
            }
            case 'gt': {
              if (!node.left || !node.right) throw Errors.CompilerError();

              const left = aux(node.left, depth + 1, pointer);
              const right = aux(
                node.right,
                depth + 1,
                offsetPointer(pointer, 1)
              );

              return {
                before:
                  left.before +
                  right.before +
                  // mov('eax', left.middle) +
                  // mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp(pointer, offsetPointer(pointer, 1)) +
                  jle(label_fail),
                middle: '',
                after: '',
                on_update: '',
                address: '',
              };
            }

            case 'leq': {
              if (!node.left || !node.right) throw Errors.CompilerError();

              const left = aux(node.left, depth + 1, pointer);
              const right = aux(
                node.right,
                depth + 1,
                offsetPointer(pointer, 1)
              );

              return {
                before:
                  left.before +
                  right.before +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp(pointer, offsetPointer(pointer, 1)) +
                  jg(label_fail),
                middle: '',
                after: '',
                on_update: '',
                address: '',
              };
            }

            case 'geq': {
              if (!node.left || !node.right) throw Errors.CompilerError();

              const left = aux(node.left, depth + 1, pointer);
              const right = aux(
                node.right,
                depth + 1,
                offsetPointer(pointer, 1)
              );

              return {
                before:
                  left.before +
                  right.before +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp(pointer, offsetPointer(pointer, 1)) +
                  jl(label_fail),
                middle: '',
                after: '',
                on_update: '',
                address: '',
              };
            }

            case 'eq': {
              if (!node.left || !node.right) throw Errors.CompilerError();

              const left = aux(node.left, depth + 1, pointer);
              const right = aux(
                node.right,
                depth + 1,
                offsetPointer(pointer, 1)
              );

              return {
                before:
                  left.before +
                  right.before +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp(pointer, offsetPointer(pointer, 1)) +
                  jne(label_fail),
                middle: '',
                after: '',
                on_update: '',
                address: '',
              };
            }

            case 'neq': {
              if (!node.left || !node.right) throw Errors.CompilerError();

              const left = aux(node.left, depth + 1, pointer);
              const right = aux(
                node.right,
                depth + 1,
                offsetPointer(pointer, 1)
              );

              return {
                before:
                  left.before +
                  right.before +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp(pointer, offsetPointer(pointer, 1)) +
                  je(label_fail),
                middle: '',
                after: '',
                on_update: '',
                address: '',
              };
            }
            default: {
              throw Errors.NotImplemented(node.op);
            }
          }
        }
        default: {
          throw Errors.NotImplemented(node.NT);
        }
      }
    }
    return aux(node, 0, pointer);
  }

  function aux(node: Node, parent_context: ContextNode): string {
    let code = '';
    switch (node.NT) {
      case NT.context: {
        for (const child of node.members) {
          code += aux(child, node);
        }
        return code;
      }
      case NT.definition: {
        switch (node.DT) {
          case DT.function: {
            addFunction(node);
            return '';
          }
          case DT.var: {
            if (!node.value) throw Errors.NotImplemented();

            node.global_offset = global_stack_offset + 1;
            node.local_offset = local_stack_offset + 1;

            let value = parseExpression(node.value, parent_context, 'eax');
            if (value.length > 1) throw Errors.NotImplemented('tuples');

            if (node.type_check_id === undefined)
              throw Errors.CompilerError(`${node.name} has no type_check_id`);

            code += value[0].before + '\n';

            if (node.type.NT !== NT.type_single)
              throw Errors.NotImplemented(node.type.NT);
            if (typeof node.type.type === 'string')
              throw Errors.NotImplemented('string type');

            node.definition_depth = functions_stack.length;

            return code;
          }
          default:
            throw Errors.NotImplemented(node.DT);
        }
      }
      case NT.statement_debug: {
        const type_node = TypeHelper.getType(node.member!, undefined);
        if (type_node.NT === NT.type_union)
          throw Errors.NotImplemented(type_node.NT);

        if (type_node.NT === NT.type_tuple) {
          if (!node.member || node.member.NT !== NT.expression_list)
            throw Errors.CompilerError();

          code += '\t; statement_debug (tuple)\n';

          for (let i = 0; i < type_node.types.length - 1; i++) {
            if (type_node.types[i].NT !== NT.type_single)
              throw Errors.NotImplemented(type_node.types[i].NT);
            code += print_value(
              node.member.members[i],
              <SingleTypeNode>type_node.types[i],
              parent_context,
              false,
              false
            );
            code += print_value(
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

          if (type_node.types[type_node.types.length - 1].NT !== NT.type_single)
            throw Errors.NotImplemented(
              type_node.types[type_node.types.length - 1].NT
            );

          code += print_value(
            node.member.members[type_node.types.length - 1],
            <SingleTypeNode>type_node.types[type_node.types.length - 1],
            parent_context,
            true,
            false
          );

          return code;
        }

        if (typeof type_node.type === 'string')
          throw Errors.NotImplemented(TypeHelper.formatType(type_node));
        if (type_node.type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented(LanguageObjectKind.instance);

        code += print_value(node.member!, type_node, parent_context);

        return code;
      }
      case NT.statement_return: {
        if (node.parent.return_type.NT === NT.type_raw)
          throw Errors.CompilerError();
        if (
          node.parent.return_type.NT === NT.type_union ||
          node.parent.return_type.NT === NT.type_tuple
        )
          throw Errors.NotImplemented(node.parent.return_type.NT);

        if (node.parent.return_type.type === TYPE_VOID && !node.member) {
          code +=
            '\n' +
            add(
              'esp',
              `${
                Array.from(node.parent.context!.definitions.values()).filter(
                  (v) => v.node.DT === DT.const || v.node.DT === DT.var
                ).length
              } * 4`
            );
          code += pop('ebp');
          code += ret();
          return code;
        }

        const value = parseExpression(node.member!, parent_context, 'eax');

        if (value.length > 1) throw Errors.NotImplemented('tuple');
        const { before, middle, after } = value[0];
        code += before;
        if (before === '' && middle !== '') {
          code += mov('eax', middle);
        }
        code += after;

        code +=
          '\n' +
          add(
            'esp',
            `${
              Array.from(node.parent.context!.definitions.values()).filter(
                (v) => v.node.DT === DT.const || v.node.DT === DT.var
              ).length
            } * 4`
          );

        code += pop('ebp');

        code += ret();
        return code;
      }
      case NT.expression: {
        const val = parseExpression(node, parent_context, 'eax');

        if (val.length > 1) throw Errors.NotImplemented('tuples');

        return val[0].before + val[0].after + val[0].on_update;
      }
      case NT.statement_while: {
        

        const label_success = `while${loop_idx}`;
        const label_fail = `end_while${loop_idx}`;

        if (!node.child) throw Errors.CompilerError();
        if (!node.condition) throw Errors.CompilerError();
        const body = aux(node.child, node.child);

        const condition = parseCondition(
          node.condition,
          label_success,
          label_fail,
          parent_context,
          'eax'
        );

        code +=
          `${label_success}:\n` +
          `\t; condition\n` +
          condition.before +
          condition.middle +
          '\t; body\n' +
          body +
          jmp(label_success) +
          `\n${label_fail}:\n`;

        return code;
      }
      case NT.statement_if_else: {
        let statement_idx = statements_counter[node.NT];
        if (statement_idx === undefined)
          statements_counter[node.NT] = statement_idx = 0;
        else statements_counter[node.NT] = statement_idx++;

        for (let i = 0; i < node.children.length; i++) {
          const branch = node.children[i];

          const label_success = `if_else_${statement_idx}_${i}`;
          const label_fail =
            i + 1 < node.children.length
              ? `if_else_${statement_idx}_${i + 1}`
              : node.default
              ? `if_else_${statement_idx}_def`
              : `if_else_${statement_idx}_end`;

          if (!branch.condition) throw Errors.CompilerError();
          if (!branch.child) throw Errors.CompilerError();

          const condition = parseCondition(
            branch.condition,
            label_success,
            label_fail,
            parent_context,
            'eax'
          );

          code +=
            `${label_success}:\n` +
            `\t; condition\n` +
            condition.before +
            condition.middle +
            '\n\t; body\n' +
            aux(branch.child, branch.child) +
            jmp(`if_else_${statement_idx}_end`);
        }

        if (node.default) {
          if (!node.default.child) throw Errors.CompilerError();
          code +=
            `\nif_else_${statement_idx}_def:\n` +
            '\t; body\n' +
            aux(node.default.child, node.default.child);
        }

        code += `if_else_${statement_idx}_end:\n`;
        code += '\n';

        return code;
      }
      case NT.statement_exit: {
        if (!node.member) throw Errors.CompilerError();
        const value = parseExpression(node.member!, parent_context, 'ebx');

        if (value.length > 1) throw Errors.NotImplemented('tuples');

        code +=
          '\n\t; statement_exit\n' +
          value[0].before +
          pop('ebx') +
          call('_exit');
        return code;
      }
      default:
        throw Errors.NotImplemented(node.NT);
    }
  }

  function print_struct(
    struct: LanguageObject,
    pointer: string,
    pointer_offset: number,
    indent: number
  ) {
    if (!struct.is_struct) throw Errors.CompilerError();
    if (!struct.properties) throw Errors.CompilerError();
    let code = '';

    code +=
      mov('eax', addLiteralString(struct.display_name)) +
      call('sprint') +
      mov('eax', addLiteralString('{')) +
      call('sprintLF');

    for (const [key, prop] of struct.properties) {
      if (prop.kind === PropertyKind.type) throw Errors.NotImplemented();

      const offset = TypeHelper.getPropertyOffset(struct, [key]);

      code +=
        mov('eax', addLiteralString('  '.repeat(1 + indent) + prop.name)) +
        call('sprint') +
        mov('eax', addLiteralString(': ')) +
        call('sprint');

      if (prop.type.NT === NT.type_raw) throw Errors.CompilerError();
      if (prop.type.NT === NT.type_tuple) throw Errors.NotImplemented();
      if (prop.type.NT === NT.type_union) throw Errors.NotImplemented();
      if (typeof prop.type.type === 'string') throw Errors.NotImplemented();

      if (prop.type.type.kind === LanguageObjectKind.instance)
        throw Errors.NotImplemented();

      if (prop.type.type.is_struct)
        code += print_struct(
          prop.type.type,
          pointer,
          pointer_offset + offset,
          indent + 1
        );
      else {
        if (prop.type.type === Types.u64.object) {
          code +=
            mov('eax', `[${pointer} - ${pointer_offset + offset}]`) +
            call('iprintLF');
        } else if (prop.type.type === Types.string.object) {
          code +=
            mov('eax', `[${pointer} - ${pointer_offset + offset}]`) +
            call('sprintLF');
        } else {
          throw Errors.NotImplemented(prop.type.type.display_name);
        }
      }
    }

    code +=
      mov('eax', addLiteralString('  '.repeat(indent) + '}')) +
      call('sprintLF');

    return code;
  }

  function print_value(
    node: Node,
    type_node: SingleTypeNode,
    parent_context: ContextNode,
    line_feed: boolean = true,
    comment: boolean = true
  ) {
    let code = '';

    if (typeof type_node.type === 'string') throw Errors.CompilerError();

    if (
      type_node.type.is_struct &&
      type_node.type.kind === LanguageObjectKind.object
    ) {
      if (!type_node.type.properties) throw Errors.CompilerError();
      const res = parseExpression(node, parent_context, 'ebx');

      if (res.length > 1) throw Errors.CompilerError();

      code +=
        '\t; statement_debug (struct)\n' +
        push('ebx') +
        res[0].before +
        (res[0].pointer_offset
          ? sub(
              'ebx',
              `${res[0].pointer_offset}`,
              'offsets the struct pointer to field'
            )
          : '') +
        print_struct(type_node.type, 'ebx', 4, 0) +
        res[0].after +
        pop('ebx') +
        '\n';

      return code;
    }

    switch (type_node.type) {
      case Types.u64.object: {
        const res = parseExpression(node, parent_context, 'eax');
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before, middle, after } = res[0];

        // if (middle === '') throw Errors.CompilerError('Missing value to log');

        code +=
          (comment ? `\t; statement_debug (int)\n` : '') +
          before +
          pop('eax') +
          call(line_feed ? 'iprintLF' : 'iprint') +
          after +
          '\n';

        return code;
      }
      case Types.string.object: {
        const res = parseExpression(node, parent_context, 'eax');
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before, middle, after } = res[0];

        // if (middle === '') throw Errors.CompilerError('Missing value to log');

        code +=
          (comment ? `\t; statement_debug (str)\n` : '') +
          before +
          pop('eax') +
          call(line_feed ? 'sprintLF' : 'sprint') +
          after +
          '\n';

        return code;
      }
      default:
        throw Errors.NotImplemented(TypeHelper.formatType(type_node));
    }
  }

  text += aux(tree.root, tree.root);

  // TODO: remove if program already exits;
  text += mov('ebx', '0', 'exit code') + call('_exit');

  let asm_source =
    base +
    text +
    functions +
    (data === '' ? '' : '\nsection .data\n' + data) +
    (bss === '' ? '' : '\nsection .data\n' + bss);

  writeFileSync(path, asm_source);
};
