import { LanguageDefinition } from '../../definitions';
import { LanguageObject, LanguageObjectKind } from '../../objects';
import {
  ContextType,
  FunctionValueNode,
  NodeType,
} from '../../syntax_tree_nodes';
import {
  Location,
  TYPE_FUNCTION,
  TYPE_ANY,
  VSCType,
  TYPE_INTEGER,
} from '../../types';
import TypeHelper from '../../type_helper';

import VSCTypeFun from './fun';

class VSCTypeInt implements VSCType {
  display: string = 'int';

  object: LanguageObject = {
    NT: NodeType.language_object,
    kind: LanguageObjectKind.object,
    display_name: this.display,
    location: Location.std,
    is_struct: false,
    mutable: false,
    properties: undefined,
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
      name: 'int',
      context: {
        definitions: new Map<string, LanguageDefinition>(),
        holder: undefined,
        id: -1,
        members: [],
        NT: NodeType.context,
        objects: new Map<string, LanguageObject>(),
        parent: undefined,
        type: ContextType.std,
        label: 'constructor::int',
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

export default new VSCTypeInt();
