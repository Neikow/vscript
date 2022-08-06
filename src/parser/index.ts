import chalk from 'chalk';
import { inspect } from 'util';
import { LanguageDefinition } from '../definitions';
import { Errors } from '../errors';
import {
  LanguageObject,
  LanguageObjectKind,
  ObjectProperty,
  PropertyKind as PK,
} from '../objects';
import { Types } from '../std/types';
import * as AST from '../syntax_tree_nodes';
import {
  FALSE,
  KEYWORD,
  KEYWORDS,
  Location,
  NAN,
  NULL,
  OPERATOR,
  OPERATORS,
  OperatorSubmap,
  Token,
  TokenKind as TK,
  TRUE,
  TYPE_ANY,
  TYPE_UNDEFINED,
  TYPE_UNKNOWN,
  TYPE_VOID,
  UNDEFINED,
} from '../types';

export function getDefinitionNode(
  context: AST.ContextNode,
  literal: string,
  loc: Location
): AST.DefinitionNode | undefined {
  if (context.definitions.has(literal)) {
    const definition = context.definitions.get(literal)!;
    return definition.node;
  } else if (context.parent) {
    const definition = getDefinitionNode(context.parent, literal, loc);
    if (definition) return definition;
  }
  return undefined;
}

export function getObjectNode(
  context: AST.ContextNode,
  literal: string,
  loc: Location
): LanguageObject | undefined {
  if (context.objects.has(literal)) {
    const obj = context.objects.get(literal)!;
    return obj;
  } else if (context.parent) {
    const obj = getObjectNode(context.parent, literal, loc);
    if (obj) return obj;
  }
  return undefined;
}

