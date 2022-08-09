import { LanguageDefinition } from '../../definitions';
import {
  LanguageObject,
  LanguageObjectKind,
  ObjectProperty,
  PropertyKind,
} from '../../objects';
import {
  ContextType,
  FunctionValueNode,
  NodeType,
} from '../../syntax_tree_nodes';
import { Location, TYPE_ANY, VSCType } from '../../types';

import VSCTypeFun from './fun';
import VSCTypeInt from './int';

class VSCTypeStr implements VSCType {
  display: string = 'str';

  _type_properties: { [key: string]: ObjectProperty } = {
    length: {
      kind: PropertyKind.value,
      location: Location.std,
      index: 0,
      size: 0,
      name: 'length',
      optional: false,
      type: {
        NT: NodeType.type_single,
        type: VSCTypeInt.object,
      },
    },
  };

  object: LanguageObject = {
    NT: NodeType.language_object,
    size: 4,
    kind: LanguageObjectKind.object,
    display_name: this.display,
    location: Location.std,
    is_struct: false,
    mutable: false,
    properties: new Map<string, ObjectProperty>(
      Object.entries(this._type_properties)
    ),
    builtin_reference: this,
    parameters: {
      template_types: undefined,
      values: undefined,
    },
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
      name: 'str',
      context: {
        definitions: new Map<string, LanguageDefinition>(),
        holder: undefined,
        id: -1,
        members: [],
        NT: NodeType.context,
        objects: new Map<string, LanguageObject>(),
        parent: undefined,
        type: ContextType.std,
        label: 'constructor::str',
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

export default new VSCTypeStr();
