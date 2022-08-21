import { Errors } from '../errors';
import { LanguageObject, LanguageObjectInstance } from '../types/objects';
import { mapOperator } from './operators';
import { Types } from '../std/types';
import {
  AccessedPropertyNode,
  ComputableNode,
  ContextNode,
  DefinitionNode,
  DefinitionType as DT,
  ExpressionListNode,
  ExpressionListReference,
  ExpressionNode,
  FunctionNode,
  FunctionValueNode,
  MemoryNode,
  MemoryType as MT,
  Node,
  NodeType as NT,
  OperatorNode,
  ReferenceNode,
  ValueNode,
} from '../ast/nodes';
import {
  AssignmentToOperatorMap,
  BUILTIN_TYPES,
  Location,
  NAN,
  NULL,
  OPERATORS,
  TYPE_ANY,
  TYPE_NEVER,
  TYPE_UNDEFINED,
  TYPE_UNKNOWN,
  TYPE_VOID,
  UNDEFINED,
} from '../types/types';

export type ExpressionParser = (
  node: Node | undefined,
  type?: LanguageObject | BUILTIN_TYPES
) => ValueNode[];

export type TreeTraveler = (
  ctx: ContextNode,
  starting_idx?: number,
  collect?: boolean
) => [boolean, ValueNode[]];

export class Memory {
  private definition_id = 0;
  data = new Map<number, MemoryNode>();
  traveler: TreeTraveler | undefined;

  return_stack: ValueNode[][] = [];

  constructor(traveler?: TreeTraveler) {
    this.traveler = traveler;
  }

  findReference(
    node: Node | undefined
  ): ReferenceNode | OperatorNode | AccessedPropertyNode | undefined {
    if (!node) throw Errors.ParserError();
    switch (node.NT) {
      case NT.reference:
        return node;
      case NT.expression:
        return this.findReference(node.member);
      case NT.operator: {
        switch (node.op) {
          case 'access_property': {
            if (!node.right || node.right.NT !== NT.property_node)
              throw Errors.ParserError();
            if (!node.left) throw Errors.ParserError();
            const res: AccessedPropertyNode = {
              NT: NT.accessed_property,
              target: node.left,
              property: node.right.value,
            };

            return res;
          }
          case 'decr': {
            if (!node.left) throw Errors.ParserError();
            if (node.right) throw Errors.ParserError();
            return this.findReference(node.left);
          }

          default: {
            throw Errors.NotImplemented(node.op);
          }
        }
      }
      default:
        throw Errors.ParserError(`Unexpected node type: ${node.NT}`);
    }
  }

  applyOperator(node: OperatorNode): ValueNode[] {
    if (
      [
        'assign',
        'add_assign',
        'div_assign',
        'mod_assign',
        'mul_assign',
        'pow_assign',
        'sub_assign',
        'add_assign',
        'wdiv_assign',
        'incr',
        'decr',
      ].includes(node.op)
    ) {
      if (!node.left)
        throw Errors.ParserError(
          `Missing left member at ${node.location.format()}`
        );
      const reference = this.findReference(node.left);
      if (!reference) throw Errors.ParserError();
      if (node.op === 'assign') {
        const value = node.right as ExpressionListNode | ExpressionNode;
        if (!value) throw Errors.ParserError('Missing expression.');

        if (reference.NT === NT.operator) {
          throw Errors.NotImplemented(reference.NT);
        }

        if (reference.NT === NT.accessed_property) {
          return this.update(reference, value);
        }

        return this.update(reference.definition, value);
      } else if (node.op === 'incr' || node.op === 'decr') {
        if (!node.left) throw Errors.ParserError();
        const value = this.parseExpression(node.left);
        if (value.length > 1) throw Errors.ParserError('Not implemented');

        const op = node.op === 'incr' ? 'add' : 'sub';

        const op_node: OperatorNode = {
          NT: NT.operator,
          asso: OPERATORS[op].asso,
          op: op,
          left: value[0],
          right: {
            NT: NT.value_num,
            value: 1,
            location: Location.std,
            value_type: Types.u64.object,
            is_builtin: false,
          },
          location: node.location,
        };

        if (reference.NT === NT.operator) {
          console.log(reference);
          throw Errors.NotImplemented(reference.NT);
        }

        if (reference.NT === NT.accessed_property)
          throw Errors.NotImplemented(NT.accessed_property);

        const res = this.update(reference.definition, op_node);
        if (!res) throw Errors.ParserError();

        return value;
      } else {
        const op = AssignmentToOperatorMap[node.op];
        if (!op) throw Errors.ParserError();
        const value = node.right as ExpressionListNode | ExpressionNode;
        if (!value) throw Errors.ParserError('Missing expression.');
        const op_node: OperatorNode = {
          NT: NT.operator,
          asso: OPERATORS[op].asso,
          op: op,
          left: reference,
          right: value,
          location: node.location,
        };

        if (reference.NT === NT.operator) {
          console.log(reference);

          throw Errors.NotImplemented(reference.NT);
        }

        if (reference.NT === NT.accessed_property) {
          console.log(reference);

          throw Errors.NotImplemented(reference.NT);
        }

        return this.update(reference.definition, op_node);
      }
    }

    let operands_left: ValueNode[] | undefined = undefined;
    let operands_right: ValueNode[] | undefined = undefined;
    if (node.left) {
      operands_left = this.parseExpression(node.left, undefined);
    }
    if (node.right) {
      operands_right = this.parseExpression(node.right, undefined);
    }

    // if (operands_left && operands_left.length != 1)
    //   throw Errors.ParserError('Not implemented list operation.');
    // if (operands_right && operands_right.length != 1)
    //   throw Errors.ParserError('Not implemented list operation.');

    const operands: [ValueNode[] | undefined, ValueNode[] | undefined] = [
      operands_left,
      operands_right,
    ];

    return mapOperator(node.op, operands, this);
  }