export function parse(tokens: Token[], context: AST.ContextNode) {
  let idx = 0;
  let len = tokens.length;
  let prev_tok: Token | undefined = undefined;
  let curr_tok: Token | undefined = undefined;

  const labels: string[] = [];

  let ctx_id = 1;

  let curr_ctx: AST.ContextNode = context;
  let used_literals: { val: string; loc: Location }[] = [];

  const context_stack: [AST.ContextNode, { val: string; loc: Location }[]][] =
    [];

  let curr_node: AST.Node | undefined = undefined;

  const node_stack: AST.Node[] = [];

  function next() {
    prev_tok = curr_tok;
    curr_tok = tokens[idx++];

    if (curr_tok?.kind === TK.comment) next();

    return curr_tok;
  }

  function accept(
    kind: TK,
    values?: typeof KEYWORDS[number][],
    consume = false
  ) {
    if (!curr_tok) return false;
    const res =
      curr_tok.kind == kind &&
      (!values || values.includes(curr_tok.val as typeof KEYWORDS[number]));
    if (res && consume) next();
    return res;
  }

  function expect(
    kind: TK,
    values?: typeof KEYWORDS[number][],
    consume = false
  ) {
    if (accept(kind, values, consume)) return true;
    throw Errors.UnexpectedToken(curr_tok, values);
  }

  function getReferencesFromNode(node: AST.Node): AST.ReferenceNode[] {
    if (node.NT === AST.NodeType.reference) {
      return [node];
    } else if (node.NT === AST.NodeType.expression) {
      if (!node.member) throw Errors.ParserError();
      if (node.member.NT === AST.NodeType.language_type) {
        throw Errors.NotImplemented('getReferencesFromNode<builtin_type>');
      }
      if (node.member.NT === AST.NodeType.array) throw Errors.NotImplemented();
      return getReferencesFromNode(node.member);
    } else if (node.NT === AST.NodeType.expression_list) {
      return node.members.flatMap((n) => getReferencesFromNode(n));
    } else {
      throw Errors.ParserError(`Not implemented: ${node.NT}`);
    }
  }

  function getExpressionsFromNode(node: AST.Node): AST.ExpressionNode[] {
    if (node.NT === AST.NodeType.expression) {
      if (node.member && node.member.NT == AST.NodeType.expression_list)
        return getExpressionsFromNode(node.member);

      return [node];
    } else if (node.NT === AST.NodeType.expression_list) {
      return node.members.flatMap((n) => getExpressionsFromNode(n));
    } else {
      throw Errors.ParserError(`Not implemented: ${node.NT}`);
    }
  }

  // TODO: remove
  function consumeAssignement(node: AST.OperatorNode) {
    if (node.op !== 'assign') throw Errors.ParserError();
    if (!node.left) throw Errors.ParserError();
    if (!node.right) throw Errors.ParserError();
    const left_element = getReferencesFromNode(node.left);
    const right_element = getExpressionsFromNode(node.right);

    if (left_element.length == right_element.length) {
      for (let i = 0; i < left_element.length; i++) {
        curr_ctx.members.push({
          NT: AST.NodeType.operator,
          location: node.location,
          asso: node.asso,
          left: left_element[i],
          right: right_element[i],
          op: 'assign',
        });
      }
      return;
    }

    throw Errors.ParserError(`Value unpacking not fully implemented.`);
  }

  function newNode<V extends AST.Node>(node: V): V {
    switch (node.NT) {
      case AST.NodeType.statement_while: {
        if (curr_node) node_stack.push(curr_node);
        const while_context: AST.ContextNode = {
          NT: AST.NodeType.context,
          holder: node,
          id: ctx_id++,
          definitions: new Map(),
          members: [],
          type: undefined,
          objects: new Map(),
          parent: curr_ctx,
          label: 'while_loop',
        };
        context_stack.push([curr_ctx, used_literals]);
        curr_ctx = node.child = while_context;
        used_literals = [];
        curr_node = node;
        return node;
      }
      case AST.NodeType.statement_if_else: {
        if (curr_node) node_stack.push(curr_node);
        curr_node = node;
        return node;
      }
      case AST.NodeType.condition_branch: {
        if (curr_node) node_stack.push(curr_node);
        const ifelse_context: AST.ContextNode = {
          NT: AST.NodeType.context,
          id: ctx_id++,
          definitions: new Map(),
          members: [],
          holder: node,
          objects: new Map(),
          parent: curr_ctx,
          type: undefined,
          label: 'if_else',
        };
        context_stack.push([curr_ctx, used_literals]);
        curr_ctx = node.child = ifelse_context;
        used_literals = [];
        curr_node = node;
        return node;
      }
      case AST.NodeType.context: {
        context_stack.push([curr_ctx, used_literals]);
        used_literals = [];
        curr_ctx = node;
        return node;
      }
      case AST.NodeType.definition_list: {
        if (curr_node) node_stack.push(curr_node);
        curr_node = node;
        return node;
      }
      case AST.NodeType.function: {
        if (curr_node) node_stack.push(curr_node);
        const fun_context: AST.ContextNode = {
          NT: AST.NodeType.context,
          id: ctx_id++,
          holder: node,
          type: AST.ContextType.function,
          definitions: new Map(),
          members: [],
          objects: new Map(),
          parent: curr_ctx,
          label: `function`,
        };
        context_stack.push([curr_ctx, used_literals]);
        curr_ctx = node.context = fun_context;
        used_literals = [];
        curr_node = node;
        return node;
      }
      case AST.NodeType.definition: {
        if (node.DT !== AST.DefinitionType.struct)
          throw Errors.ParserError(
            'variable definition node already implemented'
          );
        if (node.context.objects.has(node.name)) {
          throw Errors.SyntaxError(`name ${node.name} already in use`);
        }
        curr_node = node;
        node.context.objects.set(node.name, {
          NT: AST.NodeType.language_object,
          kind: LanguageObjectKind.object,
          display_name: node.name,
          location: node.location,
          builtin_reference: undefined,
          is_struct: true,
          mutable: false,
          properties: undefined,
          parameters: {
            template_types: undefined,
            values: undefined,
          },
        });
        return node;
      }
      default: {
        if (curr_node) node_stack.push(curr_node);
        curr_node = node;
        return node;
      }
    }
  }

  function endNode(type: AST.NodeType) {
    if (type === AST.NodeType.context) {
      if (context_stack.length < 1) throw Errors.ParserError();
      const stray_context = curr_ctx;
      [curr_ctx, used_literals] = context_stack.pop()!;
      curr_ctx.members.push(stray_context);
      return;
    }

    if (curr_node?.NT !== type)
      throw Errors.ParserError(
        `Expected node type: ${type}, got ${curr_node?.NT}.`
      );

    if (curr_node.NT === AST.NodeType.definition_list) {
      for (const definition of curr_node.members) {
        if (definition.context.definitions.has(definition.name)) {
          throw Errors.SyntaxError('Variable exists.');
        }

        const indexInUsed = used_literals
          .map(({ val }) => val)
          .indexOf(definition.name);

        if (indexInUsed !== -1) {
          const used = used_literals[indexInUsed];
          throw Errors.SyntaxError(
            `Variable ${chalk.blueBright(
              used.val
            )} used before declaration at ${chalk.greenBright(
              '"' + used.loc.format() + '"'
            )}.`
          );
        }

        definition.context.definitions.set(definition.name, {
          node: definition,
          name: definition.name,
          child_type: definition.type,
          mutated: false,
          location: definition.location,
        });
        definition.context.members.push(definition);
      }

      curr_node = node_stack.pop();
      return;
    }

    if (curr_node.NT === AST.NodeType.definition) {
      if (curr_node.DT !== AST.DefinitionType.struct)
        throw Errors.ParserError(
          'variable definition node already implemented'
        );

      const struct = curr_node.context.objects.get(curr_node.name);
      if (!struct) throw Errors.ParserError('missing struct');

      struct.properties = new Map<string, ObjectProperty>(
        curr_node.fields.map((field): [string, ObjectProperty] => {
          if (!field.type) throw Errors.ParserError();
          return [
            field.name,
            {
              name: field.name,
              type: field.type,
              location: field.location,
              optional: field.optional,
              kind: PK.value,
            },
          ];
        })
      );

      curr_node = node_stack.pop();
      return;
    }

    if (curr_node.NT === AST.NodeType.function) {
      if (!curr_node.name || !curr_node.location) throw Errors.ParserError();

      const def: AST.DefinitionNodeFunction = {
        location: curr_node.location,
        name: curr_node.name,
        DT: AST.DefinitionType.function,
        NT: AST.NodeType.definition,
        value: curr_node,
        mutated: false,
        definition_id: undefined,
        type_check_id: undefined,
        type: { NT: AST.NodeType.type_single, type: Types.function.object },
      };

      const parent = context_stack.pop();
      if (!parent) throw Errors.ParserError();

      [curr_ctx, used_literals] = parent;

      curr_ctx.members.push(def);

      curr_ctx.definitions.set(curr_node.name, {
        child_type: {
          NT: AST.NodeType.type_single,
          type: Types.function.object,
        },
        location: curr_node.location,
        mutated: false,
        name: curr_node.name,
        node: def,
      });

      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.statement_return) {
      curr_ctx.members.push(curr_node);
      curr_node = node_stack.pop();
      return;
    }

    if (curr_node.NT === AST.NodeType.statement_debug) {
      curr_node.context.members.push(curr_node);
      curr_node = node_stack.pop();
      return;
    }

    if (curr_node.NT === AST.NodeType.statement_while) {
      const parent_context = context_stack.pop();
      if (!parent_context) throw Errors.ParserError();

      [curr_ctx, used_literals] = parent_context;

      curr_ctx.members.push(curr_node);

      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.expression) {
      curr_ctx.members.push(curr_node);
      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.condition_branch) {
      const parent_context = context_stack.pop();
      if (!parent_context) throw Errors.ParserError();

      if (!curr_node.is_default) curr_node.parent.children.push(curr_node);

      [curr_ctx, used_literals] = parent_context;
      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.statement_if_else) {
      curr_ctx = curr_node.parent;
      curr_ctx.members.push(curr_node);
      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.statement_label) {
      curr_ctx.members.push(curr_node);
      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.statement_goto) {
      curr_ctx.members.push(curr_node);
      curr_node = node_stack.pop();

      return;
    }

    if (curr_node.NT === AST.NodeType.statement_exit) {
      curr_ctx.members.push(curr_node);
      curr_node = node_stack.pop();

      return;
    }

    throw Errors.NotImplemented(type);
  }

  function consumeType(type: AST.RawTypeNode) {
    if (!curr_node) throw Errors.ParserError();

    switch (curr_node.NT) {
      case AST.NodeType.definition_list: {
        for (const node of curr_node.members) {
          node.type = type;
        }
        return;
      }
      case AST.NodeType.definition: {
        if (
          curr_node.DT === AST.DefinitionType.function ||
          curr_node.DT === AST.DefinitionType.function_argument ||
          curr_node.DT === AST.DefinitionType.struct
        )
          throw Errors.ParserError();
        curr_node.type = type;
        return;
      }
      default: {
        throw Errors.ParserError(`Not implemented: ${curr_node.NT}`);
      }
    }
    //
  }

  // function consumeDefinition(node: DefinitionNodeConst | DefinitionNodeVar) {
  //   if (curr_node?.NT !== AST.NodeType.definition_list) throw ParserError;
  //   curr_node.members.push(node);
  // }

  function getOperatorNode(op: OPERATOR, loc: Location): AST.OperatorNode {
    return {
      NT: AST.NodeType.operator,
      op: op,
      location: loc,
      asso: OPERATORS[op].asso,
      left: undefined,
      right: undefined,
    };
  }

  function context_block(isUnreachable = false) {
    newNode({
      NT: AST.NodeType.context,
      id: ctx_id++,
      definitions: new Map<string, LanguageDefinition>(),
      objects: new Map<string, LanguageObject>(),
      members: [],
      holder: undefined,
      parent: curr_ctx,
      label: 'stray_context',
      type: undefined,
    });
    block(isUnreachable);
    endNode(AST.NodeType.context);
  }

  function type_union(): AST.RawTypeNode {
    const node: AST.RawTypeNode = {
      NT: AST.NodeType.raw_type,
      types: [],
    };

    const typ = type_literal();
    node.types.push(typ);

    while (accept(TK.keyword, ['|'], true)) {
      const typ = type_literal();
      if (!typ) throw Errors.SyntaxError('missing type');

      node.types.push(typ);
    }

    return node;
  }

  function type_with_params(type: LanguageObject | TYPE_ANY): AST.RawTypeNode {
    if (accept(TK.keyword, ['['], true)) {
      const res = expression_list();
      if (!res) throw Errors.ParserError('Missing expression');

      expect(TK.keyword, [']'], true);

      return {
        NT: AST.NodeType.raw_type,
        types: [
          {
            NT: AST.NodeType.type_with_parameters,
            type: type,
            value_parameters: res,
            type_parameters: undefined,
          },
        ],
      };
    } else if (accept(TK.keyword, ['<'], true)) {
      throw Errors.NotImplemented('type parameters');
    } else {
      throw Errors.ParserError(curr_tok!.val);
    }
  }

  // TODO: replace with a proper type reference
  function type_literal(): AST.RawTypeNode {
    if (accept(TK.keyword, ['unknown'])) {
      throw Errors.NotImplemented('unknown');
    } else if (accept(TK.identifier)) {
      const type = getObjectNode(curr_ctx, curr_tok!.val, curr_tok!.loc);

      if (!type)
        throw Errors.SyntaxError(
          `Unknown type ${chalk.blue(curr_tok!.val)} at ${chalk.green(
            '"' + curr_tok!.loc.format() + '"'
          )}`
        );
      next();

      if (accept(TK.keyword, ['[', '<'])) return type_with_params(type);

      return { NT: AST.NodeType.raw_type, types: [type] };
    } else if (
      accept(TK.keyword, ['str', 'int', 'flt', 'ptr', 'bool', 'any'])
    ) {
      const type_map = {
        bool: Types.boolean.object,
        str: Types.string.object,
        int: Types.integer.object,
        flt: Types.float.object,
      };

      if (curr_tok?.val === 'ptr') throw Errors.NotImplemented('pointers');

      if (Object.keys(type_map).includes(curr_tok!.val)) {
        next();
        if (accept(TK.keyword, ['[', '<']))
          return type_with_params(
            type_map[prev_tok!.val as keyof typeof type_map]
          );

        return {
          NT: AST.NodeType.raw_type,
          types: [type_map[prev_tok!.val as keyof typeof type_map]],
        };
      }

      if (curr_tok!.val === TYPE_ANY) {
        next();
        if (accept(TK.keyword, ['[', '<'])) return type_with_params(TYPE_ANY);
        return {
          NT: AST.NodeType.raw_type,
          types: [prev_tok!.val as TYPE_ANY],
        };
      }
    } else if (accept(TK.literal_lang)) {
      if (curr_tok!.val === UNDEFINED) {
        next();
        return {
          NT: AST.NodeType.raw_type,
          types: [TYPE_UNDEFINED],
        };
      } else {
        throw Errors.SyntaxError(`${curr_tok!.val} is not a type`);
      }
    }

    throw Errors.SyntaxError(
      `Type literal must be an identifier, got ${curr_tok!.val}`
    );
  }

  function def_identifier(
    type: AST.DefinitionType.const | AST.DefinitionType.var
  ): AST.DefinitionNodeConst | AST.DefinitionNodeVar | undefined {
    expect(TK.identifier);

    const res: AST.DefinitionNodeConst | AST.DefinitionNodeVar = {
      NT: AST.NodeType.definition,
      DT: type,
      mutated: false,
      definition_id: undefined,
      type_check_id: undefined,
      context: curr_ctx,
      local_offset: undefined,
      global_offset: undefined,
      location: curr_tok?.loc ?? Location.std,
      type: { NT: AST.NodeType.type_single, type: TYPE_UNKNOWN },
      name: curr_tok!.val,
      value: undefined,
    };
    next();
    expect(TK.keyword, [',', ':', '=', ';']);

    return res;
  }

  function literal_identifier():
    | AST.ReferenceNode
    | AST.ObjectReferenceNode
    | undefined {
    const literal = curr_tok!.val;
    used_literals.push({ val: literal, loc: curr_tok!.loc });

    const def = getDefinitionNode(curr_ctx, literal, curr_tok!.loc);
    if (!def) {
      const obj = getObjectNode(curr_ctx, literal, curr_tok!.loc);

      if (!obj) throw Errors.UnknownLiteral(literal, curr_tok!.loc);

      const node: AST.ObjectReferenceNode = {
        NT: AST.NodeType.object_reference,
        value: obj,
        location: curr_tok!.loc,
      };
      next();

      return node;
    }
    if (!def)
      throw Errors.ParserError(
        `Unknown literal: "${literal}" at ${curr_tok?.loc.format()}.`
      );

    if (def.DT === AST.DefinitionType.struct)
      throw Errors.NotImplemented('struct');

    const node: AST.ReferenceNode = {
      NT: AST.NodeType.reference,
      definition: def,
      mutated: def.mutated,
    };

    next();

    return node;
  }

  function access(
    target: AST.Node
  ): AST.OperatorNode | AST.StructInstanceNode | undefined {
    if (accept(TK.keyword, ['('], true)) {
      let args;
      if (!accept(TK.keyword, [')'])) {
        args = expression_list();
      }

      const node: AST.OperatorNode = {
        NT: AST.NodeType.operator,
        op: 'access_call',
        left: target,
        right: args ?? { NT: AST.NodeType.expression_list, members: [] },
        asso: OPERATORS['access_call'].asso,
        location: prev_tok!.loc,
      };

      expect(TK.keyword, [')'], true);

      const access_node = access(node);

      if (access_node) return access_node;
      return node;
    } else if (accept(TK.keyword, ['['], true)) {
      const res = expression_list();

      if (!res) throw Errors.ParserError('Expected expression.');

      const node: AST.OperatorNode = {
        NT: AST.NodeType.operator,
        op: 'access_computed',
        left: target,
        right: res,
        asso: OPERATORS['access_computed'].asso,
        location: prev_tok!.loc,
      };

      expect(TK.keyword, [']'], true);

      const access_node = access(node);

      if (access_node) return access_node;
      return node;
    } else if (accept(TK.keyword, ['.'], true)) {
      expect(TK.identifier, undefined, true);
      const node: AST.OperatorNode = {
        NT: AST.NodeType.operator,
        op: 'access_property',
        left: target,
        right: undefined,
        asso: OPERATORS['access_property'].asso,
        location: prev_tok!.loc,
      };

      const res: AST.PropertyNode = {
        NT: AST.NodeType.property_node,
        location: prev_tok!.loc,
        value: prev_tok!.val,
        target: node,
      };

      node.right = res;

      const access_node = access(node);

      if (access_node) return access_node;
      return node;
    } else if (accept(TK.keyword, ['{'], true)) {
      if (target.NT !== AST.NodeType.object_reference)
        throw Errors.NotImplemented('struct formation');

      const node: AST.StructInstanceNode = {
        NT: AST.NodeType.struct_instance,
        fields: [],
        object: target,
      };

      while (accept(TK.identifier, undefined, true)) {
        const name = prev_tok!.val;
        const loc = prev_tok!.loc;
        expect(TK.keyword, [':'], true);
        const value = assignement();
        if (!value) throw Errors.SyntaxError('an expression is required');

        node.fields.push({
          NT: AST.NodeType.struct_field_instance,
          name: name,
          value: value,
          location: loc,
        });

        accept(TK.keyword, [','], true);
      }

      expect(TK.keyword, ['}'], true);

      const access_node = access(node);
      if (access_node) return access_node;
      return node;
    }
  }

  function literal(): AST.Node | undefined {
    if (accept(TK.keyword, ['('], true)) {
      const res = expression_list();
      expect(TK.keyword, [')'], true);

      if (res) {
        const access_node = access(res);
        if (access_node) return access_node;
      }

      return res;
    } else if (accept(TK.identifier)) {
      const res = literal_identifier();

      if (res) {
        const access_node = access(res);
        if (access_node) return access_node;
      }

      return res;
    } else if (accept(TK.literal_number_int) || accept(TK.literal_number_flt)) {
      const res: AST.NumberLiteralNode = {
        NT: AST.NodeType.literal_number,
        location: curr_tok!.loc,
        value_type:
          curr_tok!.kind == TK.literal_number_int
            ? Types.integer.object
            : Types.float.object,
        value: curr_tok!.val,
      };
      next();

      if (res) {
        const access_node = access(res);
        if (access_node) return access_node;
      }
      return res;
    } else if (accept(TK.literal_string)) {
      const res: AST.StringLiteralNode = {
        NT: AST.NodeType.literal_string,
        location: curr_tok!.loc,
        value_type: Types.string.object,
        value: curr_tok!.val,
      };

      next();

      if (res) {
        const access_node = access(res);
        if (access_node) return access_node;
      }

      return res;
    } else if (accept(TK.literal_lang)) {
      switch (curr_tok!.val) {
        case TRUE:
        case FALSE: {
          const res: AST.BooleanLiteralNode = {
            NT: AST.NodeType.literal_boolean,
            location: curr_tok!.loc,
            value: curr_tok!.val == 'true' ? 1 : 0,
            value_type: Types.boolean.object,
          };
          next();

          if (res) {
            const access_node = access(res);
            if (access_node) return access_node;
          }

          return res;
        }
        case NULL: {
          const res: AST.BuiltinLiteralNode = {
            NT: AST.NodeType.literal_builtin,
            location: curr_tok!.loc,
            value: NULL,
            value_type: TYPE_UNKNOWN,
          };
          next();
          return res;
        }
        case UNDEFINED: {
          const res: AST.BuiltinLiteralNode = {
            NT: AST.NodeType.literal_builtin,
            location: curr_tok!.loc,
            value: UNDEFINED,
            value_type: TYPE_UNDEFINED,
          };
          next();
          return res;
        }
        case NAN: {
          const res: AST.NumberLiteralNode = {
            NT: AST.NodeType.literal_number,
            location: curr_tok!.loc,
            value: NAN,
            value_type: Types.float.object,
          };
          next();
          return res;
        }
        default: {
          throw Errors.ParserError(
            `Unknown language literal: "${curr_tok?.val}"`
          );
        }
      }
    } else if (accept(TK.keyword, ['here'])) {
      const res: AST.SpecialNode = {
        NT: AST.NodeType.special,
        location: curr_tok!.loc,
        value: 'here',
      };
      next();
      return res;
    } else if (accept(TK.keyword, ['console_input'])) {
      const res: AST.SpecialNode = {
        NT: AST.NodeType.special,
        location: curr_tok!.loc,
        value: 'console_input',
      };
      next();
      const access_node = access(res);
      if (access_node) return access_node;
      return res;
    } else if (accept(TK.keyword, ['dump_mem'])) {
      const res: AST.SpecialNode = {
        NT: AST.NodeType.special,
        location: curr_tok!.loc,
        value: 'dump_mem',
      };
      next();
      const access_node = access(res);
      if (access_node) return access_node;
      return res;
    } else if (accept(TK.keyword, ['bool', 'int', 'str', 'flt', 'ptr'])) {
      const type_map = {
        bool: Types.boolean,
        int: Types.integer,
        flt: Types.float,
        str: Types.string,
        ptr: Types.pointer,
      };
      const res: AST.LanguageTypeNode = {
        NT: AST.NodeType.language_type,
        definition: type_map[curr_tok!.val as keyof typeof type_map],
      };
      next();
      const access_node = access(res);
      if (access_node) return access_node;
      return res;
    } else if (accept(TK.keyword, ['{'], true)) {
      throw Errors.NotImplemented('objects');
    } else {
      throw Errors.ParserError(
        `Not implemented: ${curr_tok?.kind}:${
          curr_tok?.val
        } at "${curr_tok?.loc.format()}"`
      );
    }
  }

  function postfix_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    node.member = literal();

    const op_map: OperatorSubmap = {
      '++': 'incr',
      '--': 'decr',
    };

    if (accept(TK.keyword, ['++', '--'], true)) {
      const op_tok = prev_tok!;

      const op_node = getOperatorNode(
        op_map[op_tok.val as KEYWORD]!,
        op_tok.loc
      );

      if (!node.member) throw Errors.ParserError();
      op_node.left = node.member;

      node.member = op_node;
    }

    if (node.member) return node;
    return;
  }

  function prefix_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const unary_op_map: OperatorSubmap = {
      '+': 'uadd',
      '-': 'usub',
      '!': 'not',
      typeof: 'typeof',
    };

    if (accept(TK.keyword, ['+', '-', '!', 'typeof'], true)) {
      const op_tok = prev_tok!;

      const op_node = getOperatorNode(
        unary_op_map[op_tok.val as KEYWORD]!,
        op_tok.loc
      );

      const res = prefix_term();
      if (!res) throw Errors.ParserError('Expected an expression.');
      op_node.right = res;
      node.member = op_node;

      return node;
    }

    const res = postfix_term();
    node.member = res;

    if (node.member) return node;
    return;
  }

  function exponentiation_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = prefix_term();
    if (!res) throw Errors.ParserError('Expected an expression.');
    node.member = res;

    if (node.member) return node;
    else return;
  }

  function multiplication_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = exponentiation_term();
    if (!res) throw Errors.ParserError('Expected an expression.');

    node.member = res;

    while (accept(TK.keyword, ['**'], true)) {
      const op_node = getOperatorNode('pow', prev_tok!.loc);

      const res = multiplication_term();
      if (!res) throw Errors.ParserError('Expected an expression.');

      op_node.right = res;
      op_node.left = node.member;

      node.member = op_node;
    }

    if (node.member) return node;
    else return;
  }

  function addition_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = multiplication_term();
    if (!res) throw Errors.ParserError('Expected an expression.');

    if (node.member) {
      (node.member as AST.OperatorNode).right = res;
      node.member = node;
    } else {
      node.member = res;
    }

    const op_map: OperatorSubmap = {
      '*': 'mul',
      '/': 'div',
      '%': 'mod',
      '~/': 'wdiv',
    };

    while (accept(TK.keyword, ['*', '/', '%', '~/'], true)) {
      const op_tok = prev_tok!;
      const res = addition_term();

      if (!res) throw Errors.ParserError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode(
        op_map[op_tok.val as KEYWORD]!,
        op_tok.loc
      );

      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    else return;
  }

  function inequality_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    if (accept(TK.keyword, ['['], true)) {
      const prev = prev_tok!;
      const array: AST.ArrayExpressionNode = {
        list: expression_list(),
        NT: AST.NodeType.array,
        value_type: undefined,
        // TODO: proper location
        location: prev.loc,
      };
      node.member = array;
      expect(TK.keyword, [']'], true);
      return node;
    } else {
      const res = addition_term();
      if (!res) throw Errors.ParserError('Expected expression.');
      node.member = res;
    }

    while (accept(TK.keyword, ['+', '-'], true)) {
      const op_tok = prev_tok!;
      const res = inequality_term();

      if (!res) throw Errors.ParserError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode(
        (op_tok.val as KEYWORD) == '+' ? 'add' : 'sub',
        op_tok.loc
      );
      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function equality_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = inequality_term();
    if (!res) throw Errors.ParserError('Expected expression.');

    node.member = res;

    const op_map: OperatorSubmap = {
      '<': 'lt',
      '<=': 'leq',
      '>': 'gt',
      '>=': 'geq',
    };

    while (accept(TK.keyword, ['<', '<=', '>', '>='], true)) {
      const op_tok = prev_tok!;
      const res = equality_term();

      if (!res) throw Errors.ParserError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode(
        op_map[op_tok.val as KEYWORD]!,
        op_tok.loc
      );
      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function and_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = equality_term();
    if (!res) throw Errors.ParserError('Expected expression.');

    node.member = res;

    const op_map: OperatorSubmap = {
      '==': 'eq',
      '!=': 'neq',
    };

    while (accept(TK.keyword, ['==', '!='], true)) {
      const op_tok = prev_tok!;
      const res = and_term();

      if (!res) throw Errors.ParserError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode(
        op_map[op_tok.val as KEYWORD]!,
        op_tok.loc
      );
      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function or_term(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = and_term();
    if (!res) throw Errors.ParserError('Expected expression.');

    node.member = res;

    while (accept(TK.keyword, ['&&'], true)) {
      const op_tok = prev_tok!;
      const res = or_term();

      if (!res) throw Errors.ParserError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode('and', op_tok.loc);
      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function condition(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = or_term();
    if (!res) throw Errors.SyntaxError('Expected expression.');

    node.member = res;

    const op_map: OperatorSubmap = {
      '||': 'or',
      '!|': 'xor',
    };

    while (accept(TK.keyword, ['||', '!|'], true)) {
      const op_tok = prev_tok!;
      const res = condition();
      if (!res) throw Errors.SyntaxError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode(
        op_map[op_tok!.val as KEYWORD]!,
        op_tok.loc
      );
      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function castable(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = condition();
    if (!res) throw Errors.SyntaxError('Expected expression.');

    node.member = res;

    while (accept(TK.keyword, ['cast'], true)) {
      const op_tok = prev_tok!;

      // TODO: force the litteral being a type.
      const res = literal();
      if (!res) throw Errors.SyntaxError('Expected expression.');

      const op_node: AST.OperatorNode = getOperatorNode('cast', op_tok.loc);

      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function assignement(): AST.ExpressionNode | undefined {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };

    const res = castable();
    if (!res) throw Errors.ParserError('Expected expression.');

    node.member = res;

    const op_map: OperatorSubmap = {
      '=': 'assign',
      '+=': 'add_assign',
      '-=': 'sub_assign',
      '**=': 'pow_assign',
      '*=': 'mul_assign',
      '/=': 'div_assign',
      '%=': 'mod_assign',
      '~/=': 'wdiv_assign',
    };

    while (
      accept(
        TK.keyword,
        ['=', '+=', '-=', '**=', '*=', '/=', '%=', '~/='],
        true
      )
    ) {
      const op_tok = prev_tok;
      const res = assignement();

      if (!res) throw Errors.ParserError('Expected an expression.');

      const op_node: AST.OperatorNode = getOperatorNode(
        op_map[op_tok!.val as KEYWORD]!,
        op_tok!.loc
      );
      op_node.left = node.member;
      op_node.right = res;

      node.member = op_node;
    }

    if (node.member) return node;
    return undefined;
  }

  function expression_list(): AST.ExpressionListNode | undefined {
    const node: AST.ExpressionListNode = {
      NT: AST.NodeType.expression_list,
      members: [],
    };

    const res = assignement();
    if (!res) throw Errors.ParserError('Expected an expression.');
    node.members.push(res);
    while (accept(TK.keyword, [','], true)) {
      const res = assignement();
      if (!res) break;
      node.members.push(res);
    }

    if (node.members.length) return node;
    return undefined;
  }

  function definition(
    type: AST.DefinitionType.const | AST.DefinitionType.var,
    isUnreachable = false
  ): void {
    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);

    const members: (AST.DefinitionNodeConst | AST.DefinitionNodeVar)[] = [];
    newNode({
      NT: AST.NodeType.definition_list,
      members: members,
    });

    const res = def_identifier(type);
    if (!res) throw Errors.ParserError();
    members.push(res);

    while (accept(TK.keyword, [','], true)) {
      const res = def_identifier(type);
      if (!res) break;
      members.push(res);
    }

    if (accept(TK.keyword, [':'], true)) {
      const var_type = type_union();
      if (!var_type) throw Errors.ParserError('Unexpected Token');
      consumeType(var_type);
    }

    if (type == AST.DefinitionType.var && accept(TK.keyword, [';'], true))
      return endNode(AST.NodeType.definition_list);

    expect(TK.keyword, ['='], true);

    const expr_list = expression_list();

    if (!expr_list) throw Errors.ParserError();

    if (expr_list.members.length === 1) {
      members.forEach((d) => {
        d.value = expr_list.members[0];
      });
    } else if (expr_list.members.length === members.length) {
      members.forEach((d, i) => {
        d.value = expr_list.members[i];
      });
    } else {
      throw Errors.ParserError('Unable to unpack expression.');
    }

    expect(TK.keyword, [';'], true);
    endNode(AST.NodeType.definition_list);
  }

  function statement_debug(isUnreachable = false) {
    const node: AST.StatementDebugNode = {
      NT: AST.NodeType.statement_debug,
      context: curr_ctx,
      member: undefined,
    };
    newNode(node);

    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);

    const res = expression_list();
    if (!res) throw Errors.ParserError('Expected expression.');

    node.member = res;

    expect(TK.keyword, [';'], true);
    endNode(AST.NodeType.statement_debug);
  }

  function createAliasesList(aliased: AST.ExpressionListNode) {
    const aliases: AST.ReferenceNode[] = [];

    let alias_count = 0;

    if (!expect(TK.identifier))
      throw Errors.ParserError('Expected identifier.');
    const res = curr_tok!.val;

    function addAlias(alias: string) {
      if (curr_ctx.definitions.has(alias)) throw Errors.ParserError();

      const def: AST.DefinitionNodeConditionAlias = {
        NT: AST.NodeType.definition,
        DT: AST.DefinitionType.condition,
        mutated: false,
        context: curr_ctx,
        value: {
          NT: AST.NodeType.expression_list_reference,
          list: aliased,
          index: alias_count++,
        },
        type: { NT: AST.NodeType.type_single, type: TYPE_UNKNOWN },
        definition_id: undefined,
        type_check_id: undefined,
        location: curr_tok!.loc,
        name: alias,
      };

      curr_ctx.members.push(def);

      curr_ctx.definitions.set(alias, {
        node: def,
        child_type: { NT: AST.NodeType.type_single, type: TYPE_UNKNOWN },
        location: curr_tok!.loc,
        mutated: false,
        name: alias,
      });
    }

    addAlias(res);
    next();

    while (accept(TK.keyword, [','], true)) {
      if (!accept(TK.identifier)) {
        next();
        break;
      }

      if (!expect(TK.identifier))
        throw Errors.ParserError('Expected identifier.');
      const res = curr_tok!.val;
      addAlias(res);
      next();
    }
    return aliases;
  }

  function statement_while(isUnreachable = false) {
    const while_node = newNode<AST.StatementWhileNode>({
      NT: AST.NodeType.statement_while,
      location: prev_tok!.loc,
      condition: undefined,
      aliases: undefined,
      child: undefined,
      parent: curr_ctx,
    });

    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);

    const cond = expression_list();
    if (!cond || !cond.members)
      throw Errors.ParserError('Expected expression.');

    while_node.condition = cond;

    if (accept(TK.keyword, ['as'], true)) {
      const res = createAliasesList(cond);
      if (!res) throw Errors.ParserError('Expected identifier.');
      while_node.aliases = res;
    }

    expect(TK.keyword, ['do'], true);
    expect(TK.keyword, ['{'], true);

    block();

    expect(TK.keyword, ['}'], true);
    endNode(AST.NodeType.statement_while);
  }

  function statement_assignement() {
    const node: AST.ExpressionNode = {
      NT: AST.NodeType.expression,
      member: undefined,
      location: curr_tok!.loc,
    };
    newNode(node);
    const res = expression_list();
    if (!res) throw Errors.ParserError();
    node.member = res;
    expect(TK.keyword, [';'], true);
    endNode(AST.NodeType.expression);
  }

  function statement_ifelse(isUnreachable = false) {
    const children: AST.ConditionBranchNode[] = [];
    const node = newNode<AST.StatementIfElseNode>({
      NT: AST.NodeType.statement_if_else,
      children: children,
      parent: curr_ctx,
      default: undefined,
    });

    if (isUnreachable) throw Errors.UnreachableCode(curr_tok!);

    let continue_parsing = true;
    let branch_index = 1;

    while (continue_parsing && accept(TK.keyword, ['if'], true)) {
      // parsing_this = true;
      const branch = newNode<AST.ConditionBranchNode>({
        NT: AST.NodeType.condition_branch,
        index: branch_index++,
        aliases: undefined,
        child: undefined,
        is_default: false,
        condition: undefined,
        location: prev_tok!.loc,
        parent: node,
      });

      const cond = expression_list();
      if (!cond || !cond.members)
        throw Errors.ParserError('Expected expression.');

      branch.condition = cond;

      if (accept(TK.keyword, ['as'], true)) {
        const res = createAliasesList(cond);
        if (!res) throw Errors.ParserError('Expected identifier.');
        branch.aliases = res;
      }

      expect(TK.keyword, ['do'], true);
      expect(TK.keyword, ['{'], true);

      block();

      expect(TK.keyword, ['}'], true);

      endNode(AST.NodeType.condition_branch);

      if (accept(TK.keyword, ['else'], true)) continue_parsing = true;
      else continue_parsing = false;
    }

    if (prev_tok!.kind == TK.keyword && prev_tok?.val == 'else') {
      const branch = newNode<AST.ConditionBranchNode>({
        NT: AST.NodeType.condition_branch,
        index: 0,
        aliases: undefined,
        child: undefined,
        is_default: true,
        condition: undefined,
        location: prev_tok!.loc,
        parent: node,
      });

      expect(TK.keyword, ['{'], true);

      block();

      expect(TK.keyword, ['}'], true);

      node.default = branch;

      endNode(AST.NodeType.condition_branch);
    }

    endNode(AST.NodeType.statement_if_else);
  }

  function argument_list(): AST.ArgumentNode[] {
    const res: AST.ArgumentNode[] = [];

    if (accept(TK.keyword, [')'])) return res;

    expect(TK.identifier, undefined, true);

    let arg: AST.ArgumentNode = {
      NT: AST.NodeType.argument,
      is_optional: false,
      name: prev_tok!.val,
      location: prev_tok!.loc,
      type: { NT: AST.NodeType.type_single, type: TYPE_ANY },
    };

    if (accept(TK.keyword, [':'], true)) {
      arg.type = type_union();
    }

    res.push(arg);

    while (accept(TK.keyword, [','], true)) {
      expect(TK.identifier, undefined, true);

      arg = {
        NT: AST.NodeType.argument,
        is_optional: false,
        name: prev_tok!.val,
        type: { NT: AST.NodeType.type_single, type: TYPE_ANY },
        location: prev_tok!.loc,
      };

      if (accept(TK.keyword, [':'], true)) {
        arg.type = type_union();
      }

      res.push(arg);
    }

    return res;
  }

  function definitionsFromArguments(node: AST.FunctionNode) {
    if (!node.context) throw Errors.ParserError();

    for (let i = 0; i < node.arguments.length; i++) {
      if (node.arguments[i].name === undefined) throw Errors.ParserError();

      let idx = node.arguments.length - 1;

      node.context.definitions.set(node.arguments[i].name!, {
        mutated: false,
        child_type: node.arguments[i].type,
        location: node.arguments[i].location,
        name: node.arguments[i].name!,
        node: {
          NT: AST.NodeType.definition,
          DT: AST.DefinitionType.function_argument,
          mutated: false,
          type: node.arguments[i].type,
          definition_id: undefined,
          type_check_id: undefined,
          location: node.arguments[i].location,
          name: node.arguments[i].name!,
          index: i,
          function: node,
        },
      });
    }
  }

  function function_definition(isUnreachable = false) {
    const fun = newNode<AST.FunctionNode>({
      NT: AST.NodeType.function,
      location: undefined,
      arguments: [],
      has_return: false,
      type_arguments: [],
      return_type: { NT: AST.NodeType.type_single, type: TYPE_VOID },
      name: undefined,
      context: undefined,
    });

    next();

    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);

    if (!accept(TK.identifier))
      throw Errors.UnexpectedToken(curr_tok, ['identifier']);
    if (!curr_tok) throw Errors.ParserError();

    fun.name = curr_tok.val;
    if (curr_ctx.parent && curr_ctx.parent.definitions.has(fun.name))
      throw Errors.ParserError('Function name already used.');

    fun.location = curr_tok.loc;

    next();

    expect(TK.keyword, ['('], true);

    fun.arguments = argument_list();

    definitionsFromArguments(fun);

    expect(TK.keyword, [')'], true);

    if (accept(TK.keyword, [':'], true)) {
      fun.return_type = type_union();
    }

    expect(TK.keyword, ['{'], true);

    block();

    expect(TK.keyword, ['}'], true);

    endNode(AST.NodeType.function);
  }

  function statement_return(isUnreachable = false) {
    if (isUnreachable) throw Errors.UnreachableCode(curr_tok!);

    const findParentFunction = (
      context: AST.ContextNode
    ): AST.FunctionNode | undefined => {
      if (context.type != AST.ContextType.function) {
        if (context.parent === undefined)
          throw Errors.NotImplemented('top-level return');
        return findParentFunction(context.parent);
      }

      return context.holder as AST.FunctionNode;
    };

    const parent = findParentFunction(curr_ctx);

    if (!parent) throw Errors.ParserError();

    const node = newNode<AST.StatementReturnNode>({
      NT: AST.NodeType.statement_return,
      member: undefined,
      location: curr_tok!.loc,
      parent: parent,
    });

    next();

    if (!accept(TK.keyword, [';'], true)) {
      node.member = expression_list();

      expect(TK.keyword, [';'], true);
    }

    endNode(AST.NodeType.statement_return);
  }

  function statement_exit(isUnreachable = false) {
    if (isUnreachable) throw Errors.UnreachableCode(curr_tok!);

    const node = newNode<AST.StatementExitNode>({
      NT: AST.NodeType.statement_exit,
      member: undefined,
      location: curr_tok!.loc,
    });

    next();

    if (!accept(TK.keyword, [';'], true)) {
      node.member = expression_list();

      expect(TK.keyword, [';'], true);
    }

    endNode(AST.NodeType.statement_exit);
  }

  function statement_label(isUnreachable = false) {
    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);

    const label_tok = prev_tok!;
    expect(TK.literal_string, undefined, true);

    if (labels.includes(prev_tok!.val))
      throw Errors.SyntaxError(`Label already in use: "${prev_tok!.val}".`);

    newNode<AST.StatementLabelNode>({
      NT: AST.NodeType.statement_label,
      ctx: curr_ctx,
      member_index: curr_ctx.members.length,
      label: prev_tok!.val,
      loc: label_tok!.loc,
    });

    labels.push(prev_tok!.val);

    expect(TK.keyword, [';'], true);
    endNode(AST.NodeType.statement_label);
  }

  function statement_goto(isUnreachable = false) {
    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);

    const goto_tok = prev_tok!;
    expect(TK.literal_string, undefined, true);

    if (!labels.includes(prev_tok!.val))
      throw Errors.SyntaxError(`Unknown label: "${prev_tok!.val}".`);

    newNode<AST.StatementGotoNode>({
      NT: AST.NodeType.statement_goto,
      label: prev_tok!.val,
      loc: goto_tok!.loc,
      ctx: curr_ctx,
    });

    expect(TK.keyword, [';'], true);
    endNode(AST.NodeType.statement_goto);
  }

  function statement_use(isUnreachable = false) {
    throw Errors.NotImplemented('use');
  }

  function statement(isUnreachable = false) {
    if (accept(TK.keyword, ['debug'], true)) {
      statement_debug(isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['while'], true)) {
      statement_while(isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.identifier)) {
      statement_assignement();
      block(isUnreachable);
    } else if (accept(TK.keyword, ['if'], false)) {
      statement_ifelse(isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['fn'])) {
      function_definition(isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['return'], false)) {
      statement_return(isUnreachable);
      block(true); // should not be necessary
    } else if (accept(TK.keyword, ['exit'], false)) {
      statement_exit(isUnreachable);
      block(true);
    } else if (accept(TK.keyword, ['label'], true)) {
      statement_label(isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['goto'], true)) {
      statement_goto(isUnreachable);
      block(true);
    } else if (accept(TK.keyword, ['use'], true)) {
      statement_use(isUnreachable);
      block(isUnreachable);
    }
  }

  function struct(isUnreachable = false) {
    if (isUnreachable) throw Errors.UnreachableCode(prev_tok!);
    expect(TK.identifier);

    const node = newNode<AST.DefinitionNodeStruct>({
      NT: AST.NodeType.definition,
      DT: AST.DefinitionType.struct,
      definition_id: undefined,
      type_check_id: undefined,
      context: curr_ctx,
      location: curr_tok!.loc,
      name: curr_tok!.val,
      type: undefined,
      fields: [],
    });
    next();

    expect(TK.keyword, ['{'], true);

    while (accept(TK.identifier, undefined, true)) {
      const field: AST.StructFieldDefinitionNode = {
        NT: AST.NodeType.struct_field_definition,
        name: prev_tok!.val,
        type_check_id: undefined,
        location: prev_tok!.loc,
        type: undefined,
        parent: node,
        optional: false,
      };

      if (accept(TK.keyword, [':'], true)) {
        field.optional = false;
      } else if (expect(TK.keyword, ['?:'], true)) {
        field.optional = true;
      }

      const type = type_union();
      if (!type) throw Errors.SyntaxError('A type is required.');

      field.type = type;
      node.fields.push(field);
      expect(TK.keyword, [';'], true);
    }

    expect(TK.keyword, ['}'], true);

    endNode(AST.NodeType.definition);
  }

  function block(isUnreachable = false): void {
    if (!curr_tok) return;
    if (accept(TK.keyword, ['{'], true)) {
      context_block(isUnreachable);
      expect(TK.keyword, ['}'], true);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['const'], true)) {
      definition(AST.DefinitionType.const, isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['let'], true)) {
      definition(AST.DefinitionType.var, isUnreachable);
      block(isUnreachable);
    } else if (accept(TK.keyword, ['struct'], true)) {
      struct(isUnreachable);
      block();
    }
    statement(isUnreachable);
  }

  function program() {
    next();
    if (curr_tok) block();

    if (node_stack.length != 0) {
      console.error(
        inspect(node_stack, { showHidden: false, depth: 1, colors: true })
      );
      throw Errors.ParserError('There are still nodes on the stack');
    }
    if (curr_tok) {
      console.debug(
        inspect(curr_tok, { showHidden: false, depth: 1, colors: true })
      );
      throw Errors.ParserError('There are still tokens to be parsed');
    }
  }

  program();

  return context;
}
