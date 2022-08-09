import { Errors } from '../../errors';
import {
  LanguageObject,
  LanguageObjectInstance,
  LanguageObjectKind,
  ObjectProperty,
  PropertyKind,
} from '../../types/objects';
import {
  ContextType,
  FunctionValueNode,
  LanguageDefinition,
  NodeType,
  ValueNode,
} from '../../ast/nodes';
import { Location, TYPE_ANY, VSCType } from '../../types/types';
import VSCTypeUint from './uint';
import VSCTypeFun from './fun';

class VSCTypeArr implements VSCType {
  display: string = 'array';

  _type_properties: { [key: string]: ObjectProperty } = {
    $type: {
      kind: PropertyKind.type,
      location: Location.std,
      name: 'type',
    },
    length: {
      kind: PropertyKind.value,
      location: Location.std,
      name: 'length',
      index: 0,
      size: 4,
      optional: false,
      type: {
        NT: NodeType.type_single,
        type: VSCTypeUint.object,
      },
    },
  };

  object: LanguageObject = {
    NT: NodeType.language_object,
    size: 4,
    kind: LanguageObjectKind.object,
    display_name: this.display,
    location: Location.std,
    mutable: false,
    builtin_reference: this,
    is_struct: false,
    properties: new Map<string, ObjectProperty>(
      Object.entries(this._type_properties)
    ),
    parameters: {
      template_types: ['T'],
      values: [['length', this._type_properties.length]],
    },
  };

  instances: Map<string, LanguageObjectInstance> = new Map<
    string,
    LanguageObjectInstance
  >();

  newInstance = (
    type_properties: { type: LanguageObject | LanguageObjectInstance },
    value_properties: { length: ValueNode }
  ) => {
    const name = `${Array.from(Object.values(type_properties)).map((p) =>
      p.kind === LanguageObjectKind.instance ? p.name : p.display_name
    )}[${Array.from(Object.values(value_properties)).map((v) => {
      if (typeof v.value !== 'string' && typeof v.value !== 'number')
        throw Errors.NotImplemented('struct');
      return v.value;
    })}]`;

    const res = this.instances.get(name);
    if (res) return res;

    const instance: LanguageObjectInstance = {
      kind: LanguageObjectKind.instance,
      is_struct: this.object.is_struct,
      name: name,
      object: this.object,
      valueProperties: new Map(Object.entries(value_properties)),
      typeProperties: new Map(Object.entries(type_properties)),
    };

    this.instances.set(name, instance);

    return instance;
  };

  construct: FunctionValueNode = {
    is_builtin: true,
    location: Location.std,
    NT: NodeType.value_function,
    value: {
      has_return: true,

      arguments: [
        {
          NT: NodeType.argument,
          is_optional: true,
          location: Location.std,
          name: 'o',
          type: {
            NT: NodeType.type_single,
            type: TYPE_ANY,
          },
        },
      ],
      type_arguments: [],
      name: 'arr',
      context: {
        definitions: new Map<string, LanguageDefinition>(),
        holder: undefined,
        id: -1,
        members: [],
        NT: NodeType.context,
        objects: new Map<string, LanguageObject>(),
        parent: undefined,
        type: ContextType.std,
        label: 'constructor::array',
      },
      location: Location.std,
      NT: NodeType.function,
      return_type: {
        NT: NodeType.type_single,
        type: this.object,
      },
    },
    value_type: VSCTypeFun.object,
  };
}

export default new VSCTypeArr();
