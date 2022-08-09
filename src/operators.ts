import { Memory } from './memory';
import {
  FalseNode,
  FunctionNode,
  NodeType as NT,
  TrueNode,
  ValueNode,
} from './syntax_tree_nodes';
import {
  INFINITY,
  Location,
  NAN,
  OPERATOR,
  NULL,
  TYPE_ANY,
  TYPE_UNKNOWN,
  TYPE_INTEGER,
  UNDEFINED,
  TYPE_UNDEFINED,
} from './types';
import { Errors } from './errors';

import VSCTypeBool from './std/types/bool';
import VSCTypeFun from './std/types/fun';
import VSCTypeInt from './std/types/int';
import VSCTypeFlt from './std/types/flt';
import VSCTypeStr from './std/types/str';
import VSCTypePtr from './std/types/ptr';
import VSCTypeArr from './std/types/arr';
import readline from 'readline-sync';
import { LanguageObjectKind, PropertyKind } from './objects';
import TypeHelper from './type_helper';

type OPERANDS = [ValueNode[] | undefined, ValueNode[] | undefined];

type OPERATOR_FUNC = (operands: OPERANDS, mem: Memory) => ValueNode[];

function requireTwoSingleOperands(fun: OPERATOR_FUNC, ops: OPERANDS) {
  if (!ops[0] || !ops[1]) throw Errors.ParserError('Missing operand.');
  if (ops[0].length > 1 || ops[1].length > 1)
    throw Errors.ParserError('Too many arguments.');
  return fun;
}

function requireLeftOperand(fun: OPERATOR_FUNC, ops: OPERANDS) {
  if (!ops[0] && !ops[1]) throw Errors.ParserError('Missing operands.');
  if (ops[0] && ops[1]) throw Errors.ParserError('Too many operands.');
  if (!ops[0] && ops[1]) throw Errors.ParserError('Wrong operand.');
  return fun;
}

function requireSingleRightOperand(fun: OPERATOR_FUNC, ops: OPERANDS) {
  if (!ops[0] && !ops[1]) throw Errors.ParserError('Missing operand.');
  if (ops[0] && ops[1]) throw Errors.ParserError('Too many operands.');
  if (ops[0] && !ops[1]) throw Errors.ParserError('Wrong operand.');
  if (!ops[1]) throw Errors.ParserError('Missing operand.');
  if (ops[1].length > 1) throw Errors.ParserError('Too many arguments.');
  return fun;
}

function requiredLeftSingleRightAny(fun: OPERATOR_FUNC, ops: OPERANDS) {
  if (!ops[0] || !ops[1]) throw Errors.ParserError('Missing operand.');
  if (ops[0].length > 1) throw 'Too many arguments.';

  return fun;
}

function requireRightOperand(fun: OPERATOR_FUNC, ops: OPERANDS) {
  if (!ops[0] && !ops[1]) throw Errors.ParserError('Missing operands.');
  if (ops[0] && ops[1]) throw Errors.ParserError('Too many operands.');
  if (ops[0] && !ops[1]) throw Errors.ParserError('Wrong operand.');
  return fun;
}

function requireTwoOperands(fun: OPERATOR_FUNC, ops: OPERANDS) {
  if (!ops || !ops[1]) throw Errors.ParserError('Missing operands.');
  return fun;
}