  parseExpression(
    node: Node | undefined,
    type?: LanguageObject | LanguageObjectInstance
  ): ValueNode[] {
    if (!node)
      return [
        {
          NT: NT.value_undefined,
          value: UNDEFINED,
          is_builtin: true,
          location: Location.std,
          value_type: TYPE_UNDEFINED,
        },
      ];

    if (
      node.NT === NT.value_num ||
      node.NT === NT.value_str ||
      node.NT === NT.value_bool ||
      node.NT === NT.value_undefined ||
      node.NT === NT.value_ptr ||
      node.NT === NT.property_node ||
      node.NT === NT.value_struct
    ) {
      return [node];
    }

    if (node.NT === NT.context) throw Errors.ParserError();

    if (node.NT === NT.statement_debug) throw Errors.ParserError();

    if (node.NT === NT.expression)
      return this.parseExpression(node.member, type);

    if (node.NT === NT.literal_string)
      return [
        {
          NT: NT.value_str,
          is_builtin: false,
          location: Location.std,
          value: node.value,
          value_type: Types.string.object,
        },
      ];

    if (node.NT === NT.expression_list_reference)
      return [this.parseExpression(node.list, type)[node.index]];

    if (node.NT === NT.expression_list) {
      return node.members.flatMap((n) => this.parseExpression(n, type));
    }

    if (node.NT === NT.reference) return this.fetch(node.definition);

    if (node.NT === NT.literal_boolean)
      return [
        {
          is_builtin: true,
          location: Location.std,
          NT: NT.value_bool,
          value: node.value,
          value_type: Types.bool.object,
        },
      ];

    if (node.NT === NT.literal_number) {
      const val =
        node.value === NAN
          ? NAN
          : node.value_type == Types.f64.object
          ? parseFloat(node.value)
          : parseInt(node.value);
      return [
        {
          is_builtin: false,
          location: Location.std,
          NT: NT.value_num,
          value: val,
          value_type: node.value_type,
        },
      ];
    }

    if (node.NT === NT.literal_builtin) {
      if (node.value === NULL)
        return [
          {
            is_builtin: true,
            location: Location.std,
            NT: NT.value_ptr,
            value: NULL,
            value_type: Types.pointer.object,
          },
        ];
      else if (node.value === UNDEFINED)
        return [
          {
            is_builtin: true,
            location: Location.std,
            NT: NT.value_undefined,
            value_type: type ?? TYPE_UNDEFINED,
            value: UNDEFINED,
          },
        ];
      else throw Errors.NotImplemented('Literals not implemented.');
    }

    if (node.NT === NT.operator) {
      return this.applyOperator(node);
    }

    if (node.NT === NT.special) {
      switch (node.value) {
        case 'here': {
          const res: ValueNode = {
            NT: NT.value_str,
            location: node.location,
            value: node.location.format(),
            is_builtin: false,
            value_type: Types.string.object,
          };
          return [res];
        }
        case 'console_input': {
          return [node];
        }
        default: {
          throw Errors.ParserError(`Not implemented special: ${node.value}.`);
        }
      }
    }

    if (node.NT === NT.language_type) {
      return [
        {
          NT: NT.value_type,
          value: node.definition.object,
          location: Location.std,
        },
      ];
    }

    if (node.NT === NT.object_reference) {
      return [
        {
          NT: NT.value_type,
          value: node.value,
          location: node.location,
        },
      ];
    }

    if (node.NT === NT.struct_instance) {
      return [
        {
          NT: NT.value_struct,
          value_type: node.object.value,
          value: new Map<string, ValueNode[]>(
            node.fields.map((field): [string, ValueNode[]] => [
              field.name,
              this.parseExpression(field.value),
            ])
          ),
          location: Location.computed,
        },
      ];
    }

    if (node.NT === NT.array) {
      return [
        {
          NT: NT.value_array,
          location: node.location,
          value: node.list!.members.map((e) => {
            const val = this.parseExpression(e);
            if (val.length > 1) throw Errors.NotImplemented();
            return val[0];
          }),
          value_type: node.value_type!,
        },
      ];
    }

    throw Errors.ParserError(`Not implemented type: ${node.NT}`);
  }

