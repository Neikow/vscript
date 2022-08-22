import {
  LanguageObject,
  LanguageObjectInstance,
  LanguageObjectKind,
} from '../../types/objects';
import {
  ContextType,
  FunctionValueNode,
  LanguageDefinition,
  NodeType,
  NodeType as NT,
  ValueNode,
} from '../../ast/nodes';
import { Location, TYPE_ANY, VSCType } from '../../types/types';
import TypeHelper from '../../types/helper';
import { Errors } from '../../errors';
class VSCTypeFun implements VSCType {
  display: string = 'fun';

  instances: Map<string, LanguageObjectInstance> = new Map<
    string,
    LanguageObjectInstance
  >();

  newInstance = (type_properties: {
    arguments: (LanguageObject | LanguageObjectInstance)[];
    return_type: LanguageObject | LanguageObjectInstance;
  }) => {
    const name = `(${type_properties.arguments
      .map((arg) => arg.display_name)
      .join(', ')}) => ${type_properties.return_type.display_name}`;

    const res = this.instances.get(name);
    if (res) return res;

    const instance: LanguageObjectInstance = {
      kind: LanguageObjectKind.instance,
      is_struct: this.object.is_struct,
      display_name: name,
      object: this.object,
      value_properties: undefined,
      type_properties: new Map(Object.entries(type_properties)),
      properties_overrides: undefined,
    };

    this.instances.set(name, instance);

    return instance;
  };

  object: LanguageObject = {
    NT: NodeType.language_object,
    size: 4,
    kind: LanguageObjectKind.object,
    display_name: this.display,
    location: Location.std,
    is_struct: false,
    mutable: false,
    builtin_reference: this,
    properties: undefined,
    parameters: {
      template_types: undefined,
      values: undefined,
    },
  };
  construct: FunctionValueNode = {
    is_builtin: true,
    location: Location.std,
    NT: NT.value_function,
    value: {
      has_return: true,
      arguments: [
        {
          NT: NT.argument,
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
      name: 'fun',
      context: {
        definitions: new Map<string, LanguageDefinition>(),
        holder: undefined,
        id: -1,
        members: [],
        NT: NT.context,
        objects: new Map<string, LanguageObject>(),
        parent: undefined,
        type: ContextType.std,
        label: 'constructor::fun',
      },
      location: Location.std,
      NT: NT.function,
      return_type: {
        NT: NodeType.type_single,
        type: this.object,
      },
    },
    value_type: this.object,
  };
}

export default new VSCTypeFun();
