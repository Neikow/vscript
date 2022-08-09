import { LanguageDefinition } from './definitions';
import { LanguageObject, LanguageObjectInstance } from './objects';
import {
  INFINITY,
  KEYWORD,
  Location,
  NAN,
  NULL,
  OPERATOR,
  TYPE_ANY,
  TYPE_NEVER,
  TYPE_UNDEFINED,
  TYPE_UNKNOWN,
  TYPE_VOID,
  UNDEFINED,
  VSCType,
} from './types';

import VSCTypeBool from './std/types/bool';

export const enum NodeType {
  context = 'context',
  language_object = 'language_object',
  special = 'special',
  expression = 'expression',
  statement_for_in = 'statement_for_in',
  statement_for = 'statement_for',
  language_type = 'builtin_type',
  value_str = 'value_str',
  value_ptr = 'value_ptr',
  value_num = 'value_num',
  value_bool = 'value_bool',
  value_function = 'value_function',
  value_undefined = 'value_undefined',
  value_type = 'value_type',
  definition = 'definition',
  definition_list = 'definition_list',
  operator = 'operator',
  literal_string = 'literal_string',
  literal_number = 'literal_number',
  literal_boolean = 'literal_boolean',
  literal_builtin = 'literal_builtin',
  expression_list = 'expression_list',
  expression_list_reference = 'expression_list_reference',
  statement_debug = 'statement_debug',
  statement_return = 'statement_return',
  statement_exit = 'statement_exit',
  reference = 'reference',
  memory = 'memory',
  function = 'function',
  argument = 'argument',
  argument_type = 'argument_type',
  statement_while = 'statement_while',
  statement_if_else = 'statement_if_else',
  condition_branch = 'if_else_branch',
  statement_label = 'label',
  statement_goto = 'goto',
  struct_field_definition = 'struct_field',
  struct_instance = 'struct_instance',
  struct_field_instance = 'struct_field_instance',
  object_reference = 'object_reference',
  value_struct = 'value_struct',
  property_node = 'property_node',
  accessed_property = 'accessed_property',
  type_union = 'type_union',
  type_single = 'type_single',
  type_tuple = 'type_tuple',
  type_with_parameters = 'type_with_parameters',
  type_raw = 'raw_type',
  array = 'array',
  value_array = 'value_array',
}
export type Node = ComputableNode | SyntaxNode;

export type ComputableNode =
  | ArrayExpressionNode
  | ExpressionListNode
  | ExpressionNode
  | ExpressionListReference
  | OperatorNode
  | ReferenceNode
  | AccessedPropertyNode
  | ValueNode
  | SpecialNode
  | ObjectReferenceNode
  | StructInstanceNode
  | LanguageTypeNode
  | PropertyNode
  | LiteralNode
  | TypeNode
  | RawTypeNode;

export type SyntaxNode =
  | StatementDebugNode
  | StatementWhileNode
  | StatementIfElseNode
  | StatementReturnNode
  | StatementExitNode
  | ConditionBranchNode
  | StatementForNode
  | StatementForInNode
  | ContextNode
  | DefinitionNode
  | FunctionNode
  | StatementLabelNode
  | StatementGotoNode
  | DefinitionNodeList;

export interface NodeBase {
  processed?: boolean;
  NT: NodeType;
}

export const enum ContextType {
  program = 'program',
  function = 'function',
  std = 'std',
}

export interface ContextNode extends NodeBase {
  NT: NodeType.context;
  id: number;
  type: ContextType | undefined;
  parent: ContextNode | undefined;
  label?: string;
  objects: Map<string, LanguageObject>;
  definitions: Map<string, LanguageDefinition>;
  holder: Node | undefined;
  members: (Node | StatementWhileNode | ContextNode)[];
}

export interface ReferenceNode extends NodeBase {
  NT: NodeType.reference;
  definition: DefinitionNode;
  mutated: boolean;
  // a reference node that was not mutated before
  // tree collapse would be changed to a value
  // node for performance optimization
}

export interface ExpressionNode extends NodeBase {
  NT: NodeType.expression;
  location: Location;
  member: Node | undefined;
}

export interface ExpressionListReference extends NodeBase {
  NT: NodeType.expression_list_reference;
  list: ExpressionListNode;
  index: number;
}

export interface ArrayExpressionNode extends NodeBase {
  NT: NodeType.array;
  location: Location;
  value_type: LanguageObjectInstance | undefined;
  list: ExpressionListNode | undefined;
}

