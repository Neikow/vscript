import { LanguageDefinition } from '../../definitions';
import { LanguageObject, LanguageObjectKind } from '../../objects';
import {
  ContextType,
  FunctionValueNode,
  NodeType,
  NodeType as NT,
} from '../../syntax_tree_nodes';
import { Location, TYPE_ANY, VSCType } from '../../types';
import TypeHelper from '../../type_helper';
class VSCTypeFun implements VSCType {
  display: string = 'fun';

  object: LanguageObject = {
    NT: NodeType.language_object,
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
