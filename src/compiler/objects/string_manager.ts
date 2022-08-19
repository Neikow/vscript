import { ParseResult } from '..';
import { Instructions } from '../instructions';

export class StringManager {
  private string_count: number;
  private strings: { [key: string]: string };
  private I: Instructions;
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
    instructions: Instructions
  ) {
    this.assembly = assembly;
    this.string_count = 0;
    this.strings = {};
    this.I = instructions;
  }

  add(str: string): ParseResult {
    let id: string;
    if (Object.keys(this.strings).includes(str)) {
      id = this.strings[str];
    } else {
      id = `_s${this.string_count++}`;
      this.assembly.data +=
        `${id}: db ${str
          .split('\\n')
          .map((s) => `'${s}'`)
          .join(', 0xA, ')}`.replaceAll("'', ", '') +
        ', 0h'.repeat(8 - (str.length % 8)) +
        '\n';
      this.strings[str] = id;
    }

    const before =
      this.I.mov('rdx', `${id}`) +
      this.I.mov('rcx', `${str.length}`) +
      this.I.call('string_make') +
      this.I.push('rax');

    return {
      before: before,
      on_update: '',
    };
  }
}
