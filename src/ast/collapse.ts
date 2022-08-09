/**
 * Removes extraneous branches.
 */

import { Errors } from '../errors';
import {
  ContextNode,
  DefinitionType as DT,
  Node,
  NodeType as NT,
} from '../syntax_tree_nodes';
import { TYPE_ANY, TYPE_UNKNOWN } from '../types';

export const collapse = (syntaxTree: ContextNode): ContextNode => {
  function recurse(node: Node | undefined): Node | undefined {
    if (!node) return undefined;
    switch (node.NT) {
      case NT.context: {
        for (let i = 0; i < node.members.length; i++) {
          node.members[i] = recurse(node.members[i]) as any;
        }
        return node;
      }
      case NT.definition: {
        if (node.DT === DT.function) {
          node.value.context = recurse(node.value.context) as any;
          node.value.return_type = recurse(node.value.return_type) as any;
          for (let i = 0; i < node.value.arguments.length; i++) {
            node.value.arguments[i].type = recurse(
              node.value.arguments[i].type
            ) as any;
          }
          return node;
        } else if (node.DT === DT.function_argument) {
          throw Errors.NotImplemented('function argument');
        } else if (node.DT === DT.struct) {
          throw Errors.NotImplemented('struct');
        }

        node.value = recurse(node.value) as any;
        return node;
      }
      case NT.expression: {
        if (!node.member) return undefined;
        if (node.member.NT === NT.expression) return recurse(node.member);
        node.member = recurse(node.member) as any;
        return node;
      }
      case NT.operator: {
        if (node.left) node.left = recurse(node.left);
        if (node.right) node.right = recurse(node.right);

        return node;
      }
      case NT.expression_list: {
        if (node.members.length === 1) {
          return recurse(node.members[0]);
        }

        for (let i = 0; i < node.members.length; i++) {
          node.members[i] = recurse(node.members[i]) as any;
        }
        return node;
      }
      case NT.expression_list_reference: {
        node.list = recurse(node.list) as any;
        return node;
      }
      case NT.statement_debug: {
        node.member = recurse(node.member) as any;
        return node;
      }
      case NT.statement_return: {
        node.member = recurse(node.member) as any;
        return node;
      }
      case NT.statement_if_else: {
        for (let i = 0; i < node.children.length; i++) {
          node.children[i] = recurse(node.children[i]) as any;
        }
        node.default = recurse(node.default) as any;
        return node;
      }
      case NT.statement_while: {
        node.condition = recurse(node.condition) as any;
        node.child = recurse(node.child) as any;
        return node;
      }
      case NT.condition_branch: {
        if (!node.is_default) node.condition = recurse(node.condition) as any;
        node.child = recurse(node.child) as any;
        return node;
      }
      case NT.object_reference:
      case NT.property_node:
      case NT.special:
      case NT.language_type:
      case NT.reference:
      case NT.statement_label:
      case NT.statement_goto:
      case NT.literal_string:
      case NT.literal_boolean:
      case NT.literal_builtin:
      case NT.literal_number: {
        return node;
      }
      case NT.struct_instance: {
        for (const field of node.fields) {
          field.value = recurse(field.value) as any;
        }
        return node;
      }
      case NT.type_union: {
        if (node.types.length === 0) throw Errors.ParserError('missing type');
        if (node.types.length === 1)
          return {
            NT: NT.type_single,
            type: node.types[0],
          };
        let has_unknown = false;
        let has_any = false;

        for (const type of node.types) {
          if (type === TYPE_ANY) has_any = true;
          if (type === TYPE_UNKNOWN) has_any = true;
        }

        if (has_unknown)
          return {
            NT: NT.type_single,
            type: TYPE_UNKNOWN,
          };
        if (has_any)
          return {
            NT: NT.type_single,
            type: TYPE_ANY,
          };

        return node;
      }
      case NT.type_single:
        return node;

      case NT.statement_exit: {
        node.member = recurse(node.member) as any;
        return node;
      }

      case NT.type_raw:
        return node;

      case NT.array: {
        if (!node.list) throw Errors.ParserError();
        for (let i = 0; i < node.list?.members.length; i++) {
          node.list.members[i] = recurse(node.list.members[i]) as any;
        }
        return node;
      }

      default:
        throw Errors.NotImplemented(node.NT);
    }
  }
  return recurse(syntaxTree) as ContextNode;
};
