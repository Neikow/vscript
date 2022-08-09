import chalk from 'chalk';
import { TypeNode } from './syntax_tree_nodes';
import { Location, Token } from './types';
import TypeHelper from './type_helper';

const error = chalk.redBright;

export class Errors {
  private static whitespace() {
    return '\n\n';
  }

  private static trace() {
    const err = new Error();
    err.name = 'Parser Error';
    return err.stack;
  }

  static ParserError(msg?: string) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`Parser Error\n`);
    if (msg) err.name += msg + '.\n';
    else err.name += '.';
    err.name += this.whitespace();
    return err;
  }

  static UnknownLiteral(literal: string, loc: Location) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`UnknownLiteral\n`);
    err.name +=
      'Unknown literal ' +
      chalk.blueBright(literal) +
      ' at ' +
      chalk.green("'" + loc.format() + "'") +
      '.';
    err.name += this.whitespace();
    return err;
  }

  static NotImplemented(msg?: string) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`NotImplemented\n`);
    if (msg) {
      err.name += 'Not implemented: ' + chalk.blueBright(msg) + '.';
    }
    err.name += this.whitespace();
    return err;
  }

  static UnexpectedToken(tok?: Token, prev_tok?: Token, expected?: string[]) {
    let err = '';
    if (tok) {
      err += `Unexpected token: ${chalk.blueBright(
        tok.val
      )} at ${chalk.greenBright("'" + tok.loc.format() + "'")}.`;
    } else {
      err += `Expected a token, got nothing...`;

      if (prev_tok) {
        err += `\nPrevious token: ${chalk.blueBright(
          prev_tok.val
        )} at ${chalk.greenBright("'" + prev_tok.loc.format() + "'")}.`;
      }
    }

    if (expected) {
      err += `\nExpected: ${chalk.blueBright(expected.join(' | '))}.`;
    }

    return this.SyntaxError(err);
  }

  static SyntaxError(str?: string) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`SyntaxError\n`);

    if (str) err.name += str;

    err.name += this.whitespace();
    return err;
  }

  static MemoryError() {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`MemoryError\n`);
    err.name += this.whitespace();
    return err;
  }

  static TypeError(
    loc: Location,
    target_type_node: TypeNode,
    expr_type_node: TypeNode
  ) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`TypeError\n`);

    const target_type_string: string = TypeHelper.formatType(target_type_node);
    const expr_type_string = TypeHelper.formatType(expr_type_node);

    err.name += `Types ${expr_type_string} and ${chalk.magentaBright(
      target_type_string
    )} have no overlap at ${chalk.greenBright("'" + loc.format() + "'")}.`;

    err.name += this.whitespace();
    return err;
  }

  static UnreachableCode(tok: Token) {
    return this.SyntaxError(
      `Unreachable code: ${chalk.blueBright(tok.val)} at ${chalk.greenBright(
        "'" + tok.loc.format() + "'"
      )}.`
    );
  }

  static MissingProperty(type: TypeNode, property: string) {
    return this.SyntaxError(
      `Property ${chalk.blueBright(
        property
      )} does not exist on type ${TypeHelper.formatType(type)}.`
    );
  }

  static TypeCheckError(msg: string) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`TypeCheck Error\n`);
    if (msg) err.name += msg + '.\n';
    else err.name += '.';
    err.name += this.whitespace();
    return err;
  }

  static CompilerError(msg?: string) {
    const err = new Error();
    err.name = this.whitespace();
    err.name += error(`Compiler Error\n`);
    if (msg) err.name += msg + '.\n';
    else err.name += '.';
    err.name += this.whitespace();
    return err;
  }
}