export function mapOperator(
  op: OPERATOR,
  ops: OPERANDS,
  mem: Memory
): ValueNode[] {
  const map: { [key in OPERATOR]?: () => OPERATOR_FUNC } = {
    add: () => requireTwoSingleOperands(add, ops),
    sub: () => requireTwoSingleOperands(sub, ops),
    usub: () => requireSingleRightOperand(usub, ops),
    mul: () => requireTwoSingleOperands(mul, ops),
    div: () => requireTwoSingleOperands(div, ops),
    wdiv: () => requireTwoSingleOperands(wdiv, ops),
    mod: () => requireTwoSingleOperands(mod, ops),
    pow: () => requireTwoSingleOperands(pow, ops),
    eq: () => requireTwoSingleOperands(eq, ops),
    neq: () => requireTwoSingleOperands(neq, ops),
    leq: () => requireTwoSingleOperands(leq, ops),
    lt: () => requireTwoSingleOperands(lt, ops),
    gt: () => requireTwoSingleOperands(gt, ops),
    and: () => requireTwoOperands(and, ops),
    assign: () => requireTwoSingleOperands(assign, ops),
    access_call: () => requiredLeftSingleRightAny(access_call, ops),
    access_property: () => requireTwoSingleOperands(access_property, ops),
    access_computed: () => requiredLeftSingleRightAny(access_computed, ops),
    typeof: () => requireRightOperand(_typeof, ops),
    cast: () => requireTwoSingleOperands(cast, ops),
    not: () => requireSingleRightOperand(not, ops),
  };

  const fun = map[op];
  if (!fun) throw Errors.NotImplemented(op);

  return fun()(ops, mem);
}

function access_computed(operands: OPERANDS, mem: Memory): ValueNode[] {
  const target = (operands[0] as ValueNode[])[0];
  const args = operands[1] as ValueNode[];

  if (args.length > 1)
    throw Errors.NotImplemented('more than one arg in brackets');

  if (target.NT === NT.value_array) {
    if (args[0].NT !== NT.value_num)
      throw Errors.NotImplemented('non number access');

    if (args[0].value_type !== VSCTypeInt.object)
      throw Errors.TypeError(
        args[0].location,
        { NT: NT.type_single, type: VSCTypeInt.object,  },
        { NT: NT.type_single, type: args[0].value_type,  }
      );

    if (args[0].value === INFINITY || args[0].value === NAN) {
      throw Errors.ParserError();
    }

    if (args[0].value >= target.value.length) {
      throw Errors.NotImplemented('Index out of bounds');
    }

    if (args[0].value < 0 && -args[0].value > target.value.length) {
      throw Errors.NotImplemented('negative out of bounds');
    }

    if (args[0].value >= 0) return [target.value[args[0].value]];
    if (args[0].value < 0)
      return [target.value[target.value.length + args[0].value]];

    console.log(args[10].value);
  }
  throw Errors.NotImplemented('computed access on non-array object');
}

function access_property(operands: OPERANDS, mem: Memory): ValueNode[] {
  const target = (operands[0] as ValueNode[])[0];
  const property = (operands[1] as ValueNode[])[0];

  if (property.NT !== NT.property_node) throw Errors.ParserError();

  if (target.NT == NT.value_struct) {
    const val = target.value.get(property.value);

    if (!val) {
      const struct_property = target.value_type.properties!.get(property.value);
      if (!struct_property)
        throw Errors.SyntaxError(
          `Unknown property ${property.value} on ${target.value_type.display_name}`
        );

      if (struct_property.kind === PropertyKind.type)
        throw Errors.ParserError(PropertyKind.type);

      if (struct_property.type.NT === NT.type_union) {
        throw Errors.NotImplemented(NT.type_union);
      }

      if (struct_property.type.NT === NT.type_tuple) {
        throw Errors.NotImplemented(NT.type_tuple);
      }

      if (struct_property.type.NT === NT.type_raw) {
        throw Errors.NotImplemented(NT.type_raw);
      }

      if (
        typeof struct_property.type.type == 'string' &&
        struct_property.type.type !== TYPE_ANY
      ) {
        throw Errors.NotImplemented(struct_property.type.type);
      }

      return [
        {
          NT: NT.value_undefined,
          value_type:
            struct_property.type.type == TYPE_ANY
              ? TYPE_UNDEFINED
              : struct_property.type.type,
          is_builtin: true,
          location: Location.computed,
          value: UNDEFINED,
          
        },
      ];
    }

    return val;
  } else if (target.NT == NT.value_type) {
    throw Errors.NotImplemented(target.NT);
  } else if (target.NT == NT.special) {
    throw Errors.NotImplemented(target.NT);
  } else if (target.NT == NT.property_node) {
    throw Errors.NotImplemented(target.NT);
  } else if (target.value_type == TYPE_UNDEFINED)
    throw Errors.SyntaxError('Trying to access property of `undefined`');
  else {
    if (target.value_type == VSCTypeStr.object) {
      if (property.value === 'length') {
        return [
          {
            NT: NT.value_num,
            value_type: VSCTypeInt.object,
            is_builtin: false,
            location: Location.computed,
            value: (target.value as string).length,
            
          },
        ];
      } else throw Errors.NotImplemented(property.value);
    } else if (
      target.value_type.kind === LanguageObjectKind.instance &&
      target.value_type.object === VSCTypeArr.object
    ) {
      if (property.value === 'length') {
        return [
          {
            NT: NT.value_num,
            value_type: VSCTypeInt.object,
            is_builtin: false,
            location: Location.computed,
            value: (target.value as Array<ValueNode>).length,
            
          },
        ];
      } else throw Errors.NotImplemented(property.value);
    } else throw Errors.NotImplemented(property.value);
  }
}

