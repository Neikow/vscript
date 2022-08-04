import { writeFileSync } from 'fs';
import { SyntaxTree } from '.';
import { Errors } from '../errors';
import { LanguageObjectKind } from '../objects';
import { Types } from '../std/types';
import {
  DefinitionNodeFunction,
  DefinitionNodeVar,
  DefinitionType as DT,
  ExpressionListNode,
  ExpressionNode,
  Node,
  NodeType as NT,
  TypeNode
} from '../syntax_tree_nodes';
import { INFINITY, NAN } from '../types';
import TypeHelper from '../type_helper';

/**
 * Generates the source code for a given tree;
 */
export const compile = (tree: SyntaxTree, path: string): void => {
  if (!tree.collapsed) tree.collapse();
  if (!tree.type_check()) throw Errors.ParserError('Type-check failed');

  let base =
    '; --------------------------\n' +
    ';     Generated assembly    \n' +
    '; --------------------------\n' +
    "\n%include\t'functions.asm'\n" +
    "%include\t'macros.asm'\n";

  let text =
    '\nsection .text\n' +
    'global  _start\n' +
    '\n_start:\n' +
    '\txor\t\teax, eax\n' +
    '\txor\t\tebx, ebx\n' +
    '\txor\t\tecx, ecx\n' +
    '\txor\t\tedx, edx\n' +
    '\tmov\t\tebp, esp\n\n' +
    '\tpush\tebp';

  let functions = '';

  let data = '\nsection .data\n';

  let bss = '\nsection .bss\n';

  const names = new Map<string, number>();

  let while_loop_index = 0;

  function getLiteralValue(node: ExpressionListNode | ExpressionNode): string {
    if (node.NT === NT.expression_list && node.members.length !== 1)
      throw Errors.NotImplemented(NT.expression_list);

    const _node = node.NT === NT.expression_list ? node.members[0] : node;

    throw Errors.NotImplemented();
  }

  function addFun(node: DefinitionNodeFunction) {
    let fun =
      `\n; fn ${node.name}(${node.value.arguments
        .map(
          (arg) =>
            `${arg.name}: ${TypeHelper.formatType(arg.type as TypeNode, false)}`
        )
        .join(', ')}): ${TypeHelper.formatType(
        node.value.return_type as TypeNode,
        false
      )}\n` +
      `fun_${node.name}${node.value.context!.id}:\n` +
      '\tmov\t\tebp, esp\n\n';

    fun += aux(node.value.context!, 0);

    if (!node.value.has_return) {
      fun += '\tret\n';
    }

    functions += fun;
  }

  function addGlobalVar(node: DefinitionNodeVar) {
    // TODO:
    // if (!node.mutated) return addConst(node);

    if (node.type.NT === NT.type_union)
      throw Errors.NotImplemented(NT.type_union);

    if (node.type.NT === NT.raw_type) throw Errors.ParserError();

    switch (node.type.type) {
      case Types.integer.object: {
        if (node.value === undefined) {
          data += `${node.name}${node.type_check_id}: dw\n`;
        } else {
          data += `${node.name}${node.type_check_id}: dw ${getLiteralValue(
            node.value
          )}\n`;
        }
        return;
      }
      case Types.string.object: {
        if (node.value === undefined) {
          data += `${node.name}${node.type_check_id}: db \n`;
        } else {
          data += `${node.name}${node.type_check_id}: db '${getLiteralValue(
            node.value
          )}', 0h\n`;
        }
        return;
      }
      default: {
        throw Errors.NotImplemented(TypeHelper.formatType(node.type));
      }
    }
  }

  let string_index = 0;

  function addStr(str: string): string {
    const id = `str${string_index++}`;
    data += `${id}: db '${str}', 0h\n`;
    return id;
  }

  // function addGlobalConst(node: DefinitionNodeConst | DefinitionNodeVar) {
  //   const id = `${node.name}${node.type_check_id}`;

  //   if (node.type.NT === NT.raw_type) throw Errors.ParserError();

  //   if (node.type.NT === NT.type_union) throw Errors.NotImplemented('union');

  //   if (node.type.type !== Types.integer.object)
  //     throw Errors.NotImplemented('non integer constant');

  //   const val = mem.parseExpression(node.value);
  //   if (val.length > 1) throw Errors.NotImplemented('tuple');

  //   data += `${id}: equ ${val[0].value}`;
  // }

  function addType() {}

  function compileCondition(
    cond: ExpressionListNode | ExpressionNode,
    success_label: string,
    fail_label: string
  ): string {
    if (cond.NT === NT.expression_list)
      throw Errors.NotImplemented(NT.expression_list);

    function aux(node: Node, depth: number): string {
      switch (node.NT) {
        case NT.expression: {
          if (!node.member) throw Errors.ParserError('Missing expression');
          return aux(node.member, depth + 1);
        }
        case NT.reference: {
          if (node.definition.DT === DT.function_argument) {
            if (depth == 0) {
              return (
                `\tmov\t\teax, [ebp + ${node.definition.index + 2} * 4]\n` +
                `\tcmp\t\teax, 0\n` +
                `\n\tjz\t\t${fail_label}\n\n`
              );
            }

            return `[ebp + ${node.definition.index + 2} * 4]`;
          }

          if (node.definition.DT !== DT.var) throw Errors.NotImplemented();

          let reg = `${node.definition.name}${node.definition.index}`;
          // if (node.definition.DT !== DT.const) reg = `[${reg}]`;

          if (depth == 0) {
            return (
              `\tmov\t\teax, ${reg}\n` +
              `\tcmp\t\teax, 0\n` +
              `\n\tjz\t\t${fail_label}\n\n`
            );
          }

          return reg;
        }
        case NT.literal_number: {
          if (node.value_type === Types.float.object)
            throw Errors.NotImplemented('floats');

          if (node.value === NAN || node.value === INFINITY)
            throw Errors.NotImplemented('string value');

          return node.value;
        }

        case NT.operator: {
          if (depth > 1) throw Errors.NotImplemented(depth.toString());
          switch (node.op) {
            case 'lt': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return (
                `\tmov\t\teax, ${left}\n` +
                `\tmov\t\tebx, ${right}\n` +
                `\tcmp\t\teax, ebx\n` +
                `\tjge\t\t${fail_label}`
              );
            }

            case 'gt': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return (
                `\tmov\t\teax, ${left}\n` +
                `\tmov\t\tebx, ${right}\n` +
                `\tcmp\t\teax, ebx\n` +
                `\tjle\t\t${fail_label}`
              );
            }

            case 'leq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return (
                `\tmov\t\teax, ${left}\n` +
                `\tmov\t\tebx, ${right}\n` +
                `\tcmp\t\teax, ebx\n` +
                `\tjg\t\t${fail_label}`
              );
            }

            case 'geq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return (
                `\tmov\t\teax, ${left}\n` +
                `\tmov\t\tebx, ${right}\n` +
                `\tcmp\t\teax, ebx\n` +
                `\tjl\t\t${fail_label}`
              );
            }

            case 'eq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return (
                `\tmov\t\teax, ${left}\n` +
                `\tmov\t\tebx, ${right}\n` +
                `\tcmp\t\teax, ebx\n` +
                `\tjne\t\t${fail_label}`
              );
            }

            case 'neq': {
              if (!node.left || !node.right) throw Errors.ParserError();

              const left = aux(node.left, depth + 1);
              const right = aux(node.right, depth + 1);

              return (
                `\tmov\t\teax, ${left}\n` +
                `\tmov\t\tebx, ${right}\n` +
                `\tcmp\t\teax, ebx\n` +
                `\tje\t\t${fail_label}`
              );
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

    return aux(cond, 0);
  }

  interface ParseResult {
    before: string;
    middle: string;
    after: string;
  }

  function parseExpression(expr: Node): ParseResult | ParseResult[] {
    switch (expr.NT) {
      case NT.expression: {
        if (!expr.member) throw Errors.ParserError('Missing expression');
        return parseExpression(expr.member);
      }
      case NT.reference: {
        if (!expr.definition.type || expr.definition.type.NT === NT.raw_type)
          throw Errors.ParserError();

        if (expr.definition.type.NT === NT.type_union)
          throw Errors.NotImplemented(NT.type_union);

        if (typeof expr.definition.type.type == 'string')
          throw Errors.NotImplemented('string type');

        if (expr.definition.type.type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented(LanguageObjectKind.instance);

        if (expr.definition.DT === DT.function_argument) {
          const reg = `[ebp + ${expr.definition.index + 2} * 4]`;
          return {
            before:
              `\t; ${expr.definition.name} arg\n` + `\tmov\t\teax, ${reg}\n`,
            middle: 'eax',
            after: `\tmov\t\t${reg}, eax\n`,
          };
        }

        if (expr.definition.DT !== DT.var)
          throw Errors.NotImplemented(expr.definition.DT);

        const reg = `[edx - 4 - ${expr.definition.index} * 4]`;

        return {
          before: `\t; ${expr.definition.name}\n` + `\tmov\t\teax, ${reg}\n`,
          middle: 'eax',
          after: `\tmov\t\t${reg}, eax\n`,
        };

      }
      case NT.operator: {
        switch (expr.op) {
          case 'decr': {
            if (!expr.left) throw Errors.ParserError();
            if (expr.left.NT !== NT.reference)
              throw Errors.NotImplemented('non reference decr');

            const val = parseExpression(expr.left);

            if (Array.isArray(val)) throw Errors.NotImplemented('tuple');
            return {
              before: '',
              middle: val.middle,
              after: `\tdec\t\t${val.middle}\n` + val.after,
            };
          }

          case 'incr': {
            if (!expr.left) throw Errors.ParserError();
            if (expr.left.NT !== NT.reference)
              throw Errors.NotImplemented('non reference decr');

            const val = parseExpression(expr.left);

            if (Array.isArray(val)) throw Errors.NotImplemented('tuple');
            return {
              before: val.before,
              middle: val.middle,
              after:
                `\t; increment ${expr.left.definition.name}\n` +
                `\tinc\t\t${val.middle}\n` +
                val.after,
            };
          }

          case 'assign': {
            if (!expr.left || !expr.right) throw Errors.ParserError();
            const left = parseExpression(expr.left);
            const right = parseExpression(expr.right);
            if (Array.isArray(left)) throw Errors.NotImplemented('tuple');
            if (Array.isArray(right)) throw Errors.NotImplemented('tuple');
            return {
              before:
                left.before +
                right.before +
                `\tmov\t\t${left.middle}, ${right.middle}\n`,
              middle: left.middle,
              after: left.after + right.after,
            };
          }

          case 'sub_assign': {
            if (!expr.left || !expr.right) throw Errors.ParserError();

            const left = parseExpression(expr.left);
            const right = parseExpression(expr.right);
            if (Array.isArray(left)) throw Errors.NotImplemented('tuple');
            if (Array.isArray(right)) throw Errors.NotImplemented('tuple');

            return {
              before:
                left.before +
                right.before +
                `\tmov\t\teax, ${left.middle}\n` +
                `\tsub\t\teax, ${right.middle}\n` +
                `\tmov\t\tdword ${left.middle}, eax\n`,
              middle: left.middle,
              after: '',
            };
          }

          case 'access_call': {
            if (!expr.left || !expr.right) throw Errors.ParserError();

            if (expr.left.NT !== NT.reference) throw Errors.NotImplemented();

            if (expr.left.definition.DT !== DT.function)
              throw Errors.NotImplemented();

            const left = parseExpression(expr.left);
            if (Array.isArray(left)) throw Errors.ParserError();
            const right = parseExpression(expr.right);

            let before = left.before;

            if (Array.isArray(right)) {
              for (let i = right.length - 1; i > -1; i--) {
                before +=
                  right[i].before +
                  `\tpush\t${right[i].middle}\n` +
                  right[i].after;
              }
            } else {
              before +=
                right.before + `\tpush\t${right.middle}\n` + right.after;
            }

            before += `\tpush\t${Array.isArray(right) ? right.length : 1}\n`;

            before += `\tcall\t${left.middle}\n`;

            before += `\tadd\t\tesp, ${
              expr.left.definition.value.arguments.length + 1
            } * 4\n`;

            return {
              before: before,
              middle: 'eax',
              after: '',
            };
          }

          case 'add': {
            if (!expr.left || !expr.right) throw Errors.ParserError();

            const left = parseExpression(expr.left);
            if (Array.isArray(left)) throw Errors.ParserError();
            const right = parseExpression(expr.right);
            if (Array.isArray(right)) throw Errors.ParserError();

            return {
              before:
                left.before +
                `\tmov\t\tebx, ${left.middle}\n` +
                right.before +
                `\tmov\t\teax, ${right.middle}\n` +
                `\tadd\t\teax, ebx\n`,
              middle: 'eax',
              after: '',
            };
          }

          case 'sub': {
            if (!expr.left || !expr.right) throw Errors.ParserError();

            const left = parseExpression(expr.left);
            if (Array.isArray(left)) throw Errors.ParserError();
            const right = parseExpression(expr.right);
            if (Array.isArray(right)) throw Errors.ParserError();

            return {
              before:
                right.before +
                `\tmov\t\tebx, ${right.middle}\n` +
                left.before +
                `\tmov\t\teax, ${left.middle}\n` +
                `\tsub\t\teax, ebx\n`,
              middle: 'eax',
              after: '',
            };
          }

          case 'mul': {
            if (!expr.left || !expr.right) throw Errors.ParserError();

            const left = parseExpression(expr.left);
            if (Array.isArray(left)) throw Errors.ParserError();
            const right = parseExpression(expr.right);
            if (Array.isArray(right)) throw Errors.ParserError();

            return {
              before:
                right.before +
                `\tmov\t\tebx, ${right.middle}\n` +
                left.before +
                `\tmul\t\tebx\n`,
              middle: 'eax',
              after: '',
            };
          }

          default: {
            throw Errors.NotImplemented(expr.op);
          }
        }
      }
      case NT.literal_number: {
        if (expr.value_type !== Types.integer.object)
          throw Errors.NotImplemented(expr.value_type.display_name);
        return {
          before: '',
          middle: expr.value,
          after: '',
        };
      }

      case NT.expression_list: {
        let res: ParseResult[] = [];
        for (const mem of expr.members) {
          const parsed_mem = parseExpression(mem);
          if (Array.isArray(parsed_mem))
            throw Errors.NotImplemented('nested expression_list');
          res.push(parsed_mem);
        }
        return res;
      }

      case NT.literal_string: {
        const val = addStr(expr.value);

        return {
          before: '',
          middle: `${val}`,
          after: '',
        };
      }

      default: {
        throw Errors.NotImplemented(expr.NT);
      }
    }
  }

  function aux(node: Node, index: number): [string, number] {
    let code = '';
    let idx = index;
    switch (node.NT) {
      case NT.context: {
        for (const child of node.members) {
          const res = aux(child, idx);
          code += res[0];
          idx = index;
        }
        return [code, idx];
      }
      case NT.definition: {
        switch (node.DT) {
          case DT.var: {
            if (node.context.id === -1) {
              addGlobalVar(node);
              return ['', idx];
            }
            if (node.value) {
              let val = parseExpression(node.value);
              if (node.index === undefined) throw Errors.ParserError();
              if (Array.isArray(val)) throw Errors.NotImplemented();
              return [
                `\t; let ${node.name}\n` +
                  val.before +
                  `\tpush\t${val.middle}\n` +
                  val.after,
                idx,
              ];
            } else {
              throw Errors.NotImplemented();
            }
          }
          // case DT.const: {
          // if (node.context.id === -1) {
          // addGlobalConst(node);
          // return ['', idx];
          // }
          // throw Errors.NotImplemented();
          // }
          case DT.function: {
            addFun(node);
            return ['', idx];
          }
          default:
            throw Errors.NotImplemented(node.DT);
        }
      }
      case NT.statement_debug: {
        if (!node.member) throw Errors.ParserError('Missing member');

        const type_node = TypeHelper.getType(node.member, undefined);
        if (type_node.NT === NT.type_union)
          throw Errors.NotImplemented(type_node.NT);

        if (typeof type_node.type === 'string')
          throw Errors.NotImplemented(TypeHelper.formatType(type_node));

        if (type_node.type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented(LanguageObjectKind.instance);

        switch (type_node.type) {
          case Types.integer.object: {
            const res = parseExpression(node.member);

            if (Array.isArray(res)) throw Errors.NotImplemented('tuple');

            const { before, middle, after } = res;

            if (middle === '') throw Errors.ParserError('Missing value');

            code +=
              `\t; statement_debug\n` +
              before +
              `\tmov\t\teax, ${middle}\n` +
              '\tcall\tiprintLF\n' +
              after +
              '\n';

            return [code, idx];
          }
          case Types.string.object: {
            const res = parseExpression(node.member);

            if (Array.isArray(res)) throw Errors.NotImplemented('tuple');

            const { before, middle, after } = res;

            code +=
              `\t; statement_debug\n` +
              before +
              `\tmov\t\teax, ${middle}\n` +
              '\tcall\tsprintLF\n' +
              after +
              '\n';

            return [code, idx];
          }
          default: {
            throw Errors.NotImplemented(TypeHelper.formatType(type_node));
          }
        }
      }
      case NT.statement_while: {
        while_loop_index++;
        const success_label = `while${while_loop_index}`;
        const fail_label = `end_while${while_loop_index}`;
        if (!node.child) throw Errors.ParserError('Missing body');
        if (!node.condition) throw Errors.ParserError('Missing condition');
        const [body, _idx] = aux(node.child, idx);
        code +=
          `${success_label}:\n` +
          `\t; condition\n` +
          `${compileCondition(node.condition, success_label, fail_label)}\n` +
          `\t; body\n` +
          body +
          `\tjmp\t\t${success_label}\n` +
          `\n${fail_label}:\n`;

        return [code, _idx];
      }

      case NT.expression: {
        if (!node.member) throw Errors.ParserError('Missing expression');
        const res = parseExpression(node.member);

        if (Array.isArray(res)) throw Errors.NotImplemented('tuple');

        const { before, middle, after } = res;

        // code += before + middle + after;
        code += before + after;

        return [code, idx];
      }

      case NT.statement_return: {
        if (!node.member) throw Errors.ParserError('Missing expression');
        const res = parseExpression(node.member);

        if (Array.isArray(res)) throw Errors.NotImplemented('tuple');
        const { before, middle, after } = res;

        code += before;

        if (before === '' && middle !== '') {
          code += `\tmov eax, ${middle}\n`;
        }

        code += '\tret\n';

        return [code, idx];
      }

      default:
        throw Errors.NotImplemented(node.NT);
    }
  }

  text +=
    aux(tree.root, 0)[0] +
    '\n\t; exit program with 0 exit code\n' +
    '\tmov\t\tebx, 0\n' +
    '\tcall\t_exit\n';

  writeFileSync(path, base + text + functions + data + bss);
  // writeFileSync(
  //   path,
  //   (base + text + data + bss).replaceAll('\tmov\t\teax, eax\n', '')
  // );
};
