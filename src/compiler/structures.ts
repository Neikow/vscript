interface VSCPointer {
  this: VSCPointer;
  value: number;
}

interface VSCNumber {
  this: VSCPointer
  value: number;
}

interface VSCBool {
  this: VSCPointer;
  value: 0 | 1;
}

interface VSCString {
  this: VSCPointer
  length: VSCNumber;
  pointer: VSCPointer;
}

interface VSCStructure {
  this: VSCPointer
  base: VSCPointer;
}

interface VSCArray {
  this: VSCPointer
  length: number;
  base: VSCPointer;
}
