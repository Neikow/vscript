import { writeFileSync } from 'fs';
import { Assembly } from '..';
import { Instructions } from '../instructions';
import { StringManager } from '../objects/string_manager';

interface LanguageError {
  label: string;
  display: string;
  description: string;
  code: number;
}

export class ErrorManager {
  errors: LanguageError[] = [];

  new(error: LanguageError) {
    this.errors.push(error);
  }

  compile(asm: Assembly, i: Instructions, file = 'asm/std/errors.asm') {
    let res = '';
    for (const err of this.errors) {
      asm.rodata += `str_err_${err.label}_name: db '${err.display}'\n`;
      asm.rodata += `str_err_${err.label}_desc: db '${err.description}'\n`;

      res +=
        `err_${err.label}:\n` +
        i.mov('rcx', `str_err_${err.label}_name`) +
        i.mov('rdx', `${err.display.length}`) +
        i.call('sprint') +
        i.call('linefeed') +
        i.mov('rcx', `str_err_${err.label}_desc`) +
        i.mov('rdx', `${err.description.length}`) +
        i.call('sprint') +
        i.call('linefeed') +
        i.mov('rcx', `${err.code}`) +
        i.call('exit') +
        '\n';
    }

    writeFileSync(file, res);
  }
}