export interface ExpressionListNode extends NodeBase {
  NT: NodeType.expression_list;
  members: ExpressionNode[];
}

export interface SpecialNode extends NodeBase {
  NT: NodeType.special;
  value: KEYWORD;
  location: Location;
}

export interface StringLiteralNode extends NodeBase {
  NT: NodeType.literal_string;
  value_type: LanguageObject;
  location: Location;
  value: string;
}

export interface NumberLiteralNode extends NodeBase {
  NT: NodeType.literal_number;
  value_type: LanguageObject;
  location: Location;
  value: string | INFINITY | NAN;
}

export interface BooleanLiteralNode extends NodeBase {
  NT: NodeType.literal_boolean;
  value_type: LanguageObject;
  location: Location;
  value: 1 | 0;
}

export interface BuiltinLiteralNode extends NodeBase {
  NT: NodeType.literal_builtin;
  value_type:
    | LanguageObject
    | LanguageObjectInstance
    | TYPE_UNKNOWN
    | TYPE_UNDEFINED;
  location: Location;
  value: NULL | UNDEFINED;
}

export interface ArgumentNode extends NodeBase {
  NT: NodeType.argument;
  name: string | undefined;
  location: Location;
  type: TypeNode | RawTypeNode;
  is_optional: boolean;
}

export interface ArgumentTypeNode extends NodeBase {
  NT: NodeType.argument_type;
  name: string | undefined;
  location: Location;
}

export interface FunctionNode extends NodeBase {
  NT: NodeType.function;
  location: Location | undefined;
  type_arguments: ArgumentTypeNode[];
  arguments: ArgumentNode[];
  return_type: TypeNode | RawTypeNode;
  has_return: boolean;
  name: string | undefined;
  context: ContextNode | undefined;
}

export interface ObjectReferenceNode extends NodeBase {
  NT: NodeType.object_reference;
  location: Location;
  value: LanguageObject;
}

export interface LanguageTypeNode extends NodeBase {
  NT: NodeType.language_type;
  definition: VSCType;
}

export type LiteralNode =
  | StringLiteralNode
  | NumberLiteralNode
  | BooleanLiteralNode
  | BuiltinLiteralNode;

export interface StringLiteralValueNode extends NodeBase {
  NT: NodeType.value_str;
  is_builtin: boolean;
  location: Location;
  value_type: LanguageObject | LanguageObjectInstance;
  value: string;
}

export interface PointerValueNode extends NodeBase {
  NT: NodeType.value_ptr;
  is_builtin: boolean;
  location: Location;
  value: NULL | number;
  value_type: LanguageObject;
}

export interface UndefinedValueNode extends NodeBase {
  NT: NodeType.value_undefined;
  is_builtin: true;
  location: Location;
  value_type: LanguageObject | LanguageObjectInstance | TYPE_UNDEFINED;
  value: UNDEFINED;
}

export interface FunctionValueNode extends NodeBase {
  NT: NodeType.value_function;
  is_builtin: boolean;
  location: Location;
  value_type: LanguageObject;
  value: FunctionNode;
}

export interface NumericalValueNode extends NodeBase {
  NT: NodeType.value_num;
  is_builtin: boolean;
  location: Location;
  value_type: LanguageObject;
  value: number | INFINITY | NAN;
}

export interface BooleanValueNode extends NodeBase {
  NT: NodeType.value_bool;
  is_builtin: true;
  location: Location;
  value_type: LanguageObject;
  value: 1 | 0;
}

export const TrueNode: BooleanValueNode = {
  is_builtin: true,
  location: Location.std,
  NT: NodeType.value_bool,
  value: 1,
  value_type: VSCTypeBool.object,
};
export const FalseNode: BooleanValueNode = {
  is_builtin: true,
  location: Location.std,
  NT: NodeType.value_bool,
  value: 0,
  value_type: VSCTypeBool.object,
};

export interface TypeValueNode extends NodeBase {
  NT: NodeType.value_type;
  value:
    | LanguageObject
    | LanguageObjectInstance
    | TYPE_UNKNOWN
    | TYPE_ANY
    | TYPE_UNDEFINED;
  location: Location;
}

export interface StructValueNode extends NodeBase {
  NT: NodeType.value_struct;
  value_type: LanguageObject;
  value: Map<string, ValueNode[]>;
  location: Location;
}

export interface ArrayValueNode extends NodeBase {
  NT: NodeType.value_array;
  value_type: LanguageObjectInstance;
  value: ValueNode[];
  location: Location;
}

