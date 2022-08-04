import { LanguageDefinition } from '../../definitions';
import { LanguageObject, LanguageObjectKind } from '../../objects';
import {
  ContextType,
  FunctionValueNode,
  NodeType,
} from '../../syntax_tree_nodes';
import { Location, TYPE_ANY, VSCType } from '../../types';
import TypeHelper from '../../type_helper';

import VSCTypeFun from './fun';

class VSCTypePtr implements VSCType {
  display: string = 'ptr';

  object: LanguageObject = {
    NT: NodeType.language_object,
    kind: LanguageObjectKind.object,
    display_name: this.display,
    location: Location.std,
    mutable: false,
    properties: undefined,
    builtin_reference: this,
    is_struct: false,
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
      name: 'ptr',
      context: {
        definitions: new Map<string, LanguageDefinition>(),
        holder: undefined,
        id: -1,
        members: [],
        NT: NodeType.context,
        objects: new Map<string, LanguageObject>(),
        parent: undefined,
        type: ContextType.std,
        label: 'constructor::ptr',
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

export default new VSCTypePtr();
