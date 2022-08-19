import { FunctionNode } from '../ast/nodes';

class InstructionCounter {
  local_stack_offset: number;
  global_stack_offset: number = 0;
  functions_base_offset_stack: number[];
  offsets_stack: number[];
  functions_stack: FunctionNode[];
  function_names: string[];
  statements: { [key: string]: number };

  constructor() {
    this.local_stack_offset = 0;
    this.global_stack_offset = 0;
    this.functions_base_offset_stack = [];
    this.offsets_stack = [];
    this.functions_stack = [];
    this.statements = {};
    this.function_names = [];
  }
}

export class Instructions {
  counter: InstructionCounter;

  readonly registers = ['rsi', 'rax', 'rbx', 'rcx', 'rdx'] as const;

  constructor() {
    this.counter = new InstructionCounter();
  }

  private increaseFunctionBaseOffsets = (count: number) => {
    for (let i = 0; i < this.counter.functions_base_offset_stack.length; i++) {
      this.counter.functions_base_offset_stack[i] += count;
    }
  };

  private decreaseFunctionBaseOffsets = (count: number) => {
    for (let i = 0; i < this.counter.functions_base_offset_stack.length; i++) {
      this.counter.functions_base_offset_stack[i] -= count;
    }
  };

  syscall(comment?: string) {
    return `\tsyscall` + (comment ? `\t; ${comment}\n` : '\n');
  }

  ret(comment?: string) {
    this.counter.local_stack_offset--;
    this.counter.global_stack_offset--;
    return `\tret` + (comment ? `\t; ${comment}\n` : '\n');
  }

  jmp(v: string, comment?: string) {
    return `\tjmp\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  call(v: string, comment?: string) {
    // Increment the stack offset only if the function deals with decrementing,
    // Builtin functions are hard coded and do not decrement the counters after execution.
    if (this.counter.function_names.includes(v)) {
      this.counter.local_stack_offset++;
      this.counter.global_stack_offset++;
    }

    return `\tcall\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  pop(v: string, comment?: string) {
    this.counter.local_stack_offset--;
    this.counter.global_stack_offset--;

    this.decreaseFunctionBaseOffsets(1);

    return `\tpop\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  push(v: string, comment?: string) {
    this.counter.local_stack_offset++;
    this.counter.global_stack_offset++;

    this.increaseFunctionBaseOffsets(1);

    return `\tpush\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  mov(v1: string, v2: string, comment?: string) {
    const val = `mov\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
    // if (v1 == v2) return '\t; ' + val;
    if (v1 == v2) return '';
    return '\t' + val;
  }

  lea(v1: string, v2: string, comment?: string) {
    // if (v1 == v2) return '\t; ' + val;
    return `\tlea\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  add(v1: string, v2: string, comment?: string) {
    return `\tadd\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  sub(v1: string, v2: string, comment?: string) {
    return `\tsub\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  mul(v: string, comment?: string) {
    return `\tmul\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  xor(v1: string, v2: string, comment?: string) {
    return `\txor\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  and(v1: string, v2: string, comment?: string) {
    return `\tand\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  or(v1: string, v2: string, comment?: string) {
    return `\tor\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  cmp(v1: string, v2: string, comment?: string) {
    return `\tcmp\t\t${v1}, ${v2}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  dec(v: string, comment?: string) {
    return `\tdec\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  inc(v: string, comment?: string) {
    return `\tinc\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  jge(v: string, comment?: string) {
    return `\tjge\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  jle(v: string, comment?: string) {
    return `\tjle\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  jg(v: string, comment?: string) {
    return `\tjg\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  jl(v: string, comment?: string) {
    return `\tjl\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  je(v: string, comment?: string) {
    return `\tje\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }

  jne(v: string, comment?: string) {
    return `\tjne\t\t${v}` + (comment ? `\t; ${comment}\n` : '\n');
  }
}