export type ValueNode =
  | StringLiteralValueNode
  | NumericalValueNode
  | FunctionValueNode
  | PointerValueNode
  | UndefinedValueNode
  | BooleanValueNode
  | TypeValueNode
  | StructValueNode
  | PropertyNode
  | ArrayValueNode
  | SpecialNode;

export enum DefinitionType {
  const = 'const',
  var = 'var',
  struct = 'struct',
  condition = 'condition',
  function = 'function',
  function_argument = 'function_argument',
}

export interface DefinitionNodeVar extends NodeBase {
  NT: NodeType.definition;
  DT: DefinitionType.var;
  definition_id: number | undefined;
  type_check_id: number | undefined;
  local_offset: number | undefined;
  global_offset: number | undefined;
  definition_depth: number | undefined;
  context: ContextNode;
  name: string;
  mutated: boolean;
  location: Location;
  type: TypeNode | RawTypeNode;
  value: ExpressionNode | ExpressionListNode | undefined;
}

export interface DefinitionNodeConst extends NodeBase {
  NT: NodeType.definition;
  DT: DefinitionType.const;
  definition_id: number | undefined;
  type_check_id: number | undefined;
  local_offset: number | undefined;
  global_offset: number | undefined;
  definition_depth: number | undefined;
  context: ContextNode;
  name: string;
  mutated: false;
  location: Location;
  type: TypeNode | RawTypeNode;
  value: ExpressionNode | ExpressionListNode | undefined;
}

export interface DefinitionNodeConditionAlias extends NodeBase {
  NT: NodeType.definition;
  DT: DefinitionType.condition;
  definition_id: number | undefined;
  type_check_id: number | undefined;

  context: ContextNode;
  name: string;
  mutated: false;
  location: Location;
  type: TypeNode;
  value:
    | ExpressionNode
    | ExpressionListReference
    | ExpressionListNode
    | undefined;
}

export interface StructFieldInstanceNode extends NodeBase {
  NT: NodeType.struct_field_instance;
  name: string;
  value: ComputableNode;
  location: Location;
}

export interface StructInstanceNode extends NodeBase {
  NT: NodeType.struct_instance;
  fields: StructFieldInstanceNode[];
  object: ObjectReferenceNode;
}

export interface StructFieldDefinitionNode extends NodeBase {
  NT: NodeType.struct_field_definition;
  name: string;
  type: TypeNode | RawTypeNode | undefined;
  type_check_id: number | undefined;
  location: Location;
  parent: DefinitionNodeStruct;
  optional: boolean;
}

export interface DefinitionNodeStruct extends NodeBase {
  NT: NodeType.definition;
  DT: DefinitionType.struct;
  definition_id: number | undefined;
  type_check_id: number | undefined;
  type: TypeNode | undefined;
  location: Location;
  context: ContextNode;
  name: string;
  fields: StructFieldDefinitionNode[];
}

export interface DefinitionNodeList extends NodeBase {
  NT: NodeType.definition_list;
  members: (DefinitionNodeVar | DefinitionNodeConst)[];
}

export interface DefinitionNodeFunctionArgument extends NodeBase {
  NT: NodeType.definition;
  DT: DefinitionType.function_argument;
  index: number;
  function: FunctionNode;
  definition_id: number | undefined;
  type_check_id: number | undefined;
  name: string;
  mutated: false;
  type: TypeNode | RawTypeNode;
  location: Location;
}

export interface DefinitionNodeFunction extends NodeBase {
  NT: NodeType.definition;
  DT: DefinitionType.function;
  definition_id: number | undefined;
  type_check_id: number | undefined;
  mutated: false;
  location: Location;
  value: FunctionNode;
  name: string;
  type: TypeNode;
}

export type DefinitionNode =
  | DefinitionNodeVar
  | DefinitionNodeConst
  | DefinitionNodeFunction
  | DefinitionNodeStruct
  | DefinitionNodeFunctionArgument
  | DefinitionNodeConditionAlias;

export const enum Associativity {
  /** Left to right */
  LTR,
  /** Right to left */
  RTL,
  /** Not aplicable */
  NA,
}

export interface AccessedPropertyNode extends NodeBase {
  NT: NodeType.accessed_property;
  target: Node;
  property: string;
}

export interface OperatorNode extends NodeBase {
  NT: NodeType.operator;
  location: Location;
  op: OPERATOR;
  asso: Associativity;
  left: Node | undefined;
  right: Node | undefined;
}