function not(operands: OPERANDS): ValueNode[] {
  const val = (operands[1] as ValueNode[])[0];

  const to_bool = cast([
    [val],
    [
      {
        NT: NT.value_type,
        value: VSCTypeBool.object,
        location: Location.std,
        
      },
    ],
  ]);

  if (to_bool[0].value == 0) return [{ ...to_bool[0], value: 1 }];
  if (to_bool[0].value == 1) return [{ ...to_bool[0], value: 0 }];
  throw Errors.ParserError('wrong boolean value format');
}

function _typeof(operands: OPERANDS, mem: Memory): ValueNode[] {
  const object = operands[1] as ValueNode[];

  if (object.length > 1) throw Errors.NotImplemented('typeof tuple');

  if (object[0].NT === NT.value_type)
    throw Errors.SyntaxError('Operation on types are forbidden.');

  if (object[0].NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (object[0].NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (object[0].value_type === UNDEFINED) {
    return [
      {
        NT: NT.value_type,
        value: TYPE_UNDEFINED,
        location: Location.computed,
        
      },
    ];
  }

  if (typeof object[0].value_type === 'string') {
    return [
      {
        NT: NT.value_type,
        value: 'unknown',
        location: Location.std,
        
      },
    ];
  }

  if (object[0].value_type.kind === LanguageObjectKind.instance)
    return [
      {
        NT: NT.value_type,
        value: object[0].value_type,
        location: object[0].location,
        
      },
    ];

  return [
    {
      NT: NT.value_type,
      value: object[0].value_type,
      location: object[0].location,
      
    },
  ];
}

function access_call(operands: OPERANDS, mem: Memory): ValueNode[] {
  const callable = (operands[0] as ValueNode[])[0];
  const args = operands[1] as ValueNode[];

  if (callable.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (callable.NT === NT.value_type) {
    if (callable.value === TYPE_ANY || callable.value === TYPE_UNKNOWN)
      throw Errors.NotImplemented('any and unknown');

    if (callable.value === VSCTypeInt.object) {
      if (args[0].NT === NT.value_str) {
        const val = parseInt(args[0].value);
        if (isNaN(val)) {
          return [
            {
              NT: NT.value_num,
              is_builtin: true,
              location: Location.computed,
              value_type: VSCTypeInt.object,
              value: NAN,
              
            },
          ];
        } else {
          return [
            {
              NT: NT.value_num,
              is_builtin: false,
              location: Location.computed,
              value_type: VSCTypeInt.object,
              value: val,
              
            },
          ];
        }
      } else if (args[0].NT === NT.value_bool) {
        return [
          {
            NT: NT.value_num,
            is_builtin: false,
            location: Location.computed,
            value_type: VSCTypeInt.object,
            value: args[0].value,
            
          },
        ];
      } else {
        throw Errors.NotImplemented(
          `number conversion from type : ${args[0].NT}`
        );
      }
    }

    if (callable.value === VSCTypeStr.object) {
      if (args[0].NT === NT.value_num) {
        return [
          {
            NT: NT.value_str,
            location: Location.computed,
            value_type: VSCTypeStr.object,
            is_builtin: false,
            value: args[0].value!.toString(),
            
          },
        ];
      } else if (args[0].NT === NT.value_bool) {
        return [
          {
            NT: NT.value_str,
            location: Location.computed,
            value_type: VSCTypeStr.object,
            is_builtin: false,
            value: args[0].value == 0 ? 'false' : 'true',
            
          },
        ];
      } else if (args[0].NT === NT.value_str) {
        return [args[0]];
      } else {
        throw Errors.NotImplemented(
          `string conversion from type : ${args[0].NT}`
        );
      }
    }

    throw Errors.NotImplemented('constructor');
  }

  if (callable.NT === NT.special) {
    if (callable.value === 'console_input') {
      const prompt = args[0];
      if (prompt.NT !== NT.value_str)
        throw Errors.SyntaxError('Wrong argument type.');
      const val = readline.question(prompt.value);
      return [
        {
          NT: NT.value_str,
          value: val,
          location: callable.location,
          is_builtin: false,
          value_type: VSCTypeStr.object,
          
        },
      ];
    } else throw Errors.NotImplemented('special');
  }

  if (callable.value_type === VSCTypeFun.object) {
    const fun: FunctionNode = callable.value as FunctionNode;
    if (!fun.context) throw Errors.ParserError();
    // TODO: implement optional arguments
    if (args.length !== fun.arguments.length)
      throw Errors.ParserError('Not implemented.');

    for (let i = 0; i < fun.arguments.length; i++) {
      const arg_name = fun.arguments[i].name;
      if (!arg_name) throw Errors.ParserError();
      if (!fun.context.definitions.has(arg_name)) throw Errors.ParserError();
      mem.set(fun.context.definitions.get(arg_name)!.node, args[i]);
    }

    if (!mem.traveler) throw Errors.ParserError('Missing traveler');
    return mem.traveler(fun.context, 0, true)[1];
  }

  throw Errors.ParserError('Not implemented.');
}

function assign(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  console.log(left, right);

  return [];
}

function and(operands: OPERANDS): ValueNode[] {
  if (operands[0]!.length !== 1 || operands[1]!.length !== 1)
    throw Errors.NotImplemented('Operator and on tuples.');

  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  const value = cast([
    [left],
    [
      {
        NT: NT.value_type,
        value: VSCTypeBool.object,
        location: Location.std,
        
      },
    ],
  ]);
  return [value ? TrueNode : FalseNode];
}

function cast(operands: OPERANDS): ValueNode[] {
  if (operands[0]!.length !== 1 || operands[1]!.length !== 1)
    throw Errors.NotImplemented('Operator and on tuples.');

  const object = (operands[0] as ValueNode[])[0];
  const type = (operands[1] as ValueNode[])[0];

  if (
    object.NT !== NT.value_str &&
    object.NT !== NT.value_bool &&
    object.NT !== NT.value_num &&
    object.NT !== NT.value_ptr &&
    object.NT !== NT.value_undefined
  )
    throw Errors.NotImplemented('Not implemented');

  if (type.value === VSCTypeBool.object) {
    if (object.value_type === VSCTypeBool.object) {
      return [object];
    } else if (
      object.value_type === VSCTypeFlt.object ||
      object.value_type === VSCTypeInt.object
    ) {
      return [object.value == 0 ? FalseNode : TrueNode];
    } else if (object.value_type === VSCTypeStr.object) {
      return [object.value == '' ? FalseNode : TrueNode];
    } else if (object.value_type === VSCTypePtr.object) {
      return [object.value == NULL ? FalseNode : TrueNode];
    } else if (object.value == undefined) {
      return [FalseNode];
    }
  }
  return [
    {
      NT: NT.value_str,
      value: 'not implemented',
      value_type: VSCTypeStr.object,
      is_builtin: true,
      location: Location.std,
      
    },
  ];
}

function leq(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Less than operation between diffrent types: Not implemented.'
    );

  if (left.NT === NT.value_undefined || right.NT === NT.value_undefined)
    throw Errors.NotImplemented('Operation between undefined.');

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = left.value <= right.value;

    return [value ? TrueNode : FalseNode];
  }

  throw Errors.ParserError('Not implemented.');
}

function lt(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Less than operation between diffrent types: Not implemented.'
    );

  if (left.NT === NT.value_undefined || right.NT === NT.value_undefined)
    throw Errors.NotImplemented('Operation between undefined.');

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = left.value < right.value;

    return [value ? TrueNode : FalseNode];
  }

  throw Errors.ParserError('Not implemented.');
}

