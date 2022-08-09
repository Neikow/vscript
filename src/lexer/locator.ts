import { Location } from '../types/types';

export class Locator {
  col: number;
  row: number;
  file: string;

  constructor(file: string) {
    this.col = 1;
    this.row = 1;
    this.file = file;
  }

  advance(str: string) {
    for (let x of str) {
      if (x == '\n') {
        this.col = 1;
        this.row += 1;
      } else {
        this.col += 1;
      }
    }
  }

  get(str: string) {
    const loc = new Location({
      col: this.col,
      row: this.row,
      file: this.file,
      length: str.length,
    });
    this.advance(str);
    return loc;
  }
}
