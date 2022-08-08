V-Script
======

An [object-oriented](https://en.wikipedia.org/wiki/Object-based_language) programing language that compiles to machine code through Linux NASM x86.
> Currently, the compilation only targets Linux and x86.
> Support for x64 and other OS is scheduled sometimes.

The format is similar to TypeScript in many aspects.

## Syntax
Here a brief list of the language capabilities.
#### Variables and constants
Like any modern programing language, V-Script supports declaring scoped variables. 
```ts
let   x = 8;                // x is now of type [int];
const y = 'Hello World!';   // y is now of type [str];
```
The language supports typing.
```ts
let my_string: str;         // my_string is a [str] (undefined);
const my_bool: bool;        // will throw an error;
```

#### Structures
The main complex data structure is the `struct`, it can hold data of different types, and even other struct instances.
```ts
struct MyStruct {
  field1: str,           
  field2: int,
  field3?: MyStruct         // the last field is optional
}
```

#### Functions
The language also supports functions.
```ts
fn my_function(arg1: str, arg2?: bool): int {
  // ...
  return arg1.length;
}
```

#### Loops
##### `while`
The default loop in every language.
```ts
while condition do {
  // ...
}
```

#### Control Flow
##### `if ... else if ... else`
You already know how it works.
```ts
if condition1 do {
  // ...
} else if condition2 do {
  // ...
} else {
  // ...
}

```

##### [WIP] `switch`
Not yet implemented.
```ts
switch val {
  1: { /** */ }
  2 | 3: { /** */ }
  default: { /** */ }
}
```

##### [WIP] `goto`
Not yet implemented.
```ts
label my_label;
//...
goto my_label;
```

##### [WIP] `for`
Not yet implemented.

##### [WIP] `for ... in`
Not yet implemented.

#### [WIP] Objects
Not yet implemented.
```
obj Object [ param1: type, param2: type ] <T, Y> ( parent1, parent2, ... ) : {
  @properties {
      // ...with default values
      private name : [type] = value ;
      public  name : [type] = value ; 
      static  name : [type] = value ;

      // ...without default values
      private name : [type] ;
      public  name : [type] ;
  }
  
  // default constructor
  @constructor default : ( args ) { ... }
  // named constructor
  @constructor name    : ( args ) { ... }

  // remark: methods are public by default
  @method          name ( args ) : [return_type] { ... }
  // private method
  @method private  name ( args ) : [return_type] { ... }
  // public method
  @method [public] name ( args ) : [return_type] { ... }
  // static method
  @method static   name ( args ) : [return_type] { ... }

  // operator overloading
  // strict operator overloading
  @operator [op, strict] : ( this, other: Object ) { ... }
  // loose operator overloading
  @operator [op]         : ( this, other: any ) { ... }
  // loose unary operator overloading (strict means nothing in this context)
  @operator [op, unary]  : ( this ) { }
}
```



## Running my code
I am using [Arch WSL](https://github.com/yuk7/ArchWSL) for the developement, you may need to change the way Linux ASM compiler is ran on your side.

- `npm start`: Executes the code with the TypeScript interpreter.

- `npm run compile`: Compiles `asm.asm` to machine code.

- `npm run run`: Runs the machine code without recompiling (arguments may be passed to the program).

- `npm run build`: Builds `src/main.vsc` to machine code without running.

- `npm run build:run`: Builds `src/main.vsc` and runs it.



## VSCode Extension
