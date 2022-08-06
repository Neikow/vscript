import { Errors } from './errors';
import {
  DefinitionType as DT,
  Node,
  NodeType as NT,
  OperatorNode,
  ReferenceNode,
  SingleTypeNode,
  TypeNode,
  UnionTypeNode,
} from './syntax_tree_nodes';

import chalk from 'chalk';
import {
  LanguageObject,
  LanguageObjectInstance,
  LanguageObjectKind,
  ObjectProperty,
  PropertyKind,
} from './objects';
import VSCTypeBool from './std/types/bool';
import VSCTypeFlt from './std/types/flt';
import VSCTypeInt from './std/types/int';
import VSCTypeStr from './std/types/str';
import VSCTypeArr from './std/types/arr';
import {
  BranchParameters,
  Location,
  TYPE_ANY,
  TYPE_NEVER,
  TYPE_UNDEFINED,
  TYPE_UNKNOWN,
  TYPE_VOID,
  UNDEFINED,
} from './types';
import { Types } from './std/types';

let GLOBAL_NODE_ID = 0;

const TypeHelper = {
  getId: (): number => {
    return GLOBAL_NODE_ID++;
  },
  getType: (node: Node, params: BranchParameters | undefined): TypeNode => {
    switch (node.NT) {
      case NT.expression: {
        if (node.member) return TypeHelper.getType(node.member, params);

        throw Errors.ParserError('missing expression');
      }
      case NT.literal_string:
      case NT.literal_boolean:
      case NT.literal_number: {
        return {
          NT: NT.type_single,
          type: node.value_type,
        };
      }
      case NT.reference: {
        if (
          node.definition.DT === DT.var ||
          node.definition.DT === DT.function_argument ||
          node.definition.DT === DT.const
        ) {
          if (node.definition.type_check_id === undefined)
            throw Errors.TypeCheckError('missing type check id');

          const type_override = params
            ? params.variable_types.get(node.definition.type_check_id)
            : undefined;

          if (type_override) return type_override;

          if (node.definition.type.NT === NT.raw_type)
            throw Errors.NotImplemented(NT.raw_type);

          return node.definition.type;
        }

        throw Errors.NotImplemented(`Definition type: ${node.definition.DT}.`);
      }
      case NT.object_reference: {
        return { NT: NT.type_single, type: node.value };
      }
      case NT.operator: {
        switch (node.op) {
          case 'add_assign': {
            if (!node.left) throw Errors.ParserError('Missing left operand.');
            if (!node.right) throw Errors.ParserError('Missing right operand.');
            const lType = TypeHelper.getType(node.left, params);
            const rType = TypeHelper.getType(node.right, params);
            if (lType == rType) {
              return lType;
            } else {
              throw Errors.NotImplemented('add_assign different types');
            }
          }
          case 'geq':
          case 'leq':
          case 'gt':
          case 'lt': {
            if (!node.left) throw Errors.ParserError('Missing left operand.');
            if (!node.right) throw Errors.ParserError('Missing right operand.');
            const lType = TypeHelper.getType(node.left, params);
            const rType = TypeHelper.getType(node.right, params);

            if (lType.NT === NT.type_union || rType.NT === NT.type_union)
              throw Errors.NotImplemented(NT.type_union);

            if (lType.NT === NT.type_tuple || rType.NT === NT.type_tuple)
              throw Errors.NotImplemented(NT.type_union);

            if (
              typeof lType.type === 'string' ||
              typeof rType.type === 'string'
            ) {
              throw Errors.NotImplemented('string type');
            }

            if (lType.type == rType.type) {
              return lType;
            } else {
              throw Errors.NotImplemented('gt | lt different types');
            }
          }
          case 'eq':
          case 'neq':
          case 'or':
          case 'xor':
          case 'and': {
            if (!node.left) throw Errors.ParserError('Missing left operand.');
            if (!node.right) throw Errors.ParserError('Missing right operand.');
            return {
              NT: NT.type_single,
              type: VSCTypeBool.object,
            };
          }
          case 'not': {
            if (!node.right) throw Errors.ParserError('Missing right operand');
            if (node.left) throw Errors.ParserError('Wrong operand');

            return {
              NT: NT.type_single,
              type: VSCTypeBool.object,
            };
          }
          case 'access_call': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (node.left.NT === NT.special) {
              if (node.left.value === 'console_input') {
                return {
                  NT: NT.type_single,
                  type: VSCTypeStr.object,
                };
              } else {
                throw Errors.NotImplemented('special');
              }
            } else if (node.left.NT === NT.language_type) {
              if (
                node.left.definition.construct.value.return_type.NT ===
                NT.raw_type
              )
                throw Errors.NotImplemented(NT.raw_type);
              return node.left.definition.construct.value.return_type;
            } else {
              if (
                node.left.NT === NT.reference &&
                node.left.definition.DT == DT.function
              ) {
                if (node.left.definition.value.return_type.NT === NT.raw_type)
                  throw Errors.NotImplemented(NT.raw_type);
                return node.left.definition.value.return_type;
              } else throw Errors.NotImplemented('call');
            }
          }
          case 'access_property': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (!node.right) throw Errors.ParserError('Missing right operand');
            if (node.right.NT !== NT.property_node)
              throw Errors.ParserError('Wrong node type');
            const target_type_node = TypeHelper.getType(node.left, params);

            if (target_type_node.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_tuple);
            }

            if (target_type_node.NT === NT.type_union) {
              const property_types: SingleTypeNode['type'][] = [];

              for (const type of target_type_node.types) {
                if (typeof type == 'string') throw Errors.NotImplemented();

                if (type.kind === LanguageObjectKind.instance)
                  throw Errors.NotImplemented('instance');

                if (!type.properties)
                  throw Errors.MissingProperty(
                    { NT: NT.type_single, type: type },
                    node.right.value
                  );

                const res = type.properties.get(node.right.value);

                if (!res)
                  throw Errors.MissingProperty(
                    { NT: NT.type_single, type: type },
                    node.right.value
                  );

                if (res.kind === PropertyKind.type) {
                  throw Errors.NotImplemented(PropertyKind.type);
                }

                if (res.type.NT === NT.raw_type)
                  throw Errors.NotImplemented(NT.raw_type);

                if (res.type.NT === NT.type_tuple)
                  throw Errors.NotImplemented(NT.type_tuple);

                if (res.type.NT === NT.type_single) {
                  if (!property_types.includes(res.type.type))
                    property_types.push(res.type.type);
                } else {
                  for (const type of res.type.types) {
                    if (!property_types.includes(type))
                      property_types.push(type);
                  }
                }
              }
              for (const type of [TYPE_NEVER, TYPE_UNKNOWN, TYPE_ANY]) {
                if (property_types.some((t) => t === type)) {
                  return {
                    NT: NT.type_single,
                    type: type,
                  };
                }
              }

              if (property_types.length == 1) {
                return {
                  NT: NT.type_single,
                  type: property_types[0],
                };
              } else {
                return {
                  NT: NT.type_union,
                  types: property_types,
                };
              }
            }

            if (
              target_type_node.type == TYPE_ANY ||
              target_type_node.type == TYPE_UNKNOWN ||
              target_type_node.type == TYPE_VOID ||
              target_type_node.type == TYPE_UNDEFINED ||
              target_type_node.type == TYPE_NEVER
            )
              throw Errors.NotImplemented('any & unknown & void & undefined');

            if (target_type_node.type.kind === LanguageObjectKind.instance) {
              if (!target_type_node.type.object.properties) {
                throw Errors.SyntaxError('Object has no properties to access.');
              }

              const value = target_type_node.type.object.properties.get(
                node.right.value
              );

              if (!value) {
                throw Errors.MissingProperty(
                  target_type_node,
                  node.right.value
                );
              }

              if (value.kind === PropertyKind.type) {
                throw Errors.NotImplemented(PropertyKind.type);
              }

              if (value.type.NT === NT.raw_type) {
                throw Errors.NotImplemented(NT.raw_type);
              }

              return value.type;
            }

            if (!target_type_node.type.properties) {
              throw Errors.SyntaxError('Object has no properties to access.');
            }
            const value = target_type_node.type.properties.get(
              node.right.value
            );

            if (!value) {
              throw Errors.MissingProperty(target_type_node, node.right.value);
            }
            if (value.kind === PropertyKind.type) {
              throw Errors.NotImplemented(PropertyKind.type);
            }

            if (value.type.NT === NT.raw_type) {
              throw Errors.NotImplemented(NT.raw_type);
            }

            return value.type;
          }

          case 'mul': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands.');

            const lTypeNode = TypeHelper.getType(node.left, params);
            const rTypeNode = TypeHelper.getType(node.right, params);

            if (
              lTypeNode.NT === NT.type_union ||
              rTypeNode.NT === NT.type_union
            ) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              lTypeNode.NT === NT.type_tuple ||
              rTypeNode.NT === NT.type_tuple
            ) {
              throw Errors.NotImplemented(NT.type_tuple);
            }

            if (
              rTypeNode.type == VSCTypeInt.object &&
              lTypeNode.type == VSCTypeInt.object
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeInt.object,
              };
            } else if (
              (rTypeNode.type == VSCTypeFlt.object ||
                rTypeNode.type === VSCTypeInt.object) &&
              (lTypeNode.type == VSCTypeFlt.object ||
                lTypeNode.type === VSCTypeInt.object)
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeFlt.object,
              };
            } else if (
              lTypeNode.type == VSCTypeStr.object &&
              rTypeNode.type == VSCTypeInt.object
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeStr.object,
              };
            } else throw Errors.NotImplemented();
          }

          case 'add': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands.');

            const lTypeNode = TypeHelper.getType(node.left, params);
            const rTypeNode = TypeHelper.getType(node.right, params);

            if (
              lTypeNode.NT === NT.type_union ||
              rTypeNode.NT === NT.type_union
            ) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              lTypeNode.NT === NT.type_tuple ||
              rTypeNode.NT === NT.type_tuple
            ) {
              throw Errors.NotImplemented(NT.type_tuple);
            }

            if (
              rTypeNode.type == VSCTypeInt.object &&
              lTypeNode.type == VSCTypeInt.object
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeInt.object,
              };
            } else if (
              (rTypeNode.type == VSCTypeFlt.object ||
                rTypeNode.type === VSCTypeInt.object) &&
              (lTypeNode.type == VSCTypeFlt.object ||
                lTypeNode.type === VSCTypeInt.object)
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeFlt.object,
              };
            } else if (
              lTypeNode.type == VSCTypeStr.object &&
              rTypeNode.type == VSCTypeInt.object
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeStr.object,
              };
            }

            throw Errors.NotImplemented();
          }

          case 'sub': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands.');

            const lTypeNode = TypeHelper.getType(node.left, params);
            const rTypeNode = TypeHelper.getType(node.right, params);

            if (
              lTypeNode.NT === NT.type_union ||
              rTypeNode.NT === NT.type_union
            ) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              lTypeNode.NT === NT.type_tuple ||
              rTypeNode.NT === NT.type_tuple
            ) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              rTypeNode.type == VSCTypeInt.object &&
              lTypeNode.type == VSCTypeInt.object
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeInt.object,
              };
            } else if (
              (rTypeNode.type == VSCTypeFlt.object ||
                rTypeNode.type === VSCTypeInt.object) &&
              (lTypeNode.type == VSCTypeFlt.object ||
                lTypeNode.type === VSCTypeInt.object)
            ) {
              return {
                NT: NT.type_single,
                type: VSCTypeFlt.object,
              };
            }

            throw Errors.NotImplemented();
          }

          case 'usub': {
            if (!node.right) throw Errors.ParserError('Missing right operand');
            if (node.left) throw Errors.ParserError('Wrong operand');

            const rTypeNode = TypeHelper.getType(node.right, params);

            if (rTypeNode.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (rTypeNode.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              rTypeNode.type === VSCTypeInt.object ||
              rTypeNode.type === VSCTypeFlt.object
            ) {
              return {
                NT: NT.type_single,
                type: rTypeNode.type,
              };
            }

            throw Errors.NotImplemented('usub');
          }

          case 'incr':
          case 'decr': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (node.right) throw Errors.ParserError('Wrong operand');

            const lTypeNode = TypeHelper.getType(node.left, params);

            if (lTypeNode.NT === NT.type_union) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (lTypeNode.NT === NT.type_tuple) {
              throw Errors.NotImplemented(NT.type_union);
            }

            if (
              lTypeNode.type === VSCTypeInt.object ||
              lTypeNode.type === VSCTypeFlt.object
            ) {
              return {
                NT: NT.type_single,
                type: lTypeNode.type,
              };
            }

            throw Errors.NotImplemented('incr | decr');
          }

          default: {
            throw Errors.NotImplemented(node.op);
          }
        }
      }

      case NT.struct_instance: {
        if (!node.object.value.is_struct)
          throw Errors.SyntaxError(
            'Trying to build a struct from a non struct object.'
          );

        const remaining_struct_fields: [string, ObjectProperty][] = Array.from(
          node.object.value.properties!.entries()
        );

        for (const field of node.fields) {
          let i = 0;
          let count = remaining_struct_fields.length;
          for (i; i < count; i++) {
            if (field.name == remaining_struct_fields[i][0]) {
              const value_type_node = TypeHelper.getType(field.value, params);
              if (value_type_node.NT === NT.type_union) {
                throw Errors.NotImplemented(NT.type_union);
              }

              if (value_type_node.NT === NT.type_tuple) {
                throw Errors.NotImplemented(NT.type_tuple);
              }

              const struct_field = remaining_struct_fields[i][1];

              if (struct_field.kind === PropertyKind.type)
                throw Errors.NotImplemented(PropertyKind.type);

              if (struct_field.type.NT == NT.type_union) {
                throw Errors.NotImplemented(NT.type_union);
              }

              if (struct_field.type.NT == NT.type_tuple) {
                throw Errors.NotImplemented(NT.type_tuple);
              }

              if (struct_field.type.NT === NT.raw_type)
                throw Errors.NotImplemented(NT.raw_type);

              if (
                // TODO: ugly .type.type
                struct_field.type.type == TYPE_ANY ||
                struct_field.type.type == value_type_node.type
              ) {
                remaining_struct_fields.splice(i, 1);
                break;
              } else if (value_type_node.type === TYPE_ANY) {
                const fulfilled = remaining_struct_fields.splice(i, 1);

                if (fulfilled[0][1].kind === PropertyKind.type)
                  throw Errors.NotImplemented(PropertyKind.type);

                if (fulfilled[0][1].type.NT === NT.type_union) {
                  throw Errors.NotImplemented(NT.type_union);
                }

                if (fulfilled[0][1].type.NT === NT.type_tuple) {
                  throw Errors.NotImplemented(NT.type_tuple);
                }

                if (fulfilled[0][1].type.NT === NT.raw_type) {
                  throw Errors.NotImplemented(NT.type_union);
                }

                TypeHelper.setType(
                  field.value,
                  // TODO: ugly .type.type
                  fulfilled[0][1].type.type as LanguageObject
                );
                break;
              } else {
                throw Errors.TypeError(
                  field.location,
                  struct_field.type,
                  value_type_node
                );
              }
            }
          }
          if (i == count)
            throw Errors.SyntaxError(`unknown field: ${field.name}`);
        }

        for (const remaining of remaining_struct_fields) {
          if (remaining[1].kind === PropertyKind.type)
            throw Errors.NotImplemented(PropertyKind.type);

          if (!remaining[1].optional)
            throw Errors.SyntaxError(
              `Missing required field: "${remaining[1].name}".`
            );
        }

        return {
          NT: NT.type_single,
          type: node.object.value,
        };
      }

      case NT.literal_builtin: {
        if (node.value === UNDEFINED) {
          return {
            NT: NT.type_single,
            type: TYPE_UNDEFINED,
          };
        } else {
          throw Errors.NotImplemented(node.value);
        }
      }

      case NT.array: {
        if (!node.list || node.list.members.length == 0)
          throw Errors.NotImplemented('0 sized array');
        const length = node.list.members.length;
        const array_type_node = TypeHelper.getType(
          node.list.members[0],
          params
        );

        if (
          array_type_node.NT === NT.type_union ||
          array_type_node.NT === NT.type_tuple
        )
          throw Errors.NotImplemented(array_type_node.NT);

        if (typeof array_type_node.type === 'string')
          throw Errors.NotImplemented('string type');

        for (let i = 1; i < length; i++) {
          const array_value_type_node = TypeHelper.getType(
            node.list.members[i],
            params
          );
          if (
            array_value_type_node.NT === NT.type_union ||
            array_value_type_node.NT === NT.type_tuple
          )
            throw Errors.NotImplemented(array_value_type_node.NT);

          if (array_type_node.type !== array_type_node.type)
            throw Errors.NotImplemented();
        }

        const type = VSCTypeArr.newInstance(
          {
            type: array_type_node.type,
          },
          {
            length: {
              NT: NT.value_num,
              location: Location.computed,
              is_builtin: false,
              value: length,
              value_type: VSCTypeInt.object,
            },
          }
        );
        node.value_type = type;

        return {
          NT: NT.type_single,
          type: type,
        };
      }

      case NT.special: {
        switch (node.value) {
          case 'dump_mem':
            return { NT: NT.type_single, type: Types.string.object };
          default: {
            throw Errors.NotImplemented(node.value);
          }
        }
      }

      case NT.expression_list: {
        const type_list: TypeNode[] = [];
        for (const mem of node.members) {
          const type = TypeHelper.getType(mem, params);
          type_list.push(type);
        }
        return {
          NT: NT.type_tuple,
          types: type_list,
        };
      }

      default: {
        throw Errors.NotImplemented(node.NT);
      }
    }
  },
  setType: (
    target: Node,
    value: LanguageObject | LanguageObjectInstance
  ): boolean => {
    switch (target.NT) {
      case NT.expression: {
        if (!target.member) throw Errors.ParserError('Missing expression');
        return TypeHelper.setType(target.member, value);
      }
      case NT.reference: {
        switch (target.definition.DT) {
          case DT.const: {
            throw Errors.ParserError('Trying to change a constant type.');
          }
          case DT.var: {
            target.definition.type = {
              NT: NT.type_single,
              type: value,
            };
            return true;
          }
          default: {
            throw Errors.NotImplemented(target.definition.DT);
          }
        }
      }
      case NT.literal_builtin: {
        target.value_type = value;
        return true;
      }

      default:
        throw Errors.NotImplemented(target.NT);
    }
  },
  formatType: (node: TypeNode, useColors = true) => {
    if (node.NT === NT.type_tuple) {
      throw Errors.NotImplemented(node.NT);
    }
    if (node.NT === NT.type_union) {
      return node.types
        .map((t) => {
          const str =
            typeof t == 'string'
              ? t
              : t.kind === LanguageObjectKind.instance
              ? t.name
              : t.display_name;
          return useColors ? chalk.magentaBright(str) : str;
        })
        .join(useColors ? chalk.redBright(' | ') : ' | ');
    } else {
      const str =
        typeof node.type == 'string'
          ? node.type
          : node.type.kind === LanguageObjectKind.instance
          ? node.type.name
          : node.type.display_name;
      return useColors ? chalk.magentaBright(str) : str;
    }
  },
  canCast: (type: TypeNode, target: TypeNode): boolean => {
    // TODO: yes
    return true;
    // if (target === VSCTypeBool.object) return true;
    // else throw Errors.NotImplemented(formatType(type));
  },
  typeMatch: (
    type_node: TypeNode,
    constraint: TypeNode
  ): TypeNode | undefined => {
    if (type_node.NT === NT.type_tuple)
      throw Errors.NotImplemented(NT.type_tuple);

    if (type_node.NT === NT.type_single) {
      if (constraint.NT === NT.type_single) {
        if (typeof type_node.type == 'string')
          throw Errors.NotImplemented(type_node.type);
        if (type_node.type == type_node.type) return type_node;
        return undefined;
      } else {
        for (const type of constraint.types) {
          if (type_node.type == type) {
            return type_node;
          }
        }
        return undefined;
      }
    }

    if (constraint.NT === NT.type_tuple)
      throw Errors.NotImplemented(NT.type_tuple);
    else if (constraint.NT === NT.type_single) {
      return undefined;
    } else {
      const types = type_node.types.filter((type) =>
        constraint.types.includes(type)
      );
      if (types.length < type_node.types.length) {
        throw Errors.TypeError(Location.computed, type_node, constraint);
      }

      return { NT: NT.type_union, types: types };
    }
  },
  constrainType: (
    node: Node,
    base_type: TypeNode
  ): [boolean, Map<number, TypeNode>] => {
    function isTypeOfNode(
      node: Node
    ): [true, OperatorNode] | [false, undefined] {
      switch (node.NT) {
        case NT.operator: {
          if (node.op === 'typeof') {
            if (!node.right) throw Errors.ParserError('missing expression');
            return [true, node];
          } else return [false, undefined];
        }
        case NT.expression: {
          if (!node.member) throw Errors.ParserError('missing expression');
          return isTypeOfNode(node.member);
        }
        case NT.reference: {
          return [false, undefined];
        }

        default:
          throw Errors.NotImplemented(node.NT);
      }
    }

    function isTypeNode(
      node: Node
    ): [true, UnionTypeNode['types']] | [false, undefined] {
      switch (node.NT) {
        case NT.expression: {
          if (!node.member) throw Errors.ParserError('missing expression');
          return isTypeNode(node.member);
        }
        case NT.object_reference: {
          return [true, [node.value]];
        }
        case NT.language_type: {
          return [true, [node.definition.object]];
        }

        default:
          throw Errors.NotImplemented(node.NT);
      }
    }

    function getReferenceNode(node: Node): ReferenceNode {
      switch (node.NT) {
        case NT.expression: {
          if (!node.member) throw Errors.ParserError('missing expression');
          return getReferenceNode(node.member);
        }
        case NT.reference:
          return node;
        default:
          throw Errors.NotImplemented(node.NT);
      }
    }

    // typeof x == str && typeof y == int

    // [ [id<x>, [str]], [id<y>, [int]] ]

    const id_to_index_map = new Map<number, number>();
    const constraints_pool: [number, UnionTypeNode['types']][] = [];

    function aux(node: Node, selector: 'and' | 'or' | undefined): boolean {
      switch (node.NT) {
        case NT.expression: {
          if (!node.member) throw Errors.ParserError('missing expression');
          return aux(node.member, selector);
        }

        case NT.reference: {
          return false;
        }

        case NT.literal_boolean: {
          return false;
        }

        case NT.operator: {
          switch (node.op) {
            case 'neq':
            case 'eq': {
              if (!node.left || !node.right)
                throw Errors.ParserError('missing operands');

              const [is_left_typeof, typeof_node] = isTypeOfNode(node.left);

              if (is_left_typeof) {
                const [is_right_type_node, type_node] = isTypeNode(node.right);

                if (is_left_typeof && is_right_type_node) {
                  // TODO: put constraints on left;
                  const reference = getReferenceNode(typeof_node!.right!);
                  if (reference.definition.type_check_id == undefined)
                    throw Errors.ParserError('Missing type check id.');

                  id_to_index_map.set(
                    reference.definition.type_check_id,
                    constraints_pool.push([
                      reference.definition.type_check_id,
                      type_node!,
                    ])
                  );

                  return true;
                }
              }
            }

            case 'leq':
            case 'geq':
            case 'lt':
            case 'gt': {
              // FIXME: implement gt & lt
              return true;
            }

            default:
              throw Errors.NotImplemented(node.op);
          }
        }

        default: {
          throw Errors.NotImplemented(node.NT);
        }
      }
    }

    return [
      aux(node, undefined),
      new Map<number, TypeNode>(
        constraints_pool.map(([id, types]) =>
          types.length == 1
            ? [id, { NT: NT.type_single, type: types[0] }]
            : [id, { NT: NT.type_union, types: types }]
        )
      ),
    ];
  },
  mergeTypeConstraints: (
    constraints: Map<number, TypeNode>[],
    defaults: Map<number, TypeNode>
  ): Map<number, TypeNode> => {
    const res = defaults;

    for (const constrain of constraints) {
      for (const [id, val] of constrain.entries()) {
        const current = res.get(id);

        if (!current) {
          res.set(id, val);
          continue;
        }

        if (current.NT === NT.type_tuple)
          throw Errors.NotImplemented(NT.type_tuple);

        if (val.NT === NT.type_tuple)
          throw Errors.NotImplemented(NT.type_tuple);

        if (current.NT === NT.type_union) {
          const new_val = current.types.filter(
            (e) =>
              !(val.NT === NT.type_single ? [val.type] : val.types).includes(e)
          );
          if (new_val.length == 0) {
            res.set(id, {
              NT: NT.type_single,
              type: TYPE_NEVER,
            });
          } else if (new_val.length == 1) {
            res.set(id, {
              NT: NT.type_single,
              type: new_val[0],
            });
          } else {
            res.set(id, {
              NT: NT.type_union,
              types: new_val,
            });
          }
          continue;
        }

        if (current.NT === NT.type_single) {
          if (val.NT === NT.type_union) {
            throw Errors.NotImplemented(val.NT);
          }
          if (current.type === val.type) {
            res.set(id, {
              NT: NT.type_single,
              type: TYPE_NEVER,
            });
            continue;
          } else {
            throw Errors.TypeError(Location.computed, val, current);
          }
        }

        throw Errors.NotImplemented();
      }
    }

    return res;
  },
};

export default TypeHelper;
