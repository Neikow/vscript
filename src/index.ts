import { readFileSync } from 'fs';
import path from 'path';
import { SyntaxTree } from './ast';

if (process.argv.includes('--test')) {
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