function gt(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Less than operation between diffrent types: Not implemented.'
    );

  if (left.NT === NT.value_undefined || right.NT === NT.value_undefined)
    throw Errors.NotImplemented('Operation between undefined.');

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = left.value > right.value;

    return [value ? TrueNode : FalseNode];
  }

  throw Errors.ParserError('Not implemented.');
}

function eq(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (
    left.NT === NT.value_num &&
    right.NT === NT.value_num &&
    left.value == NAN &&
    right.value == NAN
  ) {
    return [TrueNode];
  }

  if (left.NT === NT.value_type && right.NT === NT.value_type) {
    return [left.value == right.value ? TrueNode : FalseNode];
  }

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.NT === NT.value_type && right.NT === NT.value_undefined) {
    return [TrueNode];
  }

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError(
      'Operations between types and variables are forbidden.'
    );

  if (left.value_type !== right.value_type) return [FalseNode];
  if (left.value !== right.value) return [FalseNode];

  return [TrueNode];
}

function neq(operands: OPERANDS): ValueNode[] {
  const equality = eq(operands);
  const negate = not([undefined, equality]);
  return negate;
}

function mod(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Modulo operation between diffrent types: Not implemented.'
    );

  if (left.NT === NT.value_num && right.NT === NT.value_num) {
    if (right.value == 0) throw Errors.ParserError('Division by 0.');

    if (left.value === NAN || right.value === NAN)
      return [
        {
          NT: NT.value_num,
          is_builtin: true,
          location: Location.std,
          value: NAN,
          value_type: VSCTypeFlt.object,
          
        },
      ];

    if (left.value === INFINITY)
      return [
        {
          NT: NT.value_num,
          is_builtin: false,
          location: Location.std,
          value: INFINITY,
          value_type: VSCTypeFlt.object,
          
        },
      ];

    if (right.value === INFINITY)
      return [
        {
          NT: NT.value_num,
          is_builtin: true,
          location: Location.computed,
          value: 0,
          value_type: VSCTypeInt.object,
          
        },
      ];

    const value = ((left.value % right.value) + right.value) % right.value;

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: VSCTypeInt.object,
        
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}

