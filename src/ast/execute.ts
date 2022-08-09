import chalk from 'chalk';
import { SyntaxTree } from '.';
import { Errors } from '../errors';
import { Memory } from '../memory';
import { LanguageObject, LanguageObjectKind } from '../objects';
import { Types } from '../std/types';
import {
  ContextNode,
  NodeType as NT,
  SingleTypeNode,
  StatementLabelNode,
  ValueNode,
} from '../syntax_tree_nodes';
import { INFINITY, NAN, NULL } from '../types';

/**
 * Travels through the tree and executing the program.
 */

export const execute = (tree: SyntaxTree) => {
  const mem = new Memory(execute_aux);

  function formatType(node: ValueNode, indent: number = 0): string {
    if (!node) throw Errors.ParserError('Missing value');

    const visited: ValueNode[] = [];
    const circular_refs: number[] = [];
    let circular_max_id = 0;

    function aux(node: ValueNode, indent = 0): [string, number] {
      if (node.NT === NT.property_node) {
        throw Errors.NotImplemented(NT.property_node);
      }
      if (node.NT === NT.value_function) {
        if (node.value.return_type.NT === NT.type_union) {
          throw Errors.NotImplemented(NT.type_union);
        }
        if (node.value.return_type.NT === NT.type_tuple) {
          throw Errors.NotImplemented(NT.type_tuple);
        }
        if (node.value.return_type.NT === NT.type_raw)
          throw Errors.NotImplemented(NT.type_raw);
        return [
          chalk.magentaBright('function ') +
            chalk.blueBright(node.value.name) +
            ' defined at ' +
            chalk.greenBright(`"${node.location.format()}"`) +
            '.' +
            '\nReturn Type: ' +
            chalk.blue(
              typeof node.value.return_type.type === 'string'
                ? node.value.return_type.type
                : node.value.return_type.type.kind ===
                  LanguageObjectKind.instance
                ? 'not implemented'
                : node.value.return_type.type.display_name
            ) +
            '\nArguments:\n' +
            node.value.arguments
              .map(
                (a) =>
                  `- ${a.name}${a.is_optional ? '?:' : ':'} ${chalk.blue(
                    typeof (a.type as SingleTypeNode).type === 'string'
                      ? (a.type as SingleTypeNode).type
                      : ((a.type as SingleTypeNode).type as LanguageObject)
                          .display_name
                  )}`
              )
              .join(', '),
          -1,
        ];
      } else if (node.NT === NT.special) {
        throw Errors.NotImplemented('special');
      } else if (node.NT === NT.value_type) {
        if (typeof node.value === 'string')
          return [chalk.yellow(`<type:${node.value}>`), -1];

        if (node.value.kind === LanguageObjectKind.instance) {
          return [
            chalk.yellow(`<type:${node.value.name}>`) +
              ' @ ' +
              chalk.green(`${node.location.format()}`),
            -1,
          ];
        }
        return [
          chalk.yellow(`<type:${node.value.display_name}>`) +
            ' @ ' +
            chalk.green(`${node.value.location.format()}`),
          -1,
        ];
      } else if (node.value_type === Types.boolean.object) {
        if (node.value == 1) {
          return [chalk.magentaBright('true'), -1];
        } else {
          return [chalk.magentaBright('false'), -1];
        }
      } else if (
        node.value_type === Types.float.object ||
        node.value_type === Types.integer.object
      ) {
        return [chalk.blueBright(node.value), -1];
      } else if (node.value_type === Types.string.object) {
        if (node.value == undefined || typeof node.value !== 'string')
          throw Errors.ParserError('string is not a string.');
        return [chalk.white(node.value), -1];
      } else if (node.NT === NT.value_undefined) {
        return [chalk.magentaBright('undefined'), -1];
      } else if (node.value_type === Types.pointer.object) {
        if (node.value === NULL) {
          return [chalk.blueBright('<pointer:null>'), -1];
        } else {
          throw Errors.NotImplemented('pretty printing pointers');
        }
      } else if (node.NT === NT.value_array) {
        return [`[ ${node.value.map((val) => aux(val)[0]).join(', ')} ]`, -1];
      } else if (node.value_type.is_struct) {
        if (!(node.value instanceof Map)) {
          throw Errors.ParserError('struct with non struct value');
        }
        const max_field_length = Array.from(node.value.keys()).sort(
          (a, b) => b.length - a.length
        )[0].length;

        const visited_index = visited.indexOf(node);

        if (visited_index !== -1) {
          const circular_id = circular_refs[visited_index];
          if (circular_id == -1) {
            const new_id = circular_max_id++;
            circular_refs[visited_index] = new_id;
            return ['', new_id];
          } else {
            return ['', circular_id];
          }
        } else {
          visited.push(node);
          circular_refs.push(-1);
        }

        if (node.value_type.kind === LanguageObjectKind.instance)
          throw Errors.NotImplemented('instance');

        const res =
          chalk.blueBright(node.value_type.display_name) +
          '{\n' +
          Array.from(node.value.entries())
            .map((field) => {
              if (field[1].length > 1) throw Errors.NotImplemented('tuples');

              const [string, circ] = aux(field[1][0], indent + 2);

              return (
                '  ' +
                ' '.repeat(indent) +
                (field[0] + ':').padEnd(max_field_length + 2, ' ') +
                (circ !== -1 ? `circ[${circ}]` : string)
              );
            })
            .join(',\n') +
          '\n' +
          ' '.repeat(indent) +
          '}';

        const circ = circular_refs[visited.indexOf(node)];

        // TODO: fix circular ref that arises after the item was computed

        return [(circ !== -1 ? `[${circ}] ` : '') + res, circ];
      } else {
        throw Errors.NotImplemented(node.NT);
      }
    }

    const [string] = aux(node, 0);
    return string;
  }

  function findGotoLabelInContext(
    ctx: ContextNode,
    label: string
  ): StatementLabelNode | undefined {
    const label_node = ctx.members.find(
      (n) => n.NT === NT.statement_label && n.label === label
    );

    if (!label_node && ctx.parent)
      return findGotoLabelInContext(ctx.parent, label);

    return label_node as StatementLabelNode | undefined;
  }

  function execute_aux(
    ctx: ContextNode,
    starting_idx = 0,
    collect: boolean = true
  ): [boolean, ValueNode[]] {
    /**
     * ContextNode, curr_step, should_collect
     */
    let ctx_stack: [ContextNode, number, boolean][] = [];

    let curr_ctx = ctx;
    let idx = starting_idx;
    let should_collect = collect;

    while (idx <= curr_ctx.members.length) {
      if (idx == curr_ctx.members.length) {
        const prev = ctx_stack.pop();
        if (!prev) break;

        [curr_ctx, idx, should_collect] = prev;
        idx++;

        continue;
      }

      const branch = curr_ctx.members[idx];

      switch (branch.NT) {
        case NT.definition: {
          mem.add(branch);
          idx++;
          continue;
        }
        case NT.statement_label: {
          idx++;
          continue;
        }
        case NT.statement_debug: {
          if (!branch.member) throw Errors.ParserError();
          process.stdout.write(
            mem.parseExpression(branch.member).map(formatType).join(', ') + '\n'
          );
          idx++;
          continue;
        }
        case NT.expression: {
          mem.parseExpression(branch.member);
          idx++;
          continue;
        }
        case NT.statement_goto: {
          const label_node = findGotoLabelInContext(branch.ctx, branch.label);

          if (!label_node)
            throw Errors.ParserError(
              `Label "${branch.label}" was not found in context.`
            );

          while (curr_ctx.id != label_node.ctx.id && ctx_stack.length > 0) {
            curr_ctx = ctx_stack.pop()![0];
          }
          if (ctx_stack.length == 0 && curr_ctx.id !== label_node.ctx.id)
            throw Errors.ParserError();

          curr_ctx = label_node.ctx;
          idx = label_node.member_index;
          continue;
        }
        case NT.statement_if_else: {
          let c_idx = 0;
          let visited = false;

          while (c_idx < branch.children.length) {
            if (!branch.children[c_idx].child) throw Errors.ParserError();
            let condition = mem.parseExpression(
              branch.children[c_idx].condition
            );
            if (!condition[0].value) {
              c_idx++;
              continue;
            }

            branch.children[c_idx].child!.definitions.forEach((d) =>
              mem.add(d.node)
            );

            ctx_stack.push([curr_ctx, idx, should_collect]);

            curr_ctx = branch.children[c_idx].child!;
            idx = 0;
            should_collect = true;
            visited = true;
            break;
          }
          if (branch.default && c_idx == branch.children.length) {
            branch.default.child!.definitions.forEach((d) => mem.add(d.node));
            if (!branch.default.child) throw Errors.ParserError();

            ctx_stack.push([curr_ctx, idx, should_collect]);

            curr_ctx = branch.default.child;
            idx = 0;
            should_collect = true;
            visited = true;
          }
          if (!visited) idx++;
          continue;
        }
        case NT.statement_while: {
          if (!branch.child) throw Errors.ParserError();
          let condition = mem.parseExpression(branch.condition);
          while (condition[0].value) {
            condition = mem.parseExpression(branch.condition);
            if (!condition[0].value) break;
            const [should_return, return_value] = execute_aux(
              branch.child,
              0,
              true
            );
            if (should_return) return [false, return_value];
          }
          idx++;
          continue;
        }
        case NT.statement_return: {
          return [true, mem.parseExpression(branch.member)];
        }
        case NT.statement_exit: {
          if (!branch.member) process.exit(0);

          const exit_code = mem.parseExpression(branch.member)[0];

          if (exit_code.NT !== NT.value_num) {
            throw Errors.ParserError('wrong exit code');
          }
          if (exit_code.value === INFINITY || exit_code.value === NAN)
            throw Errors.ParserError();

          process.exit(exit_code.value);
        }
        case NT.context: {
          ctx_stack.push([curr_ctx, idx, should_collect]);
          curr_ctx = branch;
          idx = 0;
          should_collect = true;
          continue;
        }

        default: {
          throw Errors.NotImplemented(branch.NT);
        }
      }
    }

    return [false, []];
  }

  execute_aux(tree.root);
};