  set(node: DefinitionNode, value: ComputableNode) {
    if (node.DT === DT.struct) throw Errors.NotImplemented(DT.struct);

    if (node.definition_id === undefined)
      node.definition_id = this.definition_id++;

    if (node.type.NT === NT.type_raw) throw Errors.ParserError(NT.type_raw);
    if (node.type.NT === NT.type_tuple) throw Errors.ParserError(NT.type_tuple);

    if (node.DT === DT.function_argument) {
      if (
        node.type.NT !== NT.type_union &&
        (node.type.type == TYPE_ANY ||
          node.type.type == TYPE_UNKNOWN ||
          node.type.type == TYPE_VOID ||
          node.type.type == TYPE_UNDEFINED)
      ) {
        throw Errors.NotImplemented('any & unknown & void');
      }

      const computed = this.parseExpression(value);

      let computed_type:
        | LanguageObject
        | LanguageObjectInstance
        | TYPE_VOID
        | TYPE_UNDEFINED;

      if (computed.length > 1) throw Errors.NotImplemented('tuple');

      switch (computed[0].NT) {
        case NT.value_bool:
        case NT.value_num:
        case NT.value_str:
        case NT.value_undefined:
        case NT.value_struct:
          computed_type = computed[0].value_type;
          break;
        default:
          throw Errors.NotImplemented(computed[0].NT);
      }

      this.data.set(node.definition_id, {
        NT: NT.memory,
        MT: MT.value,
        type: computed_type,
        mutable: false,
        references: 1,
        value: computed,
      });
      return;
    }

    throw Errors.ParserError('Not implemented.');
  }

  add(node: DefinitionNode) {
    if (node.NT !== NT.definition) throw Errors.ParserError();
    if (node.DT === DT.struct) throw Errors.NotImplemented('struct');
    if (node.definition_id === undefined)
      node.definition_id = this.definition_id++;

    if (node.DT === DT.function) {
      this.data.set(node.definition_id, {
        NT: NT.memory,
        MT: MT.function,
        type: Types.fun.object,
        references: 0,
        mutable: false,
        value: node.value,
      });

      return;
    }
    if (node.DT === DT.function_argument) {
      if (node.type.NT === NT.type_union)
        throw Errors.ParserError(NT.type_union);

      if (node.type.NT === NT.type_raw) {
        throw Errors.NotImplemented(NT.type_raw);
      }

      if (node.type.NT === NT.type_tuple) {
        throw Errors.NotImplemented(NT.type_tuple);
      }

      if (
        node.type.type === TYPE_UNKNOWN ||
        node.type.type === TYPE_VOID ||
        node.type.type === TYPE_ANY ||
        node.type.type === TYPE_UNDEFINED ||
        node.type.type === TYPE_NEVER
      ) {
        throw Errors.NotImplemented('unknown & void & any & undefined');
      }

      this.data.set(node.definition_id, {
        NT: NT.memory,
        MT: MT.value,
        type: node.type.type,
        mutable: false,
        references: 0,
        value: {
          NT: NT.value_str,
          location: Location.std,
          is_builtin: true,
          // TODO: dunno
          value_type: node.type.type,
          value: TYPE_UNKNOWN,
        },
      });

      return;
    }

    if (node.type.NT === NT.type_union) throw Errors.ParserError(NT.type_union);

    if (node.type.NT === NT.type_tuple) throw Errors.ParserError(NT.type_tuple);

    if (node.type.NT === NT.type_raw) throw Errors.ParserError('raw type node');

    if (
      node.type.type === TYPE_UNKNOWN ||
      node.type.type === TYPE_UNDEFINED ||
      node.type.type === TYPE_ANY ||
      node.type.type === TYPE_NEVER
    ) {
      throw Errors.NotImplemented('unknown & any & undefined');
    }

    this.data.set(node.definition_id, {
      NT: NT.memory,
      MT: MT.value,
      references: 0,
      mutable: node.DT === DT.var,
      // TODO: dunno
      type: node.type.type,
      value: this.parseExpression(
        node.value,
        typeof node.type.type == 'string' ? undefined : node.type.type
      ),
    });
  }