function wdiv(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Whole division between diffrent types: Not implemented.'
    );

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (right.value_type == VSCTypeFun.object)
      throw Errors.ParserError('Not implemented.');

    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    if (right.value == 0) throw Errors.ParserError('Division by 0.');

    const value = Math.floor((left.value as number) / (right.value as number));

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: VSCTypeInt.object,
        
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}

function div(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Division between diffrent types: Not implemented.'
    );

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (right.value_type == VSCTypeFun.object)
      throw Errors.ParserError('Not implemented.');

    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    if (right.value == 0) throw Errors.ParserError('Division by 0.');

    const value = (left.value as number) / (right.value as number);

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: VSCTypeFlt.object,
        
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}

function pow(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Power operation between diffrent types: Not implemented.'
    );

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (right.value_type == VSCTypeFun.object)
      throw Errors.ParserError('Not implemented.');

    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = (left.value as number) ** (right.value as number);

    const type =
      left.value_type === VSCTypeFlt.object ||
      right.value_type === VSCTypeFlt.object
        ? VSCTypeFlt.object
        : VSCTypeInt.object;

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: type,
        
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}

function mul(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (
    left.value_type === VSCTypeStr.object &&
    right.value_type == VSCTypeInt.object
  ) {
    let value = '';

    for (let i = 0; i < (right.value as number); i++) {
      value += left.value;
    }

    return [
      {
        NT: NT.value_str,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: VSCTypeStr.object,
        
      },
    ];
  }

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      'Multiplication between diffrent types: Not implemented.'
    );

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (right.value_type == VSCTypeFun.object)
      throw Errors.ParserError('Not implemented.');

    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = (left.value as number) * (right.value as number);

    const type =
      left.value_type === VSCTypeFlt.object ||
      right.value_type === VSCTypeFlt.object
        ? VSCTypeFlt.object
        : VSCTypeInt.object;

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: type,
        
      },
    ];
  }

  console.log(left, right);

  throw Errors.ParserError('Not implemented.');
}

