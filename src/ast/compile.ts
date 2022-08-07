import { writeFileSync } from 'fs';
import { SyntaxTree } from '.';
import { Errors } from '../errors';
import { LanguageObjectKind } from '../objects';
import { Types } from '../std/types';
import {
  ContextType,
  DefinitionNodeFunction,
  DefinitionType as DT,
  ExpressionListNode,
  ExpressionNode,
  FunctionNode,
  Node,
  NodeType as NT,
  SingleTypeNode,
  TypeNode,
} from '../syntax_tree_nodes';
import { INFINITY, Location, NAN, TYPE_VOID } from '../types';
import TypeHelper from '../type_helper';

interface ParseResult {
  before: string;
  middle: string;
  after: string;
  on_update: string;
}

export const compile = (tree: SyntaxTree, path: string) => {
  if (!tree.collapsed) tree.collapse();
  if (!tree.type_check()) throw Errors.CompilerError('Type-check failed');

  // const stack_offsets: Map<number, number> = new Map();

  const offsets_stack: number[] = [];
  const functions_stack: FunctionNode[] = [];
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
    return `\tpop\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function push(v: string, comment?: string) {
    local_stack_offset++;
    global_stack_offset++;
    return (
      `\t; lo: ${local_stack_offset}, go: ${global_stack_offset}\n\tpush\t${v}` +
      (comment ? `\t; ${comment}\n` : '\n')
    );
  }

  function mov(v1: string, v2: string, comment?: string) {
    const val = `mov\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
    // if (v1 == v2) return '\t; ' + val;
    if (v1 == v2) return '';
    return '\t' + val;
  }

  function add(v1: string, v2: string, comment?: string) {
    return `\tadd\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function sub(v1: string, v2: string, comment?: string) {
    return `\tsub\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
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
    return `\tjge\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  function jl(v: string, comment?: string) {
    return `\tjle\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
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

  let data = '\nsection .data\n';

  let bss = '\nsection .bss\n';

  function parseExpression(node: Node, context_id: number): ParseResult[] {
    switch (node.NT) {
      case NT.expression: {
        return parseExpression(node.member!, context_id);
      }
      case NT.operator: {
        switch (node.op) {
          case 'add': {
            if (!node.left || !node.right) throw Errors.ParserError();
            const left = parseExpression(node.left, context_id);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, context_id);
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  '\t; op add\n' +
                  left[0].before +
                  mov('ebx', left[0].middle) +
                  right[0].before +
                  mov('eax', right[0].middle) +
                  add('eax', 'ebx'),
                middle: 'eax',
                after: '',
                on_update: '',
              },
            ];
          }
          case 'sub': {
            if (!node.left || !node.right) throw Errors.ParserError();
            const left = parseExpression(node.left, context_id);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, context_id);
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  '\t; op sub\n' +
                  left[0].before +
                  mov('ebx', right[0].middle) +
                  right[0].before +
                  mov('eax', left[0].middle) +
                  sub('eax', 'ebx'),
                middle: 'eax',
                after: '',
                on_update: '',
              },
            ];
          }
          case 'decr': {
            if (!node.left) throw Errors.CompilerError();
            if (node.left.NT !== NT.reference)
              throw Errors.NotImplemented('non reference decr');

            const val = parseExpression(node.left, context_id);
            if (val.length > 1) throw Errors.ParserError();

            return [
              {
                before: val[0].before,
                middle: val[0].middle,
                after: dec(val[0].middle) + val[0].on_update,
                on_update: '',
              },
            ];
          }
          case 'incr': {
            if (!node.left) throw Errors.CompilerError();
            if (node.left.NT !== NT.reference)
              throw Errors.NotImplemented('non reference decr');

            const val = parseExpression(node.left, context_id);
            if (val.length > 1) throw Errors.ParserError();

            return [
              {
                before: val[0].before,
                middle: val[0].middle,
                after: inc(val[0].middle) + val[0].on_update,
                on_update: '',
              },
            ];
          }
          case 'assign': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            const left = parseExpression(node.left, context_id);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, context_id);
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  '\t; op assign\n' +
                  right[0].before +
                  mov('eax', right[0].middle) +
                  left[0].after +
                  right[0].after,
                middle: 'eax',
                after: '',
                on_update: left[0].on_update,
              },
            ];
          }
          case 'sub_assign': {
            if (!node.left || !node.right) throw Errors.CompilerError();

            const left = parseExpression(node.left, context_id);
            if (left.length > 1) throw Errors.NotImplemented();
            const right = parseExpression(node.right, context_id);
            if (right.length > 1) throw Errors.NotImplemented();

            return [
              {
                before:
                  '\t; op sub_assign\n' +
                  left[0].before +
                  right[0].before +
                  mov('eax', left[0].middle) +
                  mov('ebx', right[0].middle) +
                  sub('eax', 'ebx') +
                  left[0].after +
                  right[0].after,
                middle: 'eax',
                after: '',
                on_update: left[0].on_update,
              },
            ];
          }
          case 'access_call': {
            if (!node.left || !node.right) throw Errors.CompilerError();
            if (node.left.NT !== NT.reference) throw Errors.NotImplemented();
            if (node.left.definition.DT !== DT.function)
              throw Errors.NotImplemented();

            const left = parseExpression(node.left, context_id);
            if (left.length > 1) throw Errors.CompilerError();
            const right = parseExpression(node.right, context_id);

            let before = '';
            before += left[0].before;
            for (let i = right.length - 1; i > -1; i--) {
              before +=
                right[i].before +
                push(right[i].middle, `arg ${i}`) +
                right[i].after;
            }
            const arg_count = node.left.definition.value.arguments.length;
            before +=
              '\t; op call\n' +
              call(left[0].middle) +
              add('esp', `${arg_count} * 4`, 'removes arguments from stack');

            return [
              {
                before: before,
                middle: 'eax',
                after: '',
                on_update: '',
              },
            ];
          }
          default:
            throw Errors.NotImplemented(node.op);
        }
      }
      case NT.reference: {
        if (!node.definition.type || node.definition.type.NT === NT.raw_type)
          throw Errors.ParserError();
        if (
          node.definition.type.NT === NT.type_union ||
          node.definition.type.NT === NT.type_tuple
        )
          throw Errors.NotImplemented(node.definition.type.NT);
        if (typeof node.definition.type.type == 'string')
          throw Errors.NotImplemented('string type');
        if (node.definition.type.type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented(LanguageObjectKind.instance);

        switch (node.definition.DT) {
          case DT.function: {
            return [
              {
                before: '', // FIXME: dunno
                middle: `fn_${node.definition.name}${
                  node.definition.value.context!.id
                }`,
                after: '',
                on_update: '',
              },
            ];
          }
          case DT.function_argument: {
            let address = `[ebp + ${node.definition.index + 2} * 4]`;
            return [
              {
                before: mov('eax', address, `(${node.definition.name})`),
                middle: 'eax',
                after: '',
                on_update: mov(address, 'eax'),
              },
            ];
          }
          case DT.var: {
            if (node.definition.type_check_id === undefined)
              throw Errors.CompilerError();

            if (
              node.definition.global_offset === undefined ||
              node.definition.local_offset === undefined
            )
              throw Errors.CompilerError();

            // console.debug(
            //   `\nname : ${node.definition.name}\n` +
            //     `ngo  : ${node.definition.global_offset} ; go  : ${global_stack_offset}\n` +
            //     `nlo  : ${node.definition.local_offset}  ; lo  : ${local_stack_offset}\n` +
            //     `ncid : ${node.definition.context.id}    ; cid : ${context_id}\n`
            // );

            let address: string;

            if (node.definition.context!.id === context_id)
              address = `[ebp - ${local_stack_offset} * 4]`;
            else
              address = `[ebp + ${local_stack_offset + functions_stack
                .map((v) => v.arguments.length)
                .reduce((p, c) => p + c + 1, 0) + offsets_stack.reduce(
                (p, c) => p + c,
                0
              ) - global_stack_offset} * 4]`;

            return [
              {
                before: mov('eax', address, `(${node.definition.name})`),
                middle: 'eax',
                after: '',
                on_update: mov(address, 'eax'),
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
          let list_member = parseExpression(member, context_id);
          if (list_member.length > 1)
            throw Errors.NotImplemented('Nested lists');
          res.push(list_member[0]);
        }
        return res;
      }
      case NT.literal_number: {
        if (node.value === NAN || node.value === INFINITY)
          throw Errors.NotImplemented();
        if (node.value_type === Types.float.object)
          throw Errors.NotImplemented('floats');
        return [
          {
            before: '',
            middle: node.value,
            after: '',
            on_update: '',
          },
        ];
      }
      case NT.literal_string: {
        const val = addLiteralString(node.value);

        return [
          {
            before: '',
            middle: val,
            after: '',
            on_update: '',
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
              },
            ];
          }
          default:
            throw Errors.NotImplemented(node.value);
        }
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
    context_id: number
  ): ParseResult {
    if (node.NT === NT.expression_list)
      throw Errors.NotImplemented(NT.expression_list);

    function aux(node: Node, depth: number): ParseResult {
      switch (node.NT) {
        case NT.expression: {
          if (!node.member) throw Errors.ParserError('Missing expression');
          return aux(node.member, depth + 1);
        }
        case NT.literal_number: {
          if (node.value_type !== Types.integer.object)
            throw Errors.NotImplemented();
          if (node.value === NAN || node.value === INFINITY)
            throw Errors.NotImplemented();
          return {
            before: '',
            middle: node.value,
            after: '',
            on_update: '',
          };
        }
        case NT.reference: {
          const res = parseExpression(node, context_id);
          if (res.length > 1) throw Errors.CompilerError();

          return {
            before: res[0].before,
            middle: res[0].middle,
            after: '',
            on_update: res[0].after,
          };
        }
        case NT.operator: {
          if (depth > 1) throw Errors.NotImplemented(depth.toString());
          switch (node.op) {
            case 'lt': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return {
                before:
                  left.before +
                  right.before +
                  mov('eax', left.middle) +
                  mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp('eax', 'ebx') +
                  jge(label_fail),
                middle: '',
                after: '',
                on_update: '',
              };
            }
            case 'gt': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return {
                before:
                  left.before +
                  right.before +
                  mov('eax', left.middle) +
                  mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp('eax', 'ebx') +
                  jle(label_fail),
                middle: '',
                after: '',
                on_update: '',
              };
            }

            case 'leq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return {
                before:
                  left.before +
                  right.before +
                  mov('eax', left.middle) +
                  mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp('eax', 'ebx') +
                  jg(label_fail),
                middle: '',
                after: '',
                on_update: '',
              };
            }

            case 'geq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return {
                before:
                  left.before +
                  right.before +
                  mov('eax', left.middle) +
                  mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp('eax', 'ebx') +
                  jl(label_fail),
                middle: '',
                after: '',
                on_update: '',
              };
            }

            case 'eq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return {
                before:
                  left.before +
                  right.before +
                  mov('eax', left.middle) +
                  mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp('eax', 'ebx') +
                  jne(label_fail),
                middle: '',
                after: '',
                on_update: '',
              };
            }

            case 'neq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return {
                before:
                  left.before +
                  right.before +
                  mov('eax', left.middle) +
                  mov('ebx', right.middle) +
                  left.after +
                  left.on_update +
                  right.after +
                  right.on_update +
                  cmp('eax', 'ebx') +
                  je(label_fail),
                middle: '',
                after: '',
                on_update: '',
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
    return aux(node, 0);
  }

  let string_index = 0;
  const strings: { [str: string]: string } = {};
  function addLiteralString(str: string): string {
    if (Object.keys(strings).includes(str)) return strings[str];

    const id = `_s${string_index++}`;
    data += `${id}: db ${str
      .split('\\n')
      .map((s) => `'${s}'`)
      .join(', 0xA, ')}, 0h\n`.replaceAll("'', ", '');

    strings[str] = id;

    return id;
  }

  function addFunction(node: DefinitionNodeFunction): void {
    offsets_stack.push(local_stack_offset);
    functions_stack.push(node.value);
    local_stack_offset = 0;

    const format_args = node.value.arguments
      .map(
        (arg) =>
          `${arg.name}: ${TypeHelper.formatType(arg.type as TypeNode, false)}`
      )
      .join(', ');
    const format_return = TypeHelper.formatType(
      node.value.return_type as TypeNode,
      false
    );

    let func =
      `\n; ${node.name}(${format_args}): ${format_return}\n` +
      `fn_${node.name}${node.value.context!.id}:\n` +
      push('ebp') +
      mov('ebp', 'esp', 'saves the function base pointer') +
      '\n' +
      aux(node.value.context!, node.value.context!.id) +
      (!node.value.has_return
        ? aux(
            {
              NT: NT.statement_return,
              location: Location.computed,
              member: undefined,
              parent: node.value,
            },
            node.value.context!.id
          )
        : '');

    global_stack_offset -= local_stack_offset;
    if (offsets_stack.length < 1) throw Errors.CompilerError();
    local_stack_offset = offsets_stack.pop()!;

    functions_stack.pop();

    functions += func;
  }

  function aux(node: Node, context_id: number): string {
    let code = '';
    switch (node.NT) {
      case NT.context: {
        for (const child of node.members) {
          code += aux(child, node.id);
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
            let value = parseExpression(node.value, context_id);
            if (value.length > 1) throw Errors.NotImplemented('tuples');

            if (node.type_check_id === undefined)
              throw Errors.CompilerError(`${node.name} has no type_check_id`);

            code += value[0].before + push(value[0].middle) + value[0].after;

            node.global_offset = global_stack_offset;
            node.local_offset = local_stack_offset;

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

          for (let i = 0; i < type_node.types.length - 1; i++) {
            if (type_node.types[i].NT !== NT.type_single)
              throw Errors.NotImplemented(type_node.types[i].NT);
            code += print_value(
              node.member.members[i],
              <SingleTypeNode>type_node.types[i],
              context_id,
              false
            );
            code += print_value(
              {
                NT: NT.literal_string,
                value: ', ',
                location: Location.computed,
                value_type: Types.string.object,
              },
              { NT: NT.type_single, type: Types.string.object },
              context_id,
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
            context_id,
            true
          );

          return code;
        }

        if (typeof type_node.type === 'string')
          throw Errors.NotImplemented(TypeHelper.formatType(type_node));
        if (type_node.type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented(LanguageObjectKind.instance);

        code += print_value(node.member!, type_node, context_id);

        return code;
      }
      case NT.statement_return: {
        if (node.parent.return_type.NT === NT.raw_type)
          throw Errors.CompilerError();
        if (
          node.parent.return_type.NT === NT.type_union ||
          node.parent.return_type.NT === NT.type_tuple
        )
          throw Errors.NotImplemented(node.parent.return_type.NT);

        if (node.parent.return_type.type === TYPE_VOID && !node.member) {
          code += add(
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

        const value = parseExpression(node.member!, context_id);

        if (value.length > 1) throw Errors.NotImplemented('tuple');
        const { before, middle, after } = value[0];
        code += before;
        if (before === '' && middle !== '') {
          code += mov('eax', middle);
        }
        code += after;

        code += add(
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
        const val = parseExpression(node, context_id);

        if (val.length > 1) throw Errors.NotImplemented('tuples');

        return val[0].before + val[0].after + val[0].on_update;
      }
      case NT.statement_while: {
        let loop_idx = statements_counter[node.NT];
        if (loop_idx === undefined) statements_counter[node.NT] = loop_idx = 0;
        else statements_counter[node.NT] = loop_idx++;

        const label_success = `while${loop_idx}`;
        const label_fail = `end_while${loop_idx}`;

        if (!node.child) throw Errors.CompilerError();
        if (!node.condition) throw Errors.CompilerError();
        const body = aux(node.child, node.child.id);

        const condition = parseCondition(
          node.condition,
          label_success,
          label_fail,
          node.child.id
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
            branch.child.id
          );

          code +=
            `${label_success}:\n` +
            `\t; condition\n` +
            condition.before +
            condition.middle +
            '\t; body\n' +
            aux(branch.child, branch.child.id) +
            jmp(`if_else_${statement_idx}_end`);
        }

        if (node.default) {
          if (!node.default.child) throw Errors.CompilerError();
          code +=
            `\nif_else_${statement_idx}_def:\n` +
            '\t; body\n' +
            aux(node.default.child, node.default.child.id);
        }

        code += `if_else_${statement_idx}_end:\n`;
        code += '\n';

        return code;
      }
      default:
        throw Errors.NotImplemented(node.NT);
    }
  }

  text += aux(tree.root, tree.root.id);
  text += mov('ebx', '0', 'exit code') + call('_exit');

  writeFileSync(path, base + text + functions + data + bss);

  function print_value(
    node: Node,
    type_node: SingleTypeNode,
    context_id: number,
    line_feed: boolean = true
  ) {
    let code = '';
    switch (type_node.type) {
      case Types.integer.object: {
        const res = parseExpression(node, context_id);
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before, middle, after } = res[0];

        if (middle === '') throw Errors.CompilerError('Missing value to log');

        code +=
          `\t; statement_debug (int)\n` +
          before +
          mov('eax', middle) +
          call(line_feed ? 'iprintLF' : 'iprint') +
          after +
          '\n';

        // account for `call`;
        global_stack_offset--;
        local_stack_offset--;

        return code;
      }
      case Types.string.object: {
        const res = parseExpression(node, context_id);
        if (res.length > 1) throw Errors.NotImplemented('tuples');

        const { before, middle, after } = res[0];

        if (middle === '') throw Errors.CompilerError('Missing value to log');

        code +=
          `\t; statement_debug (str)\n` +
          before +
          mov('eax', middle) +
          call(line_feed ? 'sprintLF' : 'sprint') +
          after +
          '\n';

        return code;
      }
      default:
        throw Errors.NotImplemented(TypeHelper.formatType(type_node));
    }
  }
};