export interface PropertyNode extends NodeBase {
  NT: NodeType.property_node;
  location: Location;
  target: Node;
  value: string;
}

export interface StatementWhileNode extends NodeBase {
  NT: NodeType.statement_while;
  parent: ContextNode;
  location: Location;
  child: ContextNode | undefined;
  condition: ExpressionNode | ExpressionListNode | undefined;
  aliases: ReferenceNode[] | undefined;
}

export interface StatementExitNode extends NodeBase {
  NT: NodeType.statement_exit;
  member: ExpressionListNode | undefined;
  location: Location;
}

export interface StatementReturnNode extends NodeBase {
  NT: NodeType.statement_return;
  member: ExpressionListNode | undefined;
  location: Location;
  parent: FunctionNode;
}

export interface StatementDebugNode extends NodeBase {
  NT: NodeType.statement_debug;
  context: ContextNode;
  member: ExpressionNode | ExpressionListNode | OperatorNode | undefined;
}

export interface StatementIfElseNode extends NodeBase {
  NT: NodeType.statement_if_else;
  parent: ContextNode;
  children: ConditionBranchNode[];
  default: ConditionBranchNode | undefined;
}

export interface ConditionBranchNode extends NodeBase {
  NT: NodeType.condition_branch;
  condition: ExpressionNode | ExpressionListNode | undefined;
  aliases: ReferenceNode[] | undefined;
  index: number;
  location: Location;
  is_default: boolean;
  parent: StatementIfElseNode;
  child: ContextNode | undefined;
}

export enum AccessType {
  computed = 'computed',
  property = 'property',
  call = 'call',
}

export type MemoryNode = ValueMemoryNode | FunctionMemoryNode;

export enum MemoryType {
  value,
  function,
  // class,
}

export interface ValueMemoryNode extends NodeBase {
  NT: NodeType.memory;
  MT: MemoryType.value;
  references: number;
  mutable: boolean;
  type: LanguageObject | LanguageObjectInstance | TYPE_VOID | TYPE_UNDEFINED;
  value: ValueNode | ValueNode[];
}

export interface FunctionMemoryNode extends NodeBase {
  NT: NodeType.memory;
  MT: MemoryType.function;
  references: number;
  mutable: false;
  type: LanguageObject;
  value: FunctionNode;
}

export interface StatementLabelNode extends NodeBase {
  NT: NodeType.statement_label;
  loc: Location;
  label: string;
  ctx: ContextNode;
  member_index: number;
}

export interface StatementGotoNode extends NodeBase {
  NT: NodeType.statement_goto;
  ctx: ContextNode;
  loc: Location;
  label: string;
}

export interface RawTypeNode extends NodeBase {
  NT: NodeType.type_raw;
  types: (
    | RawTypeNode
    | LanguageObject
    | TypeWithParametersNode
    | TYPE_ANY
    | TYPE_UNKNOWN
    | TYPE_NEVER
    | TYPE_UNDEFINED
    | TYPE_VOID
  )[];
}

type TypeNodeTypes =
  | LanguageObject
  | LanguageObjectInstance
  | TYPE_ANY
  | TYPE_UNKNOWN
  | TYPE_NEVER
  | TYPE_UNDEFINED
  | TYPE_VOID;

export interface UnionTypeNode extends NodeBase {
  NT: NodeType.type_union;
  types: TypeNodeTypes[];
}

export interface SingleTypeNode extends NodeBase {
  NT: NodeType.type_single;
  type: TypeNodeTypes;
}

export interface TupleTypeNode extends NodeBase {
  NT: NodeType.type_tuple;
  types: TypeNode[];
}

export type TypeNode = UnionTypeNode | SingleTypeNode | TupleTypeNode;

export interface TypeWithParametersNode extends NodeBase {
  NT: NodeType.type_with_parameters;
  type: LanguageObject | TypeWithParametersNode | TYPE_ANY;
  value_parameters: ExpressionListNode | undefined;
  type_parameters: ExpressionListNode | undefined;
}

export interface StatementForNode extends NodeBase {
  NT: NodeType.statement_for;
  location: Location;
  definition: DefinitionNodeConst | DefinitionNodeVar | undefined;
  condition: ConditionBranchNode | undefined;
  final: ExpressionListNode | undefined;
  parent: ContextNode;
}

export interface StatementForInNode extends NodeBase {
  NT: NodeType.statement_for_in;
  location: Location;
  enumerable: ExpressionListNode;
  variables: string[];
  parent: ContextNode;
}
