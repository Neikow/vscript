import { readFileSync } from 'fs';
import path from 'path';
import { SyntaxTree } from './ast';
import { Tester } from './tester';

if (process.argv.includes('--test')) {
  Tester.runTest(process.argv.at(-1)!);
} else if (process.argv.includes('--test-all')) {
  // Runs all tests inside the "tests" folder.
  Tester.runAllTests();
} else if (process.argv.includes('--test-new')) {
  // Uses the current output of "main.vsc" to create a new test.
  Tester.newTest();
} else if (process.argv.includes('--build')) {
  const source_path = path.normalize(process.argv.at(-1)!);
  const source = readFileSync(source_path, 'utf-8');

  const Tree = new SyntaxTree(source_path, source);

  Tree.compile('./asm/asm.asm');
} else {
  if (process.argv.length < 2) throw 'Not enough arguments provided.';
  const source_path = path.normalize(process.argv.at(-1)!);
  const source = readFileSync(source_path, 'utf-8');

  const Tree = new SyntaxTree(source_path, source);

  Tree.execute();
}
