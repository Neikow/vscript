import {
  ContextNode,
  DefinitionNodeFunction,
  Node,
  NodeType,
  TypeNode,
} from '../../ast/nodes';
import { Errors } from '../../errors';
import TypeHelper from '../../types/helper';
import { Location } from '../../types/types';
import { Instructions } from '../instructions';

export class FunctionManger {
  private I: Instructions;
  private traveller: (node: Node, parent_context: ContextNode) => string;
  private assembly: {
    header: string;
    text: string;
    functions: string;
    data: string;
    bss: string;
  };
  constructor(
    assembly: {
      header: string;
      text: string;
      functions: string;
      data: string;
      bss: string;
    },
    instructions: Instructions,
    traveller: (node: Node, parent_context: ContextNode) => string
  ) {
    this.I = instructions;
    this.traveller = traveller;
    this.assembly = assembly;
  }

  add(node: DefinitionNodeFunction) {
    this.I.counter.offsets_stack.push(this.I.counter.local_stack_offset);
    this.I.counter.functions_stack.push(node.value);
    this.I.counter.functions_base_offset_stack.push(0);

    this.I.counter.local_stack_offset = 0 - node.value.arguments.length;

    const id = `fn_${node.name}${node.value.context!.id}`;

    this.I.counter.function_names.push(id);

    const format_args = node.value.arguments
      .map(
        (arg) =>
          `${arg.name}: ${TypeHelper.formatType(arg.type as TypeNode, false)}`
      )
      .join(', ');
    const format_return = TypeHelper.formatType(
      node.value.return_type as TypeNode,
      false
    );

    let function_assembly =
      `\n; ${node.name}(${format_args}): ${format_return}\n` +
      `${id}:\n` +
      this.I.push('ebp') +
      this.I.mov('ebp', 'esp', 'saves the function base pointer') +
      '\n' +
      this.traveller(node.value.context!, node.value.context!) +
      (!node.value.has_return
        ? this.traveller(
            {
              NT: NodeType.statement_return,
              location: Location.computed,
              member: undefined,
              parent: node.value,
            },
            node.value.context!
          )
        : '');

    this.I.counter.global_stack_offset -= this.I.counter.local_stack_offset;
    if (this.I.counter.offsets_stack.length < 1) throw Errors.CompilerError();
    this.I.counter.local_stack_offset = this.I.counter.offsets_stack.pop()!;

    this.I.counter.functions_stack.pop();
    this.I.counter.functions_base_offset_stack.pop();

    return function_assembly;
  }
}