  computePropertyAccess(
    node: Node,
    property: string,
    newValue: ValueNode[] | FunctionNode
  ): ValueNode[] | FunctionNode {
    if (node.NT === NT.definition) {
      if (node.DT !== DT.const && node.DT !== DT.var) {
        throw Errors.ParserError();
      }
      if (node.definition_id === undefined) throw Errors.ParserError();
      const target = this.data.get(node.definition_id);
      if (!target) throw Errors.ParserError();

      let normalized_target: ValueNode;

      if (Array.isArray(target.value)) {
        if (target.value.length > 1) {
          throw Errors.NotImplemented('tuple');
        }

        normalized_target = target.value[0];
      } else {
        throw Errors.NotImplemented(target.value.NT);
      }

      if (normalized_target.NT !== NT.value_struct)
        throw Errors.NotImplemented(normalized_target.NT);

      if (Array.isArray(newValue)) {
        normalized_target.value.set(property, newValue);
      } else {
        throw Errors.NotImplemented('function');
      }

      return [normalized_target];
    } else if (node.NT === NT.accessed_property) {
      console.log(node.target);
      throw Errors.NotImplemented();
    } else if (node.NT === NT.reference) {
      return this.computePropertyAccess(node.definition, property, newValue);
    } else {
      throw Errors.ParserError(`wrong accessed object: ${node.NT}`);
    }
  }

  update(
    node: DefinitionNode | AccessedPropertyNode,
    expr:
      | ExpressionNode
      | ExpressionListNode
      | OperatorNode
      | ExpressionListReference,
    force: boolean = false
  ): ValueNode[] {
    if (node.NT === NT.accessed_property) {
      const obj = this.computePropertyAccess(
        node.target,
        node.property,
        this.parseExpression(expr)
      );
      if (Array.isArray(obj)) {
        return obj;
      } else {
        throw Errors.NotImplemented(obj.NT);
      }
    }

    if (node.NT !== NT.definition) throw Errors.ParserError();

    if (node.DT === DT.struct) throw Errors.NotImplemented('struct');
    if (node.DT === DT.function) throw Errors.NotImplemented('function');

    if (node.definition_id === undefined) {
      if (force) this.add(node);
      else {
        throw Errors.ParserError(
          `Unknown variable: ${node.name} at "${node.location.format()}"`
        );
      }
    }
    const res = this.data.get(node.definition_id!);

    if (!res) throw Errors.ParserError(`Unknown variable: ${node.name}`);

    if (!(res.mutable || force))
      throw Errors.ParserError(`Trying updating a constant: ${node.name}`);

    // TODO: type-check

    if (res.MT === MT.value) {
      if (node.type.NT === NT.type_union) {
        throw Errors.NotImplemented(NT.type_union);
      }

      if (node.type.NT === NT.type_tuple) {
        throw Errors.NotImplemented(NT.type_tuple);
      }

      if (node.type.NT === NT.type_raw)
        throw Errors.ParserError('raw type node');

      const value = this.parseExpression(
        expr,
        typeof node.type.type == 'string' ? undefined : node.type.type
      );
      this.data.set(node.definition_id!, {
        ...res,
        value: value,
      });

      return value;
    }

    throw Errors.ParserError('Not implemented.');
  }

  fetch(node: DefinitionNode): ValueNode[] {
    if (node.NT !== NT.definition) throw Errors.ParserError();
    if (node.DT === DT.struct) throw Errors.NotImplemented('struct');
    if (node.definition_id === undefined)
      throw Errors.ParserError(`Unknown variable: ${node.name}`);
    const res = this.data.get(node.definition_id);
    if (!res) throw Errors.ParserError(`Unknown variable: ${node.name}`);

    if (Array.isArray(res.value)) return res.value;
    else if (res.value.NT === NT.value_str) return [res.value];
    else if (res.MT === MT.function) {
      const fun: FunctionValueNode = {
        NT: NT.value_function,
        location: node.location,
        is_builtin: false,
        value: res.value,
        value_type: Types.fun.object,
      };
      return [fun];
    } else throw Errors.ParserError(`Not implemented`);
  }

  delete(node: DefinitionNode): boolean {
    if (node.NT !== NT.definition) throw Errors.ParserError();
    if (node.DT === DT.struct) throw Errors.NotImplemented('struct');
    if (node.definition_id === undefined) return false;
    const res = this.data.get(node.definition_id);
    if (!res) return false;
    if (res.references <= 1) return this.data.delete(node.definition_id);
    else throw Errors.ParserError('Not implemented');
  }

  collect(context: ContextNode) {
    for (const [_, def] of context.definitions) {
      if (def.node.DT === DT.struct) throw Errors.NotImplemented('struct');
      if (def.node.NT == NT.definition) {
        if (!this.delete(def.node))
          console.error(`Unable to remove memory block: ${def.name}.`);
        def.node.definition_id = undefined;
      } else {
        throw Errors.ParserError('Not implemented.');
      }
    }
  }
}
