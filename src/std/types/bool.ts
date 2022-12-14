import { LanguageObject, LanguageObjectKind } from '../../types/objects';
import {
  ContextType,
  FunctionValueNode,
  LanguageDefinition,
  NodeType,
} from '../../ast/nodes';
import {
  TYPE_BOOLEAN,
  Location,
  TYPE_FUNCTION,
  TYPE_ANY,
  VSCType,
} from '../../types/types';
import TypeHelper from '../../types/helper';
import VSCTypeFun from './fun';
class VSCTypeBool implements VSCType {
  display: string = 'bool';

  object: LanguageObject = {
    NT: NodeType.language_object,
    size: 4,
    kind: LanguageObjectKind.object,
    display_name: this.display,
    location: Location.std,
    mutable: false,
    builtin_reference: this,
    is_struct: false,
    properties: undefined,
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
      name: 'bool',
      context: {
        definitions: new Map<string, LanguageDefinition>(),
        holder: undefined,
        id: -1,
        members: [],
        NT: NodeType.context,
        objects: new Map<string, LanguageObject>(),
        parent: undefined,
        type: ContextType.std,
        label: 'constructor::bool',
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

export default new VSCTypeBool();
