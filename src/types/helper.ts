import { Errors } from '../errors';
import {
  BooleanLiteralNode,
  DefinitionType as DT,
  ExpressionNode,
  Node,
  NodeType as NT,
  NumberLiteralNode,
  OperatorNode,
  RawTypeNode,
  ReferenceNode,
  SingleTypeNode,
  StringLiteralNode,
  TypeNode,
  UnionTypeNode,
} from '../ast/nodes';

import chalk from 'chalk';
import {
  LanguageObject,
  LanguageObjectInstance,
  LanguageObjectKind,
  ObjectProperty,
  ObjectTypeProperty,
  PropertyKind,
} from './objects';
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
import { Types } from '../std/types';

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

          if (node.definition.type.NT === NT.type_raw)
            throw Errors.NotImplemented(NT.type_raw);

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
              type: Types.bool.object,
            };
          }
          case 'not': {
            if (!node.right) throw Errors.ParserError('Missing right operand');
            if (node.left) throw Errors.ParserError('Wrong operand');

            return {
              NT: NT.type_single,
              type: Types.bool.object,
            };
          }
          case 'access_call': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (node.left.NT === NT.special) {
              if (node.left.value === 'console_input') {
                return {
                  NT: NT.type_single,
                  type: Types.string.object,
                };
              } else {
                throw Errors.NotImplemented('special');
              }
            } else if (node.left.NT === NT.language_type) {
              if (
                node.left.definition.construct.value.return_type.NT ===
                NT.type_raw
              )
                throw Errors.NotImplemented(NT.type_raw);
              return node.left.definition.construct.value.return_type;
            } else {
              if (
                node.left.NT === NT.reference &&
                node.left.definition.DT == DT.function
              ) {
                if (node.left.definition.value.return_type.NT === NT.type_raw)
                  throw Errors.NotImplemented(NT.type_raw);
                return node.left.definition.value.return_type;
              } else {
                const type = TypeHelper.getType(node.left, undefined);
                if (type.NT !== NT.type_single) throw Errors.NotImplemented();
                if (typeof type.type === 'string')
                  throw Errors.NotImplemented();
                if (type.type.kind !== LanguageObjectKind.instance)
                  throw Errors.NotImplemented();

                if (!type.type.type_properties) throw Errors.ParserError();

                const res = type.type.type_properties.get('return_type');
                if (!res) throw Errors.ParserError();

                return {
                  NT: NT.type_single,
                  type: res as LanguageObject | LanguageObjectInstance,
                };
              }
            }
          }

          case 'access_computed': {
            if (!node.left) throw Errors.ParserError('Missing left operand');
            if (!node.right) throw Errors.ParserError('Missing right operand');

            const target_type_node = TypeHelper.getType(node.left, params);
            if (
              target_type_node.NT === NT.type_union ||
              target_type_node.NT === NT.type_tuple
            )
              throw Errors.NotImplemented();

            if (typeof target_type_node.type === 'string')
              throw Errors.NotImplemented(
                TypeHelper.formatType(target_type_node)
              );

            if (
              target_type_node.type.kind === LanguageObjectKind.instance &&
              target_type_node.type.object === Types.array.object
            ) {
              const computed_type = TypeHelper.getType(node.right, params);

              if (computed_type.NT !== NT.type_single)
                throw Errors.NotImplemented(computed_type.NT);

              if (computed_type.type !== Types.u64.object)
                throw Errors.TypeError(
                  (node.right as unknown as ExpressionNode).location,
                  { NT: NT.type_single, type: Types.u64.object },
                  computed_type
                );

              if (!target_type_node.type.properties_overrides)
                throw Errors.ParserError();

              const val = target_type_node.type.properties_overrides.get(
                '$type'
              ) as ObjectTypeProperty;

              if (!val) throw Errors.ParserError();

              return val.type;
            }

            throw Errors.NotImplemented();
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

                if (res.type.NT === NT.type_raw)
                  throw Errors.NotImplemented(NT.type_raw);

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

            if (typeof target_type_node.type === 'string')
              throw Errors.NotImplemented(
                TypeHelper.formatType(target_type_node)
              );

            if (target_type_node.type.kind === LanguageObjectKind.instance) {
              if (!target_type_node.type.object.properties) {
                throw Errors.SyntaxError('Object has no properties to access.');
              }

              let value: ObjectProperty | undefined;
              if (target_type_node.type.properties_overrides) {
                value = target_type_node.type.properties_overrides!.get(
                  node.right.value
                );
              }
              if (!value) {
                value = target_type_node.type.object.properties.get(
                  node.right.value
                );
              }

              if (!value) {
                throw Errors.MissingProperty(
                  target_type_node,
                  node.right.value
                );
              }

              if (value.kind === PropertyKind.type) {
                throw Errors.NotImplemented(PropertyKind.type);
              }

              if (value.type.NT === NT.type_raw) {
                throw Errors.NotImplemented(NT.type_raw);
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

            if (value.type.NT === NT.type_raw) {
              throw Errors.NotImplemented(NT.type_raw);
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
              rTypeNode.type == Types.u64.object &&
              lTypeNode.type == Types.u64.object
            ) {
              return {
                NT: NT.type_single,
                type: Types.u64.object,
              };
            } else if (
              (rTypeNode.type == Types.u64.object ||
                rTypeNode.type === Types.u64.object) &&
              (lTypeNode.type == Types.f64.object ||
                lTypeNode.type === Types.f64.object)
            ) {
              return {
                NT: NT.type_single,
                type: Types.f64.object,
              };
            } else if (
              lTypeNode.type == Types.string.object &&
              rTypeNode.type == Types.u64.object
            ) {
              return {
                NT: NT.type_single,
                type: Types.string.object,
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
              rTypeNode.type == Types.u64.object &&
              lTypeNode.type == Types.u64.object
            ) {
              return {
                NT: NT.type_single,
                type: Types.u64.object,
              };
            } else if (
              (rTypeNode.type == Types.f64.object ||
                rTypeNode.type === Types.u64.object) &&
              (lTypeNode.type == Types.f64.object ||
                lTypeNode.type === Types.u64.object)
            ) {
              return {
                NT: NT.type_single,
                type: Types.f64.object,
              };
            } else if (
              lTypeNode.type == Types.string.object &&
              rTypeNode.type == Types.string.object
            ) {
              return {
                NT: NT.type_single,
                type: Types.string.object,
              };
            }

            throw Errors.NotImplemented(
              TypeHelper.formatType(lTypeNode) +
                ' and ' +
                TypeHelper.formatType(rTypeNode)
            );
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
              rTypeNode.type == Types.u64.object &&
              lTypeNode.type == Types.u64.object
            ) {
              return {
                NT: NT.type_single,
                type: Types.u64.object,
              };
            } else if (
              (rTypeNode.type == Types.f64.object ||
                rTypeNode.type === Types.u64.object) &&
              (lTypeNode.type == Types.f64.object ||
                lTypeNode.type === Types.u64.object)
            ) {
              return {
                NT: NT.type_single,
                type: Types.f64.object,
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
              rTypeNode.type === Types.u64.object ||
              rTypeNode.type === Types.f64.object
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
              lTypeNode.type === Types.u64.object ||
              lTypeNode.type === Types.f64.object
            ) {
              return {
                NT: NT.type_single,
                type: lTypeNode.type,
              };
            }

            throw Errors.NotImplemented('incr | decr');
          }
          case 'assign': {
            if (!node.left || !node.right)
              throw Errors.ParserError('Missing operands.');

            const lTypeNode = TypeHelper.getType(node.left, params);
            const rTypeNode = TypeHelper.getType(node.right, params);

            if (
              lTypeNode.NT !== NT.type_single ||
              rTypeNode.NT !== NT.type_single
            )
              throw Errors.NotImplemented();

            if (
              typeof lTypeNode.type === 'string' ||
              typeof rTypeNode.type === 'string'
            )
              throw Errors.NotImplemented();

            if (lTypeNode.type !== rTypeNode.type)
              throw Errors.TypeCheckError('');

            return lTypeNode;
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

              if (struct_field.type.NT === NT.type_raw)
                struct_field.type = TypeHelper.compileType(struct_field.type);

              if (struct_field.type.NT == NT.type_tuple) {
                throw Errors.NotImplemented(NT.type_tuple);
              }

              if (struct_field.type.NT == NT.type_union) {
                throw Errors.NotImplemented(NT.type_union);
              }

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

                if (fulfilled[0][1].type.NT === NT.type_raw) {
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

        const type = Types.array.newInstance(
          {
            type: array_type_node.type,
          },
          {
            length: {
              NT: NT.value_num,
              location: Location.computed,
              is_builtin: false,
              value: length,
              value_type: Types.u64.object,
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
  formatType: (node: TypeNode | RawTypeNode, useColors = true) => {
    if (node.NT === NT.type_tuple) {
      throw Errors.NotImplemented(node.NT);
    }
    if (node.NT === NT.type_raw) {
      throw Errors.NotImplemented(NT.type_raw);
    }
    if (node.NT === NT.type_union) {
      return node.types
        .map((t) => {
          const str =
            typeof t == 'string'
              ? t
              : t.kind === LanguageObjectKind.instance
              ? t.display_name
              : t.display_name;
          return useColors ? chalk.magentaBright(str) : str;
        })
        .join(useColors ? chalk.redBright(' | ') : ' | ');
    } else {
      const str =
        typeof node.type == 'string'
          ? node.type
          : node.type.kind === LanguageObjectKind.instance
          ? node.type.display_name
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
  compileType: (node: RawTypeNode | TypeNode): TypeNode => {
    const res: SingleTypeNode['type'][] = [];

    if (
      node.NT === NT.type_single ||
      node.NT === NT.type_union ||
      node.NT === NT.type_tuple
    )
      return node;

    for (const T_node of node.types) {
      if (typeof T_node === 'string') {
        res.push(T_node);
      } else if (T_node.NT === NT.language_object) {
        res.push(T_node);
      } else if (T_node.NT === NT.type_raw) {
        const val = TypeHelper.compileType(T_node);
        if (val.NT === NT.type_tuple)
          throw Errors.NotImplemented(NT.type_tuple);
        if (val.NT === NT.type_union) {
          res.push(...val.types);
        } else {
          res.push(val.type);
        }
      } else if (T_node.NT === NT.type_with_parameters) {
        if (typeof T_node.type === 'string') {
          throw Errors.NotImplemented('string types');
        }
        if (T_node.type.NT === NT.type_with_parameters) {
          throw Errors.NotImplemented('nested types with parameters');
        }
        if (T_node.type.parameters.values) {
          throw Errors.NotImplemented('value parameters');
        }
        if (T_node.value_parameters) {
          if (T_node.value_parameters.NT !== NT.expression_list) {
            throw Errors.ParserError();
          }
          if (T_node.value_parameters.members.length > 1) {
            throw Errors.NotImplemented('');
          }

          const val = TypeHelper.getLiteralValue(
            T_node.value_parameters.members[0]
          );

          if (val.NT !== NT.literal_number)
            throw Errors.NotImplemented('non number argument');

          if (val.value_type !== Types.u64.object) {
            throw Errors.SyntaxError('Wrong array length argument');
          }

          res.push(
            Types.array.newInstance(
              {
                type: T_node.type,
              },
              {
                length: {
                  NT: NT.value_num,
                  is_builtin: false,
                  location: val.location,
                  value: parseInt(val.value),
                  value_type: val.value_type,
                },
              }
            )
          );
        }
      }
    }

    if (res.length == 0) throw Errors.ParserError('missing type');

    if (res.length == 1) return { NT: NT.type_single, type: res[0] };

    return { NT: NT.type_union, types: res };
  },
  getLiteralValue: (
    node: Node
  ): StringLiteralNode | BooleanLiteralNode | NumberLiteralNode => {
    switch (node.NT) {
      case NT.expression: {
        if (!node.member) throw Errors.TypeCheckError('missing expression');
        return TypeHelper.getLiteralValue(node.member);
      }

      case NT.literal_boolean:
      case NT.literal_string:
      case NT.literal_number: {
        return node;
      }

      case NT.value_num: {
        return {
          NT: NT.literal_number,
          location: node.location,
          value: node.value.toString(),
          value_type: node.value_type,
        };
      }

      default: {
        throw Errors.NotImplemented(node.NT);
      }
    }
  },
  getTypeSize: (node: TypeNode | RawTypeNode): number => {
    if (node.NT === NT.type_raw) throw Errors.NotImplemented(NT.type_raw);
    if (node.NT === NT.type_union) throw Errors.NotImplemented(NT.type_union);
    if (node.NT === NT.type_tuple) throw Errors.NotImplemented(NT.type_tuple);

    if (typeof node.type === 'string') throw Errors.NotImplemented(node.type);

    if (node.type.kind === LanguageObjectKind.instance)
      throw Errors.NotImplemented(LanguageObjectKind.instance);

    if (node.type.is_struct) {
      if (!node.type.properties)
        throw Errors.TypeCheckError('Struct with no properties.');
      return Array.from(node.type.properties.values())
        .map((prop) =>
          prop.kind === PropertyKind.value
            ? prop.size === undefined
              ? (prop.size = TypeHelper.getTypeSize(prop.type))
              : prop.size
            : 0
        )
        .reduce((prev, curr) => prev + curr, 0);
    } else {
      if (node.type.size === undefined)
        throw Errors.TypeCheckError(
          `${TypeHelper.formatType(node)} has no size.`
        );
      return node.type.size;
    }
  },
  getPropertyOffset: (
    obj: LanguageObject,
    property_stack: string[]
  ): number => {
    if (!obj.properties)
      throw Errors.ParserError(`${obj.display_name} has no properties.`);
    if (property_stack.length === 1) {
      let count = 0;

      for (const [name, prop] of obj.properties) {
        if (name === property_stack[0]) break;

        if (prop.kind === PropertyKind.value)
          count += TypeHelper.getTypeSize(prop.type);
      }

      return count;
    }

    let count = 0;

    for (const [name, prop] of obj.properties) {
      if (prop.kind === PropertyKind.type) continue;
      if (name === property_stack[0]) {
        if (prop.type.NT !== NT.type_single)
          throw Errors.NotImplemented(TypeHelper.formatType(prop.type));
        if (typeof prop.type.type === 'string')
          throw Errors.NotImplemented(TypeHelper.formatType(prop.type));

        if (prop.type.type.is_struct) {
          if (prop.type.type.kind === LanguageObjectKind.instance)
            throw Errors.CompilerError();
          count += TypeHelper.getPropertyOffset(
            prop.type.type,
            property_stack.slice(1)
          );
        } else {
          if (prop.type) count += TypeHelper.getTypeSize(prop.type);
        }
        if (prop.name == name) break;
      } else {
        count += TypeHelper.getTypeSize(prop.type);
      }
    }

    return count;
  },
  getPropertyStack: (node: Node): [ReferenceNode, string[]] => {
    function aux(node: Node): [ReferenceNode | undefined, string[]] {
      switch (node.NT) {
        case NT.operator: {
          switch (node.op) {
            case 'access_property': {
              if (!node.left || !node.right) throw Errors.CompilerError();
              if (
                node.left.NT === NT.reference &&
                node.right.NT === NT.property_node
              ) {
                const ref = node.left;
                return [ref, [node.right.value]];
              } else if (node.left.NT === NT.operator) {
                if (node.right.NT !== NT.property_node)
                  throw Errors.CompilerError();
                const [ref, stack] = aux(node.left);
                if (ref === undefined)
                  throw Errors.CompilerError('Missing reference');

                stack.push(node.right.value);
                return [ref, stack];
              }
            }

            default:
              throw Errors.CompilerError(node.op);
          }
        }

        default:
          throw Errors.CompilerError(node.NT);
      }
    }

    const [ref, stack] = aux(node);
    if (ref === undefined) throw Errors.CompilerError('Missing reference');
    return [ref, stack];
  },
};

export default TypeHelper;
