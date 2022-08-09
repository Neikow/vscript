import chalk from 'chalk';
import { SyntaxTree } from '.';
import { Errors } from '../errors';
import { LanguageObjectKind, PropertyKind } from '../types/objects';
import { Types } from '../std/types';
import {
  ContextNode,
  DefinitionType as DT,
  LanguageDefinition,
  Node,
  NodeType as NT,
  OperatorNode,
  TypeNode,
  UnionTypeNode,
} from './nodes';
import {
  BranchParameters,
  TypeCheckResult,
  TYPE_ANY,
  TYPE_NEVER,
  TYPE_UNDEFINED,
  TYPE_UNKNOWN,
  TYPE_VOID,
} from '../types/types';
import TypeHelper from '../types/helper';

/**
 * Type checks the current tree.
 */
export const typeChecker = (tree: SyntaxTree) => {
  if (!tree.collapsed) tree.collapse();

  function isReturnNeeded(params: BranchParameters) {
    return (
      (params.return_type.NT === NT.type_single &&
        params.return_type.type !== TYPE_VOID) ||
      (params.return_type.NT === NT.type_union &&
        !params.return_type.types.includes(TYPE_VOID))
    );
  }

  let type_check_id = 0;

  function typeConstraintsFromDefinitions(
    definitions: Map<string, LanguageDefinition>,
    defaults: Map<number, TypeNode>
  ) {
    const res = new Map<number, TypeNode>();

    for (let def of definitions.values()) {
      def.node.type_check_id = type_check_id++;

      if (def.node.type && def.node.type.NT === NT.type_raw) {
        throw Errors.TypeCheckError(NT.type_raw);
      }

      res.set(
        def.node.type_check_id,
        def.node.type ?? {
          NT: NT.type_single,
          type: TYPE_NEVER,
        }
      );
    }

    return TypeHelper.mergeTypeConstraints([res], defaults);
  }

  function compileTypes(node: ContextNode) {
    node.definitions.forEach((def) => {
      if (def.child_type.NT === NT.type_raw) {
        def.node.type = TypeHelper.compileType(def.child_type);
        def.child_type = def.node.type;
      }
    });
  }

  function typeCheckObjects(node: ContextNode) {
    node.objects.forEach((obj) => {
      if (obj.size !== undefined) return;
      let size = 0;
      if (!obj.properties) return;

      obj.properties.forEach((prop) => {
        if (prop.kind === PropertyKind.value) {
          if (prop.type.NT === NT.type_raw)
            prop.type = TypeHelper.compileType(prop.type);
          size += TypeHelper.getTypeSize(prop.type);
        }
      });

      obj.size = size;
    });
  }

  function recurse(node: Node, params: BranchParameters): TypeCheckResult {
    switch (node.NT) {
      case NT.context: {
        compileTypes(node);
        typeCheckObjects(node);

        let type_constraints = typeConstraintsFromDefinitions(
          node.definitions,
          params.variable_types
        );

        let is_return_needed = isReturnNeeded(params);

        let context_has_return = false;

        let is_code_unreachable = false;

        for (let i = 0; i < node.members.length; i++) {
          if (is_code_unreachable)
            throw Errors.SyntaxError(`Extraneous code: ${node.members[i].NT}`);

          const res = recurse(node.members[i], {
            ...params,
            variable_types: type_constraints,
          });

          if (
            is_return_needed &&
            res.found_return &&
            res.found_return.success &&
            !res.found_return.partial
          ) {
            is_code_unreachable = true;
            context_has_return = true;
          }

          if (!res.success)
            return {
              success: false,
              found_return: false,
              type_constraints: undefined,
            };

          if (res.type_constraints) {
            type_constraints = res.type_constraints;
          }
        }

        return {
          success: true,
          found_return: {
            success: context_has_return,
            partial: !context_has_return,
            is_needed: is_return_needed,
            return_type: params.return_type,
          },
          type_constraints: type_constraints,
        };
      }

      case NT.function: {
        const is_return_needed =
          (node.return_type.NT === NT.type_single &&
            node.return_type.type !== TYPE_VOID) ||
          (node.return_type.NT === NT.type_union &&
            node.return_type.types.includes(TYPE_VOID));

        if (!node.context) throw Errors.ParserError('missing function body');

        const res = recurse(node.context, params);

        node.has_return = res.found_return && !res.found_return.partial;

        if (
          res.success &&
          (!is_return_needed || (res.found_return && !res.found_return.partial))
        ) {
          return {
            success: true,
            found_return: false,
            type_constraints: undefined,
          };
        } else {
          return {
            success: false,
            found_return: false,
            type_constraints: undefined,
          };
        }
      }

      case NT.statement_debug: {
        if (!node.member) throw Errors.ParserError('missing expression');
        return recurse(node.member, params);
      }

      case NT.definition: {
        switch (node.DT) {
          case DT.const:
          case DT.var: {
            if (node.type_check_id === undefined) {
              throw Errors.TypeCheckError('missing type check id');
            }
            if (node.type.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (node.type.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (node.type.NT === NT.type_raw) {
              throw Errors.TypeCheckError(NT.type_raw);
            }

            // default behavior, set variable type to value type if not specified.
            if (node.type.type === TYPE_UNKNOWN && node.value !== undefined) {
              const type_node = TypeHelper.getType(node.value, params);

              if (type_node.NT === NT.type_union) {
                throw Errors.NotImplemented(NT.type_union);
              }

              if (type_node.NT === NT.type_tuple) {
                throw Errors.NotImplemented(NT.type_union);
              }

              node.type =
                type_node.type == TYPE_VOID
                  ? {
                      NT: NT.type_single,
                      type: TYPE_UNKNOWN,
                    }
                  : type_node;

              params.variable_types.set(node.type_check_id, node.type);

              return {
                success: true,
                found_return: false,
                type_constraints: params.variable_types,
              };
            }
            // if definition has no expression to type check.
            if (node.value === undefined)
              return {
                success: true,
                found_return: false,
                type_constraints: undefined,
              };
            // check expression type against definition type.
            const expr_type = TypeHelper.getType(node.value, params);

            if (expr_type.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (expr_type.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              node.type.type !== TYPE_UNKNOWN &&
              node.type.type !== expr_type.type
            ) {
              // TODO: try casting to proper type.
              throw Errors.TypeError(node.location, node.type, expr_type);
            }
            return recurse(node.value, params);
          }
          case DT.function: {
            if (!node.value.context)
              throw Errors.ParserError('missing context on function');

            for (const arg of node.value.arguments) {
              arg.type = TypeHelper.compileType(arg.type);
            }

            if (node.value.return_type.NT === NT.type_raw) {
              node.value.return_type = TypeHelper.compileType(
                node.value.return_type
              );
            }

            const params_override: BranchParameters = {
              ...params,
              return_type: node.value.return_type,
            };

            return recurse(node.value, params_override);
          }
          default: {
            throw Errors.NotImplemented(node.NT);
          }
        }
      }
      case NT.statement_while: {
        if (!node.condition) throw Errors.ParserError('Missing condition.');
        if (!node.child) throw Errors.ParserError('Missing body.');
        const condition_type = TypeHelper.getType(node.condition, params);

        const [is_type_comparison, constraints] = TypeHelper.constrainType(
          node.condition,
          condition_type
        );

        const is_condition_valid = TypeHelper.canCast(condition_type, {
          NT: NT.type_single,
          type: Types.bool.object,
        });

        if (!is_condition_valid) throw Errors.SyntaxError('Wrong condition');

        const res = recurse(node.child, params);

        return {
          ...res,
          success: res.success && is_condition_valid,
        };
      }

      case NT.expression: {
        if (!node.member) throw Errors.ParserError('Missing expression');
        return recurse(node.member, params);
      }

      case NT.operator: {
        switch (node.op) {
          case 'add_assign': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands');
            const l_type = TypeHelper.getType(node.left, params);
            const r_type = TypeHelper.getType(node.right, params);

            if (l_type.NT === NT.type_union || r_type.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (l_type.NT === NT.type_tuple || r_type.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              typeof l_type.type === 'string' ||
              typeof r_type.type === 'string'
            ) {
              throw Errors.NotImplemented('string type');
            }

            if (l_type.type == r_type.type) {
              return {
                success: true,
                found_return: false,
                type_constraints: undefined,
              };
            } else {
              throw Errors.NotImplemented(
                `different types: ${l_type} & ${r_type}`
              );
            }
          }
          case 'sub_assign': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands');
            const l_type = TypeHelper.getType(node.left, params);
            const r_type = TypeHelper.getType(node.right, params);

            if (l_type.NT === NT.type_union || r_type.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (l_type.NT === NT.type_tuple || r_type.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              typeof l_type.type === 'string' ||
              typeof r_type.type === 'string'
            ) {
              throw Errors.NotImplemented('string type');
            }

            if (
              l_type.type == r_type.type &&
              (l_type.type == Types.uint.object ||
                l_type.type === Types.float.object)
            ) {
              return {
                success: true,
                found_return: false,
                type_constraints: undefined,
              };
            } else {
              throw Errors.NotImplemented(
                `different types: ${l_type} & ${r_type}`
              );
            }
          }
          case 'sub': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (!node.right) throw Errors.ParserError('Missing right operand');

            const r_type = TypeHelper.getType(node.right, params);
            const l_type = TypeHelper.getType(node.left, params);

            if (r_type.NT === NT.type_union || l_type.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (l_type.NT === NT.type_tuple || r_type.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              typeof l_type.type === 'string' ||
              typeof r_type.type === 'string'
            ) {
              throw Errors.NotImplemented('string type');
            }

            if (
              l_type.type !== Types.float.object &&
              l_type.type !== Types.uint.object
            )
              throw Errors.NotImplemented('non number types');

            if (r_type.type === l_type.type) {
              return {
                success: true,
                found_return: false,
                type_constraints: params.variable_types,
              };
            }

            return {
              success: false,
              found_return: false,
              type_constraints: undefined,
            };
          }
          case 'assign': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands');
            const l_type_node = TypeHelper.getType(node.left, params);
            const r_type_node = TypeHelper.getType(node.right, params);

            if (
              l_type_node.NT === NT.type_union ||
              r_type_node.NT == NT.type_union
            ) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              l_type_node.NT === NT.type_tuple ||
              r_type_node.NT === NT.type_tuple
            ) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              l_type_node.type == TYPE_UNKNOWN &&
              r_type_node.type !== TYPE_UNKNOWN &&
              r_type_node.type !== TYPE_ANY &&
              r_type_node.type !== TYPE_VOID &&
              r_type_node.type !== TYPE_UNDEFINED &&
              r_type_node.type !== TYPE_NEVER
            ) {
              const res = TypeHelper.setType(node.left, r_type_node.type);
              if (res) {
                return {
                  success: true,
                  found_return: false,
                  type_constraints: undefined,
                };
              }
            }

            if (l_type_node.type == r_type_node.type) {
              return {
                success: true,
                found_return: false,
                type_constraints: undefined,
              };
            } else {
              throw Errors.NotImplemented(
                `different types: ${TypeHelper.formatType(
                  l_type_node
                )} & ${TypeHelper.formatType(r_type_node)}`
              );
            }
          }
          case 'typeof': {
            if (node.left) throw Errors.ParserError('Wrond operand');
            if (!node.right) throw Errors.ParserError('Missing operand');

            return recurse(node.right, params);
          }

          case 'access_call': {
            if (!node.left) throw Errors.ParserError('Missing operand');
            if (
              node.left.NT === NT.reference &&
              node.left.definition.DT === DT.function
            ) {
              const func = node.left.definition.value;

              let args: Node[];
              if (!node.right) {
                args = [];
              } else if (node.right.NT === NT.expression_list) {
                args = node.right.members;
              } else if (node.right.NT === NT.expression) {
                if (!node.right.member)
                  throw Errors.ParserError('missing expression');
                args = [node.right.member];
              } else {
                throw Errors.ParserError('processed');
              }

              if (args.length > func.arguments.length)
                throw Errors.SyntaxError('Too many arguments');

              for (let i = 0; i < func.arguments.length; i++) {
                if (func.arguments[i].type.NT === NT.type_raw)
                  func.arguments[i].type = TypeHelper.compileType(
                    func.arguments[i].type
                  );

                if (!func.arguments[i].is_optional && !args[i]) {
                  throw Errors.SyntaxError(
                    `Missing mandatory argument ${chalk.blueBright(
                      func.arguments[i].name
                    )} of type ${chalk.magentaBright(
                      TypeHelper.formatType(func.arguments[i].type as TypeNode)
                    )} at ${chalk.green(
                      '"' + func.arguments[i].location.format() + '"'
                    )}.`
                  );
                }

                if (!args[i]) {
                  break;
                }

                const arg_type = TypeHelper.getType(args[i], params);

                const match = TypeHelper.typeMatch(
                  arg_type,
                  func.arguments[i].type as TypeNode
                );

                if (!match) {
                  const arg = args[i];
                  if (
                    arg.NT !== NT.expression &&
                    arg.NT !== NT.literal_string &&
                    arg.NT !== NT.literal_number &&
                    arg.NT !== NT.literal_builtin
                  )
                    throw Errors.ParserError(
                      `argument should be expression, got ${arg.NT}`
                    );
                  throw Errors.TypeError(
                    arg.location,
                    func.arguments[i].type as TypeNode,
                    arg_type
                  );
                }
              }
            }

            return {
              success: true,
              found_return: false,
              type_constraints: undefined,
            };
          }

          case 'access_property': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (!node.right) throw Errors.ParserError('Missing right operand');

            let res;

            if (
              node.left.NT === NT.operator &&
              node.left.op === 'access_property'
            ) {
              const leftRes = recurse(node.left, params);

              // TODO: implement proper type checking

              return leftRes;
            } else if (node.left.NT !== NT.reference)
              throw Errors.NotImplemented(node.left.NT);

            if (node.right.NT !== NT.property_node)
              throw Errors.ParserError('wrong node type');

            if (!node.left.definition.type)
              throw Errors.NotImplemented('missing type');

            if (node.left.definition.type.NT === NT.type_union) {
              if (node.left.definition.type_check_id === undefined)
                throw Errors.ParserError('missing type check id');
              if (
                !params.variable_types.has(node.left.definition.type_check_id)
              ) {
                throw Errors.MissingProperty(
                  node.left.definition.type,
                  node.right.value
                );
              }
              const new_type = params.variable_types.get(
                node.left.definition.type_check_id
              );

              if (node.left.definition.type === new_type) {
                for (const type of node.left.definition.type.types) {
                  if (typeof type === 'string')
                    throw Errors.NotImplemented(type);

                  if (type.kind === LanguageObjectKind.instance)
                    throw Errors.NotImplemented('instance');

                  if (!type.properties)
                    throw Errors.MissingProperty(
                      {
                        NT: NT.type_single,
                        type: type,
                      },
                      node.right.value
                    );

                  if (!type.properties.has(node.right.value))
                    throw Errors.MissingProperty(
                      {
                        NT: NT.type_single,
                        type: type,
                      },
                      node.right.value
                    );
                }

                return {
                  success: true,
                  found_return: false,
                  type_constraints: undefined,
                };
              }

              if (!new_type) throw Errors.ParserError();

              const new_node: OperatorNode = {
                ...node,
                left: {
                  ...node.left,

                  definition: { ...node.left.definition, type: new_type },
                },
              };
              return recurse(new_node, params);
            } else {
              if (
                node.left.definition.DT === DT.function_argument ||
                node.left.definition.DT === DT.struct ||
                node.left.definition.DT === DT.var ||
                node.left.definition.DT === DT.const
              ) {
                if (node.left.definition.type.NT === NT.type_raw)
                  throw Errors.NotImplemented(NT.type_raw);

                if (node.left.definition.type.NT === NT.type_tuple)
                  throw Errors.NotImplemented(NT.type_tuple);

                if (typeof node.left.definition.type.type === 'string') {
                  throw Errors.NotImplemented(
                    'undefined & any & unknown & void'
                  );
                }

                if (
                  node.left.definition.type.type.kind ===
                  LanguageObjectKind.instance
                )
                  throw Errors.NotImplemented('instance');

                if (!node.left.definition.type.type.properties) {
                  throw Errors.MissingProperty(
                    node.left.definition.type,
                    node.right.value
                  );
                }
                const object_property =
                  node.left.definition.type.type.properties.get(
                    node.right.value
                  );
                if (!object_property)
                  throw Errors.MissingProperty(
                    node.left.definition.type,
                    node.right.value
                  );
              }
              return {
                success: true,
                found_return: false,
                type_constraints: params.variable_types,
              };
            }
          }

          case 'add': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (!node.right) throw Errors.ParserError('Missing right operand');

            const r_type = TypeHelper.getType(node.right, params);
            const l_type = TypeHelper.getType(node.left, params);

            if (r_type.NT === NT.type_union || l_type.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (r_type.NT === NT.type_tuple || l_type.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (r_type.type === l_type.type) {
              return {
                success: true,
                found_return: false,
                type_constraints: params.variable_types,
              };
            }

            return {
              success: false,
              found_return: false,
              type_constraints: undefined,
            };
          }

          case 'incr':
          case 'decr': {
            if (node.right) throw Errors.ParserError('Wrong argument');
            if (!node.left) throw Errors.ParserError('Missing argument');

            const type_node = TypeHelper.getType(node.left, params);

            if (type_node.NT === NT.type_union)
              throw Errors.NotImplemented(NT.type_union);

            if (type_node.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              type_node.type === Types.float.object ||
              type_node.type === Types.uint.object
            ) {
              return {
                success: true,
                found_return: false,
                type_constraints: params.variable_types,
              };
            }

            return {
              success: false,
              found_return: false,
              type_constraints: undefined,
            };
          }

          case 'access_computed': {
            if (!node.left) throw Errors.ParserError('Missing target');
            if (!node.right)
              throw Errors.ParserError('Missing computed property');

            const target_type_node = TypeHelper.getType(node.left, params);

            if (target_type_node.NT !== NT.type_single) {
              throw Errors.NotImplemented(target_type_node.NT);
            }

            if (typeof target_type_node.type === 'string') {
              throw Errors.NotImplemented('string type');
            }

            if (target_type_node.type.kind !== LanguageObjectKind.instance) {
              throw Errors.TypeCheckError('wrong type');
            }

            if (target_type_node.type.object !== Types.array.object) {
              throw Errors.TypeCheckError('wrong type');
            }

            const index_type = TypeHelper.getType(node.right, params);

            if (index_type.NT !== NT.type_single) {
              throw Errors.NotImplemented(index_type.NT);
            }

            if (index_type.type !== Types.uint.object) {
              throw Errors.NotImplemented('non integer index');
            }

            return {
              success: true,
              found_return: false,
              type_constraints: undefined,
            };
          }

          default:
            throw Errors.NotImplemented(node.op);
        }
      }

      case NT.statement_if_else: {
        let success = true;

        const is_return_needed = isReturnNeeded(params);
        let has_returns: TypeCheckResult['found_return'][] = [];
        const block_type_constraints: Map<number, TypeNode>[] = [];

        for (const branch of node.children) {
          if (branch.NT !== NT.condition_branch) throw Errors.ParserError();

          if (!branch.child) throw Errors.ParserError('Missing body.');

          // if & if else clauses
          if (!branch.condition) throw Errors.ParserError('Missing condition.');

          const condition_type_node = TypeHelper.getType(
            branch.condition,
            params
          );
          const [is_type_comparison, constraints] = TypeHelper.constrainType(
            branch.condition,
            condition_type_node
          );

          const is_condition_valid = TypeHelper.canCast(condition_type_node, {
            NT: NT.type_single,
            type: Types.bool.object,
          });

          const res = recurse(branch.child, {
            ...params,
            variable_types: constraints,
          });

          success &&= res.success && is_condition_valid;
          has_returns.push(res.found_return);

          if (res.type_constraints)
            block_type_constraints.push(res.type_constraints);
        }

        const else_constraint = TypeHelper.mergeTypeConstraints(
          block_type_constraints,
          params.variable_types
        );

        // else clause
        if (node.default) {
          if (!node.default.child) throw Errors.SyntaxError('missing body');
          const res = recurse(node.default.child, params);

          success &&= res.success;
          has_returns.push(res.found_return);

          if (res.type_constraints)
            block_type_constraints.push(res.type_constraints);
        }

        return {
          success: success,
          found_return: {
            success: has_returns.every((r) => r && r.success),
            partial: has_returns.some((r) => r && r.partial),
            return_type: params.return_type,
            is_needed: is_return_needed,
          },
          type_constraints: undefined,
        };
      }

      case NT.statement_return: {
        if (node.parent.return_type.NT === NT.type_union) {
          if (!node.member) throw Errors.SyntaxError('Missing expression');

          const value_type = TypeHelper.getType(node.member, params);

          if (value_type.NT === NT.type_tuple)
            throw Errors.NotImplemented(NT.type_tuple);

          const type_list =
            value_type.NT === NT.type_single
              ? [value_type.type]
              : value_type.types;

          const res = type_list.every((t) =>
            (node.parent.return_type as UnionTypeNode).types.includes(t)
          );

          if (res) {
            return {
              success: true,
              found_return: {
                success: true,
                is_needed: isReturnNeeded(params),
                partial: false,
                // TODO: update parent return type with new value
                return_type: node.parent.return_type,
              },
              type_constraints: undefined,
            };
          } else {
            return {
              success: false,
              found_return: false,
              type_constraints: undefined,
            };
          }
        }

        if (node.parent.return_type.NT === NT.type_raw)
          throw Errors.NotImplemented(NT.type_raw);

        if (node.parent.return_type.NT === NT.type_tuple)
          throw Errors.NotImplemented(NT.type_tuple);

        // TODO: Changed != to == (code may be broken)
        if (!node.member && node.parent.return_type.type == TYPE_VOID) {
          return {
            success: true,
            found_return: {
              success: true,
              is_needed: isReturnNeeded(params),
              partial: false,
              return_type: node.parent.return_type,
            },
            type_constraints: undefined,
          };
        } else if (!node.member) {
          throw Errors.TypeError(node.location, node.parent.return_type, {
            NT: NT.type_single,
            type: TYPE_VOID,
          });
        }
        const value_type = TypeHelper.getType(node.member, params);

        if (value_type.NT === NT.type_union) {
          throw Errors.NotImplemented(NT.type_union);
        }

        if (value_type.NT === NT.type_tuple) {
          throw Errors.NotImplemented(NT.type_tuple);
        }

        if (value_type.type !== node.parent.return_type.type) {
          throw Errors.TypeError(
            node.location,
            node.parent.return_type,
            value_type
          );
        }
        return {
          success: true,
          found_return: {
            success: true,
            is_needed: isReturnNeeded(params),
            partial: false,
            return_type: node.parent.return_type,
          },
          type_constraints: undefined,
        };
      }

      case NT.reference: {
        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.object_reference: {
        // TODO: dunno
        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.struct_instance: {
        const struct_type = TypeHelper.getType(node, params);

        if (struct_type.NT === NT.type_union) {
          throw Errors.NotImplemented(NT.type_union);
        }

        if (struct_type.NT === NT.type_tuple) {
          throw Errors.NotImplemented(NT.type_tuple);
        }

        return {
          success: struct_type.type == node.object.value,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.statement_exit: {
        if (!node.member)
          return {
            success: true,
            found_return: false,
            type_constraints: undefined,
          };

        const expression_type = TypeHelper.getType(node.member, params);

        if (expression_type.NT === NT.type_union) {
          throw Errors.NotImplemented(NT.type_union);
        }

        if (expression_type.NT === NT.type_tuple) {
          throw Errors.NotImplemented(NT.type_tuple);
        }

        if (expression_type.type !== Types.uint.object)
          throw Errors.TypeError(
            node.location,
            {
              NT: NT.type_single,
              type: Types.uint.object,
            },
            expression_type
          );

        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.literal_string: {
        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.expression_list: {
        for (const expression of node.members) {
          const res = recurse(expression, params);
          if (!res.success) throw Errors.TypeCheckError('');
        }
        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.array: {
        // TODO: dunno
        console.debug('dunno array ');
        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.literal_number: {
        return {
          success: true,
          found_return: false,
          type_constraints: undefined,
        };
      }

      case NT.special: {
        switch (node.value) {
          case 'dump_mem': {
            return {
              success: true,
              found_return: false,
              type_constraints: undefined,
            };
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

  const params: BranchParameters = {
    variable_types: new Map<number, TypeNode>(),
    return_type: {
      NT: NT.type_union,
      types: [TYPE_VOID],
    },
  };

  return recurse(tree.root, params);
};
