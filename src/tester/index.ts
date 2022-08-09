import chalk from 'chalk';
import { exec } from 'child_process';
import {
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmdirSync,
  rmSync,
} from 'fs';
import path from 'path';
import readline from 'readline-sync';
import { SyntaxTree } from '../ast';
import { Errors } from '../errors';

function normalizeString(str: string): string {
  return str.trim().replaceAll('\r\n', '\n');
}

interface TestResult {
  path: string;
  name: string;
  is_valid: {
    stdout: boolean;
    exit_code: boolean;
    stderr: boolean;
  };
  expected: {
    stdout: string;
    exit_code: string;
    stderr: string;
  };
  result: {
    stdout: string;
    exit_code: string;
    stderr: string;
  };
  index?: number;
  total?: number;
}

export class Tester {
  static getTestNames(source: string = './tests/') {
    return readdirSync(source, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && dirent.name !== '.template')
      .map((dirent) => dirent.name);
  }

  static newTest(main_path = './src/main.vsc') {
    const used_names = this.getTestNames();

    let test_name: string = '';
    let test_name_foramatted: string = '';
    let is_test_name_valid = false;

    while (!is_test_name_valid) {
      test_name = readline
        .question(
          'Convention: "<adjective> <functionality> <action>"\n(Example: nested struct field update)\n\nEnter a name for the new test:\n\n>>> '
        )
        .trim();
      test_name_foramatted = test_name.toLowerCase().replaceAll(' ', '-');

      if (used_names.includes(test_name_foramatted)) {
        console.log(
          `<!> The name "${test_name}" is already used. Delete the directory before creating a new test with the same name.\n`
        );
      } else if (test_name_foramatted.startsWith('.')) {
        console.log('<!> The test name cannot start with a "." (dot).\n');
      } else if (test_name_foramatted === '') {
        console.log(`<!> The test name cannot be empty.\n`);
      } else {
        is_test_name_valid = true;
      }
    }

    const test_description = readline.question(
      'Enter a description: (optional)\n>>> '
    );

    const templateFile = readFileSync(
      './tests/.template/template.test',
      'utf-8'
    );

    const source = readFileSync(main_path, 'utf-8');

    const tree = new SyntaxTree(main_path, source);

    mkdirSync(`./tests/${test_name_foramatted}`);

    tree.compile(`./tests/${test_name_foramatted}/asm.asm`);

    exec(
      `cd ./tests/${test_name_foramatted} && arch runp nasm -i \"${path.resolve(
        './asm'
      )}\" -felf \"./asm.asm\" && arch runp ld -m elf_i386 \"./asm.o\" -o \"./asm\" && arch runp rm \"./asm.o\" && arch runp ./asm`,
      (error, stdout, stderr) => {
        console.log(
          `\nExit Code: ${error?.code ?? 0}\n- - -\nOutput:\n` +
            normalizeString(stdout) +
            '\n- - -\n'
        );

        const prompt = readline.question(
          '\nDo you want to save the test ? [y/n]\n>>> '
        );
        const should_save = ['y', 'ye', 'yes'].includes(
          prompt.trim().toLowerCase()
        );

        if (!should_save) {
          rmSync(`./tests/${test_name_foramatted}`, { recursive: true });
          return;
        }

        writeFileSync(
          `./tests/${test_name_foramatted}/description.test`,
          templateFile
            .replaceAll('{{test:name}}', test_name)
            .replaceAll('{{test:description}}', test_description.trim())
            .replaceAll('{{test:code}}', source.trim())
            .replaceAll('{{test:exit-code}}', `${error?.code ?? 0}`)
            .replaceAll('{{test:stdout}}', stdout.trim())
            .replaceAll('{{test:stderr}}', stderr.trim())
        );

        console.log(
          `\nWritten result to './tests/${test_name_foramatted}/description.test'\n`
        );
      }
    );
  }

  static runAllTests() {
    const used_names = this.getTestNames();
    for (let i = 0; i < used_names.length; i++) {
      this.runTest(used_names[i], i + 1, used_names.length);
    }
  }

  static runTest(test: string, index?: number, total?: number) {
    const used_names = this.getTestNames();
    if (!used_names.includes(test))
      throw Errors.TestError('Test does not exist');

    const test_file = readFileSync(`./tests/${test}/description.test`, 'utf-8');

    const test_fields = test_file.split('```');

    const source = normalizeString(test_fields[1]);
    const ref_exit_code = normalizeString(test_fields[3]);
    const ref_stdout = normalizeString(test_fields[5]);
    const ref_stderr = normalizeString(test_fields[7]);

    const tree = new SyntaxTree(path.normalize('./std/main.vsc'), source);

    tree.compile(`./tests/${test}/asm.asm`);

    exec(
      `cd ./tests/${test} && arch runp nasm -i \"${path.resolve(
        './asm'
      )}\" -felf \"./asm.asm\" && arch runp ld -m elf_i386 \"./asm.o\" -o \"./asm\" && arch runp rm \"./asm.o\" && arch runp ./asm`,
      (error, stdout, stderr) => {
        const _exit_code = normalizeString(`${error?.code ?? 0}`);
        const _stdout = normalizeString(stdout);
        const _stderr = normalizeString(stderr);
        console.log(
          this.formatResult({
            name: test,
            path: `./tests/${test}/description.test`,
            is_valid: {
              stdout: _stdout === ref_stdout,
              exit_code: _exit_code === ref_exit_code,
              stderr: _stderr === ref_stderr,
            },
            expected: {
              stderr: ref_stderr,
              stdout: ref_stdout,
              exit_code: ref_exit_code,
            },
            result: {
              stderr: _stderr,
              stdout: _stdout,
              exit_code: _exit_code,
            },
            index: index,
            total: total,
          })
        );
      }
    );
  }

  static formatResult(result: TestResult) {
    const is_success =
      result.is_valid.exit_code &&
      result.is_valid.stdout &&
      result.is_valid.stderr;

    let res =
      '\n🧪 ' +
      (result.index !== undefined && result.total !== undefined
        ? `[${result.index
            .toString()
            .padStart(result.total.toString().length, '0')}/${result.total}]`
        : '') +
      chalk.blue(`${result.name}\n`) +
      '- - -' +
      (is_success ? chalk.green('\n✅ PASS\n') : chalk.red('\n❌ FAIL\n'));

    if (!result.is_valid.exit_code) {
      res +=
        '- - -\n' +
        "> ❌ Exit codes don't match.\nGot " +
        chalk.red(result.result.exit_code) +
        '\n\nExpected ' +
        chalk.blue(result.expected.exit_code) +
        '\n';
    } else {
      res += '- - -\n' + '> ✅ Exit codes match.\n';
    }

    if (!result.is_valid.stdout) {
      res +=
        '- - -\n' +
        "> ❌ Outputs don't match.\nGot " +
        chalk.red(result.result.stdout) +
        '\n\nExpected ' +
        chalk.blue(result.expected.stdout) +
        '\n';
    } else {
      res += '- - -\n' + '> ✅ Outputs match.\n';
    }

    if (!result.is_valid.stderr) {
      res +=
        '- - -\n' +
        "> ❌ Errors don't match.\nGot " +
        chalk.red(result.result.stderr) +
        '\n\nExpected ' +
        chalk.blue(result.expected.stderr) +
        '\n';
    } else {
      res += '- - -\n' + '> ✅ Errors match.\n';
    }

    return res;
  }
}
