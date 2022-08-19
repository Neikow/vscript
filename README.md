V-Script
======

An [object-oriented](https://en.wikipedia.org/wiki/Object-based_language) programing language that compiles to machine code through Linux NASM x86.
> Currently, the compilation only targets x64 Linux.
> Support for other OS is scheduled sometimes.

The format is similar to TypeScript in many aspects.

## Roadmap
- [ ] [Turing Complete](https://en.wikipedia.org/wiki/Turing_completeness)
- [ ] Memory Management
- [ ] Self-Hosting

## Syntax
Here a brief list of the language current or planned capabilities.
As the project is a work in progress, this section and the different syntaxes are subject to change.

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

#####  [WIP] `goto`
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



## ⏩ Running
I am using [Arch WSL](https://github.com/yuk7/ArchWSL) for the developement, you may need to change the way Linux ASM compiler is ran on your side.

### 💻 Interpreter
- `npm start`: Interprets the code using the TypeScript implementation.

### 👩‍💻 Assembly
- `npm run exec [args]`: Runs the executable without recompiling.

- `npm run compile`: Compiles the assembly file `asm/asm.asm` to an executable.

- `npm run compile:exec [args]`: Compiles and runs the executable.

- `npm run assemble`: Builds `src/main.vsc` to an executable without running.

- `npm run assemble:exec [args]`: Builds `src/main.vsc` and runs it.

### 🧪 Testing
- `npm run test:new`: Creates a new test from the current `src/main.vsc` recompilation.

- `npm run test <test_name>`: Run a unit test.

- `npm run test:all`: Runs all the unit tests inside `tests`.


## 🧩 VSCode Extension
The VSCode extension inside the `extension` directory provides syntax hilighting for `.vsc` and `.test` files.