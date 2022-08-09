import {
  NodeType,
  RawTypeNode,
  ReferenceNode,
  TypeNode,
  TypeValueNode,
  ValueNode,
} from '../ast/nodes';
import { Location, TYPE_ANY, VSCType } from './types';

export interface OperatorMap {}

export interface BuiltinMap {}

export enum PropertyKind {
  type = 'type',
  value = 'value',
}
export interface ObjectTypeProperty {
  kind: PropertyKind.type;
  name: string;
  location: Location;
}

export interface ObjectValueProperty {
  kind: PropertyKind.value;
  name: string;
  type: TypeNode | RawTypeNode;
  index: number;
  size: number | undefined;
  location: Location;
  optional: boolean;
}

export type ObjectProperty = ObjectTypeProperty | ObjectValueProperty;

export enum LanguageObjectKind {
  object = 'object',
  instance = 'instance',
}

export interface LanguageObject {
  NT: NodeType.language_object;
  kind: LanguageObjectKind.object;
  is_struct: boolean;
  mutable: boolean;
  size: number | undefined;
  builtin_reference: VSCType | undefined;
  location: Location;
  display_name: string;
  // strict_operator: OperatorMap | undefined;
  // operators: OperatorMap | undefined;
  // builtins: BuiltinMap | undefined;
  properties: Map<string, ObjectProperty> | undefined;
  parameters: {
    values: [string, ObjectProperty][] | undefined;
    template_types: string[] | undefined;
  };
}

export interface LanguageObjectInstance {
  kind: LanguageObjectKind.instance;
  is_struct: boolean;
  name: string;
  typeProperties: Map<string, LanguageObject | LanguageObjectInstance>;
  valueProperties: Map<string, ValueNode>;
  object: LanguageObject;
}
