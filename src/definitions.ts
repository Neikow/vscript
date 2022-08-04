import { DefinitionNode, RawTypeNode, TypeNode } from './syntax_tree_nodes';
import { BUILTIN_KWORD, Location } from './types';

export interface LanguageDefinition {
  node: DefinitionNode;
  child_type: TypeNode | RawTypeNode;
  name: string;
  mutated: boolean;
  location: Location | BUILTIN_KWORD;
}