function usub(operands: OPERANDS): ValueNode[] {
  const right = (operands[1] as ValueNode[])[0];

  if (right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (
    (right.value_type === VSCTypeFlt.object ||
      right.value_type === VSCTypeInt.object) &&
    right.NT === NT.value_num
  ) {
    if (right.value === NAN) return [{ ...right }];
    if (right.value === INFINITY) throw 'Not implemented.';

    return [
      {
        ...right,
        NT: NT.value_num,
        value: -right.value,
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}

function add(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      `Addition between diffrent types: "${left.value_type}" and "${right.value_type}" : Not implemented.`
    );

  if (left.value_type == VSCTypeStr.object) {
    if (typeof left.value !== 'string' || typeof right.value !== 'string')
      throw Errors.ParserError();

    const value = left.value + right.value;

    return [
      {
        NT: NT.value_str,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: VSCTypeStr.object,
        
      },
    ];
  }

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (right.value_type == VSCTypeFun.object)
      throw Errors.ParserError('Not implemented.');

    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = (left.value as number) + (right.value as number);

    const type =
      left.value_type === VSCTypeFlt.object ||
      right.value_type === VSCTypeFlt.object
        ? VSCTypeFlt.object
        : VSCTypeInt.object;

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: type,
        
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}

function sub(operands: OPERANDS): ValueNode[] {
  const left = (operands[0] as ValueNode[])[0];
  const right = (operands[1] as ValueNode[])[0];

  if (left.NT === NT.property_node || right.NT === NT.property_node)
    throw Errors.NotImplemented(NT.property_node);

  if (left.NT === NT.value_type || right.NT === NT.value_type)
    throw Errors.SyntaxError('Operations on types are forbidden.');

  if (left.NT === NT.special || right.NT === NT.special)
    throw Errors.SyntaxError('Wrong special token usage');

  if (left.value_type !== right.value_type)
    throw Errors.ParserError(
      `Addition between diffrent types: "${left.value_type}" and "${right.value_type}" : Not implemented.`
    );

  if (
    left.value_type == VSCTypeFlt.object ||
    left.value_type == VSCTypeInt.object
  ) {
    if (right.value_type == VSCTypeFun.object)
      throw Errors.ParserError('Not implemented.');

    if (typeof left.value === 'string' || typeof right.value === 'string')
      throw Errors.ParserError('Not implemented');

    const value = (left.value as number) - (right.value as number);

    const type =
      left.value_type === VSCTypeFlt.object ||
      right.value_type === VSCTypeFlt.object
        ? VSCTypeFlt.object
        : VSCTypeInt.object;

    return [
      {
        NT: NT.value_num,
        is_builtin: false,
        location: Location.computed,
        value: value,
        value_type: type,
        
      },
    ];
  }

  throw Errors.ParserError('Not implemented.');
}
