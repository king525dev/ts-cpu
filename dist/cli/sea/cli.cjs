#!/usr/bin/env node
#!/usr/bin/env node
"use strict";

// src/cli/index.ts
var import_node_fs2 = require("node:fs");
var import_node_util = require("node:util");

// src/cpu/logger.ts
var nullSink = {
  write() {
  }
};
var Logger = class {
  sink;
  format;
  startTime;
  closed;
  constructor(options = {}) {
    this.sink = options.sink ?? nullSink;
    this.format = options.timestampFormat ?? defaultTimestamp;
    this.startTime = nowMs();
    this.closed = false;
  }
  // -----------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------
  /** Begin a session. Prints a banner and resets the elapsed clock. */
  start(title = `OXNTAL @ ${(/* @__PURE__ */ new Date()).toLocaleString()}`) {
    this.startTime = nowMs();
    this.closed = false;
    this.raw(`

// --> ${title} <-- //`);
    this.raw("");
  }
  /** End the session and close the sink. Safe to call more than once. */
  stop() {
    if (this.closed) return;
    this.line("Process Exited");
    this.closed = true;
    this.sink.close?.();
  }
  // -----------------------------------------------------------------
  // Structured events
  // -----------------------------------------------------------------
  /** General information line. */
  info(message) {
    this.line(message);
  }
  /** Section marker: "Initialised Assembler", "CPU initialised", etc. */
  event(message) {
    this.line(message);
  }
  /** Warning: something unexpected but not fatal. */
  warn(message) {
    this.line(`WARN ${message}`);
  }
  /**
   * Error with optional cause. The stack trace is truncated to three
   * frames so the log stays readable — the top of the stack is usually
   * where the real problem is, and the bottom is framework noise.
   */
  error(message, cause) {
    let headline = `ERR! ${message}`;
    if (cause instanceof Error && cause.message && !message.includes(cause.message)) {
      headline += `: ${cause.message}`;
    }
    this.line(headline);
    if (cause instanceof Error && cause.stack) {
      const frames = cause.stack.split("\n").slice(1, 4);
      for (const frame of frames) {
        this.line(`     ${frame.trim()}`);
      }
    }
  }
  // -----------------------------------------------------------------
  // Domain-specific formatters
  // -----------------------------------------------------------------
  /** Dump a program as uppercase hex, e.g. "00 12 58 95". */
  bytecode(bytes) {
    const hex = bytes.map(toHexByte).join(" ");
    this.line(`Assembler process finished with values:`);
    this.line(` [ ${hex} ]`);
  }
  /**
   * One CPU step. Shows the program counter *before* the instruction,
   * the opcode, the stack pointer, and the whole stack as hex.
   *
   *   [pc=0x0004 op=0x1d sp=2] Stack: [ 0a 21 ]
   */
  step(pc, opcode, stack) {
    const stackHex = stack.map(toHexByte).join(" ");
    this.line(
      `[pc=0x${toHexWord(pc)} op=0x${toHexByte(opcode)} sp=${stack.length}] Stack: [ ${stackHex} ]`
    );
  }
  /**
   * Control-flow transition.
   *
   *   Flow: JMP 0x0004 -> 0x0010 (taken)
   *   Flow: JCN 0x0006 -> 0x0002 (not taken)
   */
  jump(from, to, taken, conditional) {
    const kind = conditional ? "JCN" : "JMP";
    const outcome = taken ? "taken" : "not taken";
    this.line(
      `Flow: ${kind} 0x${toHexWord(from)} -> 0x${toHexWord(to)} (${outcome})`
    );
  }
  /**
   * RAM read or write.
   *
   *   RAM wrote 42 @ 10
   *   RAM read  00 @ 10
   */
  memory(addr, value, isWrite) {
    this.line(
      `RAM ${isWrite ? "wrote" : "read "} ${toHexByte(value)} @ ${toHexByte(addr)}`
    );
  }
  // -----------------------------------------------------------------
  // Assembler events
  // -----------------------------------------------------------------
  /** Log a named list of tokens, e.g. "After comment stripping: [ LDA 5 ]". */
  tokens(label, tokens) {
    this.line(`${label}: [ ${tokens.join(" ")} ]`);
  }
  /** A `VAR` or `@name` declaration was given a RAM address. */
  varAllocated(name, address) {
    this.line(`Assigned '${name}' to RAM address 0x${toHexByte(address)}`);
  }
  /** A `>label` declaration was assigned a bytecode address. */
  labelDeclared(name, bytecodeAddress) {
    this.line(`Label '${name}' at bytecode 0x${toHexWord(bytecodeAddress)}`);
  }
  /** A variable name was resolved to an address in the emit pass. */
  varReferenced(name, address) {
    this.line(`  Referenced var '${name}' (0x${toHexByte(address)})`);
  }
  /** A label name was resolved to a bytecode address in the emit pass. */
  labelReferenced(name, bytecodeAddress) {
    this.line(
      `  Referenced label '${name}' (0x${toHexWord(bytecodeAddress)})`
    );
  }
  /**
   * Dump the symbol table after the scan pass. Variables and labels are
   * printed in declaration order. Skipped entirely when both are empty, so
   * trivial programs don't get a noisy header with nothing under it.
   */
  symbolTable(labels, vars) {
    if (labels.size === 0 && vars.size === 0) return;
    this.line("Symbol table:");
    for (const [name, addr] of vars) {
      this.line(`  var   ${name} -> 0x${toHexByte(addr)}`);
    }
    for (const [name, addr] of labels) {
      this.line(`  label ${name} -> 0x${toHexWord(addr)}`);
    }
  }
  // -----------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------
  line(message) {
    if (this.sink === nullSink) return;
    const now = /* @__PURE__ */ new Date();
    const stamp = this.format(now);
    const elapsed = Math.round(nowMs() - this.startTime);
    this.raw(`[${stamp}] ${message} {${elapsed}ms}`);
  }
  raw(message) {
    this.sink.write(message);
  }
};
function defaultTimestamp(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yy}-${hh}:${mn}`;
}
function toHexByte(n) {
  return n.toString(16).padStart(2, "0");
}
function toHexWord(n) {
  return n.toString(16).padStart(4, "0");
}
var nowMs = () => typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
var nullLogger = new Logger();

// src/cpu/assembler.ts
function parseNumber(token) {
  if (/^(?:0[xX][0-9a-fA-F]+)$/.test(token)) return parseInt(token, 16);
  if (/^(?:0[bB][01]+)$/.test(token)) return parseInt(token.slice(2), 2);
  return parseInt(token, 10);
}
function isValidNumber(token, type = "all") {
  switch (type) {
    case "hex":
      return /^(?:0[xX][0-9a-fA-F]+)$/.test(token);
    case "bin":
      return /^(?:0[bB][01]+)$/.test(token);
    case "dec":
      return /^(?:[0-9]+)$/.test(token);
    default:
      return /^(?:[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/.test(token);
  }
}
var Assembler = class {
  opcodes = {
    LDA: 1,
    DCD: 2,
    POP: 3,
    NIP: 4,
    SWP: 5,
    DUP: 6,
    OVR: 7,
    ROT: 8,
    CLR: 9,
    ADD: 10,
    SUB: 11,
    MUL: 12,
    DIV: 13,
    MOD: 14,
    AND: 15,
    ORA: 16,
    EOR: 17,
    NOT: 18,
    INC: 19,
    DEC: 20,
    SHL: 21,
    SHR: 22,
    NEG: 23,
    OUT: 24,
    LOG: 25,
    PRT: 26,
    SHW: 27,
    STA: 28,
    LDR: 29,
    JMP: 30,
    JCN: 31,
    ECD: 32,
    EQU: 33,
    GTH: 34,
    LTH: 35,
    VAR: 36,
    BRK: 255
  };
  /**
   * Instructions that consume the next token as an inline parameter.
   * Any instruction here adds 2 bytes to the bytecode stream; every other
   * instruction adds 1.
   */
  opcodesWithParameters = /* @__PURE__ */ new Set([
    "LDA",
    "STA",
    "LDR",
    "JMP",
    "ECD",
    "JCN"
  ]);
  /**
   * Where variable allocation starts. Address 0 is reserved by the CPU's
   * STA/LDR opcodes as "auto-allocate", so we start at 1.
   */
  firstDataAddress = 1;
  dataAddressLimit = 256;
  logger;
  constructor(logger = nullLogger) {
    this.logger = logger;
  }
  // ---------------------------------------------------------------------
  // Public entry point
  // ---------------------------------------------------------------------
  assemble(source) {
    let tokens = source.trim().split(/\s+/).filter((t) => t.length > 0);
    tokens = this.stripComments(tokens);
    this.logger.tokens("After comment stripping", tokens);
    tokens = this.expandMultiInstruction(tokens);
    tokens = this.expandRepeatedInstruction(tokens);
    tokens = this.expandShorthand(tokens);
    this.logger.tokens("After expansion", tokens);
    const { labels, vars } = this.scan(tokens);
    this.logger.symbolTable(labels, vars);
    return this.emit(tokens, labels, vars);
  }
  // ---------------------------------------------------------------------
  // Pass 0: comments
  // ---------------------------------------------------------------------
  //
  // Comments are delimited by paired `//` tokens: everything between two
  // `//` markers is discarded.
  //
  stripComments(tokens) {
    const result = [];
    let inComment = false;
    for (const token of tokens) {
      if (token === "//") {
        inComment = !inComment;
        continue;
      }
      if (!inComment) result.push(token);
    }
    if (inComment) {
      throw new Error("Unterminated comment: odd number of '//' markers");
    }
    return result;
  }
  // ---------------------------------------------------------------------
  // Pass 1: multi-instruction expansion
  // ---------------------------------------------------------------------
  //
  // `LDA " 1 2 3 "` becomes `LDA 1 LDA 2 LDA 3`.
  // Any parameterised instruction may be used before a quoted list.
  //
  expandMultiInstruction(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token !== '"') {
        result.push(token);
        continue;
      }
      const instruction = result[result.length - 1];
      if (instruction === void 0 || !this.opcodesWithParameters.has(instruction)) {
        throw new Error(
          `Unexpected '"' at token ${i}: previous token "${instruction}" is not a parameterised instruction`
        );
      }
      result.pop();
      let closed = false;
      i++;
      while (i < tokens.length) {
        const value = tokens[i];
        if (value === '"') {
          closed = true;
          break;
        }
        result.push(instruction, value);
        i++;
      }
      if (!closed) {
        throw new Error(`Unterminated string starting at token ${i}`);
      }
    }
    return result;
  }
  // ---------------------------------------------------------------------
  // Pass 2: repetition expansion
  // ---------------------------------------------------------------------
  //
  // `DUP * 4` becomes `DUP DUP DUP DUP`.
  //
  expandRepeatedInstruction(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token !== "*") {
        result.push(token);
        continue;
      }
      const instruction = result[result.length - 1];
      const countToken = tokens[i + 1];
      if (instruction === void 0 || !(instruction in this.opcodes)) {
        throw new Error(
          `Invalid repeat at token ${i}: "${instruction}" is not an instruction`
        );
      }
      if (countToken === void 0 || !isValidNumber(countToken, "dec")) {
        throw new Error(
          `Invalid repeat count at token ${i + 1}: "${countToken}"`
        );
      }
      const count = parseNumber(countToken);
      result.pop();
      for (let j = 0; j < count; j++) result.push(instruction);
      i++;
    }
    return result;
  }
  // ---------------------------------------------------------------------
  // Pass 3: shorthand expansion
  // ---------------------------------------------------------------------
  //
  //   `#5`  → `LDA 5`             (push an immediate value)
  //   `x++` → `LDR x INC STA x`   (increment the variable x in place)
  //
  //
  expandShorthand(tokens) {
    const result = [];
    for (const token of tokens) {
      if (token.startsWith("#") && token.length > 1) {
        result.push("LDA", token.slice(1));
      } else if (token.endsWith("++") && token.length > 2) {
        const name = token.slice(0, -2);
        result.push("LDR", name, "INC", "STA", name);
      } else {
        result.push(token);
      }
    }
    return result;
  }
  // ---------------------------------------------------------------------
  // Pass 4: scan for labels and variables
  // ---------------------------------------------------------------------
  //
  //
  scan(tokens) {
    const labels = /* @__PURE__ */ new Map();
    const vars = /* @__PURE__ */ new Map();
    let nextDataAddress = this.firstDataAddress;
    let bytecodeAddress = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "VAR") {
        const name = tokens[i + 1];
        if (name === void 0) {
          throw new Error(`VAR at token ${i} is missing a name`);
        }
        this.assertUnique(name, labels, vars);
        if (nextDataAddress >= this.dataAddressLimit) {
          throw new Error("Out of data addresses (256 max)");
        }
        vars.set(name, nextDataAddress);
        this.logger.varAllocated(name, nextDataAddress);
        nextDataAddress++;
        i++;
        continue;
      }
      if (token.startsWith("@")) {
        const name = token.slice(1);
        if (name === "") {
          throw new Error(`Empty '@' label at token ${i}`);
        }
        this.assertUnique(name, labels, vars);
        if (nextDataAddress >= this.dataAddressLimit) {
          throw new Error("Out of data addresses (256 max)");
        }
        vars.set(name, nextDataAddress);
        this.logger.varAllocated(name, nextDataAddress);
        nextDataAddress++;
        continue;
      }
      if (token.startsWith(">")) {
        const name = token.slice(1);
        if (name === "") {
          throw new Error(`Empty '>' label at token ${i}`);
        }
        this.assertUnique(name, labels, vars);
        labels.set(name, bytecodeAddress);
        this.logger.labelDeclared(name, bytecodeAddress);
        continue;
      }
      if (token in this.opcodes) {
        bytecodeAddress += 1;
        if (this.opcodesWithParameters.has(token)) {
          bytecodeAddress += 1;
          i++;
        }
      }
    }
    return { labels, vars };
  }
  // ---------------------------------------------------------------------
  // Pass 5: emit bytecode
  // ---------------------------------------------------------------------
  emit(tokens, labels, vars) {
    const bytecode = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "VAR") {
        i++;
        continue;
      }
      if (token.startsWith("@") || token.startsWith(">")) continue;
      const opcode = this.opcodes[token];
      if (opcode !== void 0) {
        bytecode.push(opcode);
        if (this.opcodesWithParameters.has(token)) {
          const param = tokens[i + 1];
          if (param === void 0) {
            throw new Error(
              `${token} at token ${i} is missing a parameter`
            );
          }
          bytecode.push(this.resolveParameter(token, param, labels, vars));
          i++;
        }
        continue;
      }
      throw new Error(
        `Unknown token at position ${i}: "${token}"`
      );
    }
    return bytecode;
  }
  resolveParameter(mnemonic, param, labels, vars) {
    if (mnemonic === "ECD") {
      return param.charCodeAt(0) & 255;
    }
    const labelAddr = labels.get(param);
    if (labelAddr !== void 0) {
      this.logger.labelReferenced(param, labelAddr);
      return labelAddr & 255;
    }
    const varAddr = vars.get(param);
    if (varAddr !== void 0) {
      this.logger.varReferenced(param, varAddr);
      return varAddr & 255;
    }
    if (isValidNumber(param)) return parseNumber(param) & 255;
    throw new Error(
      `Invalid parameter "${param}" for ${mnemonic}: expected a number, label, or variable`
    );
  }
  assertUnique(name, labels, vars) {
    if (labels.has(name)) {
      throw new Error(`Duplicate label: ${name}`);
    }
    if (vars.has(name)) {
      throw new Error(`Duplicate variable: ${name}`);
    }
  }
};

// src/cpu/hardware/transistor.ts
var NTypeTransistor = class {
  constructor(gate) {
    this.gate = gate;
  }
  gate;
  /** True when the transistor is conducting (closed switch). */
  conducts() {
    return this.gate === 1;
  }
  /**
   * Pass a signal through the transistor.
   * If the transistor is off, the output is blocked and reads as 0.
   */
  pass(signal) {
    return this.gate === 1 ? signal : 0;
  }
};
var PTypeTransistor = class {
  constructor(gate) {
    this.gate = gate;
  }
  gate;
  /** True when the transistor is conducting (closed switch). */
  conducts() {
    return this.gate === 0;
  }
  /** Pass a signal through the transistor, or 0 if it is off. */
  pass(signal) {
    return this.gate === 0 ? signal : 0;
  }
};

// src/cpu/hardware/nand.ts
var NAND = class {
  static gate(a, b) {
    const pmosA = new PTypeTransistor(a);
    const pmosB = new PTypeTransistor(b);
    const pullUp = pmosA.conducts() || pmosB.conducts();
    const nmosA = new NTypeTransistor(a);
    const nmosB = new NTypeTransistor(b);
    const pullDown = nmosA.conducts() && nmosB.conducts();
    if (pullUp === pullDown) {
      throw new Error(
        `Invalid CMOS NAND state: pullUp=${pullUp}, pullDown=${pullDown}`
      );
    }
    return pullUp ? 1 : 0;
  }
};

// src/cpu/hardware/logicGates.ts
var LogicGates = class {
  /**
   * NOT — tie both NAND inputs together.
   *
   *   A ──┬── NAND ── OUT
   *       │
   *   A ──┘
   *
   * NAND(A, A) inverts A:
   *   A=0 → NAND(0,0)=1
   *   A=1 → NAND(1,1)=0
   */
  static NOT(a) {
    return NAND.gate(a, a);
  }
  /**
   * AND — a NAND followed by an inverter.
   *
   *   A ─┐
   *      NAND ── n ── NOT ── OUT
   *   B ─┘
   *
   * The NOT is another NAND with both inputs tied to `n`.
   */
  static AND(a, b) {
    const n = NAND.gate(a, b);
    return NAND.gate(n, n);
  }
  /**
   * OR — De Morgan's law.
   *
   *   A OR B  ==  NOT( NOT(A) AND NOT(B) )
   *
   * Building the two NOTs and the AND directly from NAND:
   */
  static OR(a, b) {
    const notA = NAND.gate(a, a);
    const notB = NAND.gate(b, b);
    return NAND.gate(notA, notB);
  }
  /**
   * XOR — four NANDs.
   *
   *   n1 = NAND(A, B)
   *   n2 = NAND(A, n1)
   *   n3 = NAND(B, n1)
   *   out = NAND(n2, n3)
   *
   * Check A=1, B=0:
   *   n1 = 1, n2 = NAND(1,1)=0, n3 = NAND(0,1)=1, out = NAND(0,1)=1
   */
  static XOR(a, b) {
    const n1 = NAND.gate(a, b);
    const n2 = NAND.gate(a, n1);
    const n3 = NAND.gate(b, n1);
    return NAND.gate(n2, n3);
  }
};

// src/cpu/hardware/bitUtils.ts
function numberToByte(value) {
  const v = value & 255;
  return [
    v >> 7 & 1,
    v >> 6 & 1,
    v >> 5 & 1,
    v >> 4 & 1,
    v >> 3 & 1,
    v >> 2 & 1,
    v >> 1 & 1,
    v & 1
  ];
}
function byteToNumber(byte) {
  let out = 0;
  for (let i = 0; i < 8; i++) {
    out = out << 1 | byte[i];
  }
  return out & 255;
}

// src/cpu/hardware/adders.ts
function halfAdder(a, b) {
  return {
    sum: LogicGates.XOR(a, b),
    carry: LogicGates.AND(a, b)
  };
}
function fullAdder(a, b, carryIn) {
  const first = halfAdder(a, b);
  const second = halfAdder(first.sum, carryIn);
  return {
    sum: second.sum,
    carry: LogicGates.OR(first.carry, second.carry)
  };
}
function addBytes(a, b) {
  const result = [0, 0, 0, 0, 0, 0, 0, 0];
  let carry = 0;
  for (let i = 7; i >= 0; i--) {
    const r = fullAdder(a[i], b[i], carry);
    result[i] = r.sum;
    carry = r.carry;
  }
  return result;
}

// src/cpu/hardware/alu.ts
function byteAnd(a, b) {
  const r = [];
  for (let i = 0; i < 8; i++) r.push(LogicGates.AND(a[i], b[i]));
  return r;
}
function byteOr(a, b) {
  const r = [];
  for (let i = 0; i < 8; i++) r.push(LogicGates.OR(a[i], b[i]));
  return r;
}
function byteXor(a, b) {
  const r = [];
  for (let i = 0; i < 8; i++) r.push(LogicGates.XOR(a[i], b[i]));
  return r;
}
function byteNot(a) {
  const r = [];
  for (let i = 0; i < 8; i++) r.push(LogicGates.NOT(a[i]));
  return r;
}
var ZERO = [0, 0, 0, 0, 0, 0, 0, 0];
var ONE = [0, 0, 0, 0, 0, 0, 0, 1];
function subBytes(a, b) {
  const notB = byteNot(b);
  const negB = addBytes(notB, ONE);
  return addBytes(a, negB);
}
function mulBytes(a, b) {
  const times = byteToNumber(b);
  let result = ZERO;
  for (let i = 0; i < times; i++) {
    result = addBytes(result, a);
  }
  return result;
}
function byteLessThan(a, b) {
  return byteGreaterThan(b, a);
}
function byteGreaterThan(a, b) {
  let result = 0;
  let higherEqual = 1;
  for (let i = 0; i < 8; i++) {
    const aBit = a[i];
    const bBit = b[i];
    const aBitSetBUnset = LogicGates.AND(aBit, LogicGates.NOT(bBit));
    const thisWins = LogicGates.AND(higherEqual, aBitSetBUnset);
    result = LogicGates.OR(result, thisWins);
    const bitsEqual = LogicGates.NOT(LogicGates.XOR(aBit, bBit));
    higherEqual = LogicGates.AND(higherEqual, bitsEqual);
  }
  return result;
}
function byteEqual(a, b) {
  let result = 1;
  for (let i = 0; i < 8; i++) {
    const bitsEqual = LogicGates.NOT(LogicGates.XOR(a[i], b[i]));
    result = LogicGates.AND(result, bitsEqual);
  }
  return result;
}
function divBytes(a, b) {
  if (byteToNumber(b) === 0) return ZERO;
  let remainder = a;
  let count = ZERO;
  while (byteLessThan(remainder, b) === 0) {
    remainder = subBytes(remainder, b);
    count = addBytes(count, ONE);
  }
  return count;
}
function modBytes(a, b) {
  if (byteToNumber(b) === 0) return ZERO;
  let remainder = a;
  while (byteLessThan(remainder, b) === 0) {
    remainder = subBytes(remainder, b);
  }
  return remainder;
}
function negBytes(a) {
  return addBytes(byteNot(a), ONE);
}
function shlBytes(a, b) {
  const shift = byteToNumber(b);
  if (shift >= 8) return ZERO;
  const result = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 8 - shift; i++) {
    result[i] = a[i + shift];
  }
  return result;
}
function shrBytes(a, b) {
  const shift = byteToNumber(b);
  if (shift >= 8) return ZERO;
  const result = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = shift; i < 8; i++) {
    result[i] = a[i - shift];
  }
  return result;
}
var ALU = class {
  exec(op, a, b = 0) {
    const A = numberToByte(a);
    const B = numberToByte(b);
    switch (op) {
      case "ADD":
        return byteToNumber(addBytes(A, B));
      case "SUB":
        return byteToNumber(subBytes(A, B));
      case "MUL":
        return byteToNumber(mulBytes(A, B));
      case "DIV":
        return byteToNumber(divBytes(A, B));
      case "MOD":
        return byteToNumber(modBytes(A, B));
      case "AND":
        return byteToNumber(byteAnd(A, B));
      case "ORA":
        return byteToNumber(byteOr(A, B));
      case "EOR":
        return byteToNumber(byteXor(A, B));
      case "NOT":
        return byteToNumber(byteNot(A));
      case "INC":
        return byteToNumber(addBytes(A, ONE));
      case "DEC":
        return byteToNumber(subBytes(A, ONE));
      case "SHL":
        return byteToNumber(shlBytes(A, B));
      case "SHR":
        return byteToNumber(shrBytes(A, B));
      case "NEG":
        return byteToNumber(negBytes(A));
      case "EQU":
        return byteEqual(A, B);
      case "GTH":
        return byteGreaterThan(A, B);
      case "LTH":
        return byteLessThan(A, B);
      default:
        throw new Error(`Unknown ALU op: ${op}`);
    }
  }
};

// src/cpu/stack.ts
var Stack = class {
  data;
  sp;
  // Stack Pointer
  constructor(size = 256) {
    this.data = new Uint8Array(size);
    this.sp = 0;
  }
  getStackPointer() {
    return this.sp;
  }
  getStackData() {
    return this.data;
  }
  push(value) {
    if (this.sp >= this.data.length) throw new Error("Stack overflow");
    this.data[this.sp++] = value & 255;
  }
  pop() {
    if (this.sp === 0) {
      throw new Error("Stack underflow");
    } else {
      this.data[--this.sp];
    }
    return this.data[this.sp] ?? 0;
  }
  peek(offset = 0) {
    return this.data[this.sp - 1 - offset] ?? 0;
  }
  dup() {
    if (this.sp < 1) throw new Error("Stack underflow");
    this.push(this.peek());
  }
  swap() {
    const a = this.pop(), b = this.pop();
    this.push(a);
    this.push(b);
  }
  nip() {
    if (this.sp < 2) throw new Error("Not enough items");
    const top = this.pop();
    this.pop();
    this.push(top);
  }
  ovr() {
    if (this.sp < 2) throw new Error("Not enough items");
    this.push(this.peek(1));
  }
  rot() {
    const c = this.pop(), b = this.pop(), a = this.pop();
    this.push(b);
    this.push(c);
    this.push(a);
  }
  clr() {
    this.sp = 0;
  }
};

// src/cpu/ram.ts
var RAM = class {
  data;
  usedAddresses;
  lastLoadedAddress;
  constructor(size = 256) {
    this.data = new Uint8Array(size);
    this.usedAddresses = /* @__PURE__ */ new Set();
    this.lastLoadedAddress = 0;
    this.addWildCardDataAt(0, 5 ** 2);
  }
  addWildCardDataAt(addr, value) {
    this.validateByte(value);
    this.data[addr] = value;
    this.usedAddresses.add(addr);
    this.lastLoadedAddress = addr;
  }
  addDataAt(addr, value) {
    this.validateAddress(addr);
    this.validateByte(value);
    if (!this.isSpaceAvailable(addr)) {
      throw new Error(`Data already exists at address ${addr}`);
    }
    this.data[addr] = value;
    this.usedAddresses.add(addr);
    this.lastLoadedAddress = addr;
  }
  writeDataAt(addr, value) {
    this.validateAddress(addr);
    this.validateByte(value);
    this.data[addr] = value;
    this.usedAddresses.add(addr);
    this.lastLoadedAddress = addr;
  }
  getDataAt(addr) {
    this.validateAddress(addr);
    const data = this.data[addr];
    if (data !== void 0) {
      return data;
    } else {
      throw new Error(`Error retrieving data at ${addr}`);
    }
  }
  clearDataAt(addr) {
    this.validateAddress(addr);
    this.data[addr] = 0;
    this.usedAddresses.delete(addr);
  }
  isSpaceAvailable(addr) {
    this.validateAddress(addr);
    return !this.usedAddresses.has(addr);
  }
  isAddressUsed(addr) {
    this.validateAddress(addr);
    return this.usedAddresses.has(addr);
  }
  getMemoryArray() {
    return this.data;
  }
  getMemoryCopy() {
    return new Uint8Array(this.data);
  }
  clrMemory() {
    this.data.fill(0);
    this.usedAddresses.clear();
  }
  getLastLoadedValue() {
    const value = this.data[this.lastLoadedAddress];
    if (value !== void 0) {
      return value;
    }
    return 0;
  }
  getSize() {
    return this.data.length;
  }
  getUsedAddresses() {
    return Array.from(this.usedAddresses);
  }
  getUsedAddressCount() {
    return this.usedAddresses.size;
  }
  getFreeAddressCount() {
    return this.data.length - this.usedAddresses.size;
  }
  findFreeAddress(allocatedAddresses) {
    for (let addr = 0; addr < this.data.length; addr++) {
      if (allocatedAddresses && allocatedAddresses.has(addr)) {
        continue;
      }
      if (!this.usedAddresses.has(addr)) {
        return addr;
      }
    }
    throw new Error("RAM is full");
  }
  addDataAtFreeAddress(value) {
    const addr = this.findFreeAddress();
    this.addDataAt(addr, value);
    return addr;
  }
  validateAddress(addr) {
    if (!Number.isInteger(addr)) {
      throw new Error(`Address must be an integer: ${addr}`);
    }
    if (addr < 1 || addr >= this.data.length) {
      throw new Error(
        `Address ${addr} is out of bounds (1-${this.data.length - 1})`
      );
    }
  }
  validateByte(value) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(
        `RAM value must be an integer between 0 and 255: ${value}`
      );
    }
  }
};
var ram_default = RAM;

// src/cpu/io.ts
var nullOutput = {
  writeNumber() {
  },
  writeChar() {
  },
  writeStack() {
  },
  writeError() {
  }
};
var nullDisplay = {
  showTop() {
  },
  printStack() {
  }
};

// src/cpu/cpu.ts
var CPU = class {
  stack;
  alu;
  ram;
  program;
  pc;
  running;
  output;
  display;
  logger;
  constructor(output = nullOutput, display = nullDisplay, logger = nullLogger) {
    this.stack = new Stack();
    this.alu = new ALU();
    this.ram = new ram_default();
    this.program = new Uint8Array(0);
    this.pc = 0;
    this.running = false;
    this.output = output;
    this.display = display;
    this.logger = logger;
  }
  /**
   * Replace the I/O adapters after construction. Useful when a UI
   * creates the CPU early but only wires up its output panel later, or
   * when a test wants to swap in a capturing adapter mid-run.
   */
  setIO(output, display) {
    this.output = output;
    this.display = display;
  }
  /** Load a program and reset the program counter. */
  load(bytecode) {
    this.program = new Uint8Array(bytecode);
    this.pc = 0;
  }
  /**
   * Execute a single instruction. Returns `true` while the CPU should
   * keep running, `false` once `BRK` has been reached or before `run()`
   * has been called.
   */
  step() {
    if (!this.running) return false;
    const pcAtStart = this.pc;
    const opcode = this.program[this.pc++] ?? 0;
    try {
      switch (opcode) {
        // -----------------------------------------------------------
        // Stack / literal loading
        // -----------------------------------------------------------
        case 1: {
          const value = this.program[this.pc++];
          if (value === void 0) {
            throw new Error("LDA instruction needs accompanying parameter");
          }
          this.stack.push(value);
          break;
        }
        case 2: {
          this.output.writeChar(String.fromCharCode(this.stack.pop()));
          break;
        }
        case 3: {
          this.stack.pop();
          break;
        }
        case 4: {
          this.stack.nip();
          break;
        }
        case 5: {
          this.stack.swap();
          break;
        }
        case 6: {
          this.stack.dup();
          break;
        }
        case 7: {
          this.stack.ovr();
          break;
        }
        case 8: {
          this.stack.rot();
          break;
        }
        case 9: {
          this.stack.clr();
          break;
        }
        // -----------------------------------------------------------
        // Binary arithmetic / logic
        // -----------------------------------------------------------
        case 10: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("ADD", b, a));
          break;
        }
        case 11: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("SUB", b, a));
          break;
        }
        case 12: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("MUL", b, a));
          break;
        }
        case 13: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("DIV", b, a));
          break;
        }
        case 14: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("MOD", b, a));
          break;
        }
        case 15: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("AND", b, a));
          break;
        }
        case 16: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("ORA", b, a));
          break;
        }
        case 17: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("EOR", b, a));
          break;
        }
        // -----------------------------------------------------------
        // Unary arithmetic / logic
        // -----------------------------------------------------------
        case 18: {
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("NOT", b, 0));
          break;
        }
        case 19: {
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("INC", b, 0));
          break;
        }
        case 20: {
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("DEC", b, 0));
          break;
        }
        case 23: {
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("NEG", b, 0));
          break;
        }
        // -----------------------------------------------------------
        // Binary shifts
        // -----------------------------------------------------------
        case 21: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("SHL", b, a));
          break;
        }
        case 22: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("SHR", b, a));
          break;
        }
        // -----------------------------------------------------------
        // Text output
        // -----------------------------------------------------------
        case 24: {
          this.output.writeNumber(this.stack.pop());
          break;
        }
        case 25: {
          this.output.writeStack(this.stackSnapshot());
          break;
        }
        // -----------------------------------------------------------
        // Graphical output
        // -----------------------------------------------------------
        case 26: {
          this.display.printStack(this.stackSnapshot());
          break;
        }
        case 27: {
          this.display.showTop(this.stack.peek());
          break;
        }
        // -----------------------------------------------------------
        // Memory
        // -----------------------------------------------------------
        case 28: {
          const addr = this.program[this.pc++];
          if (addr === void 0) {
            throw new Error(
              "STA instruction needs accompanying address parameter, use 0x00 if unsure"
            );
          }
          const value = this.stack.pop();
          if (addr === 0) {
            this.ram.addDataAtFreeAddress(value);
          } else {
            this.ram.writeDataAt(addr, value);
          }
          this.logger.memory(addr, value, true);
          break;
        }
        case 29: {
          const addr = this.program[this.pc++];
          if (addr === void 0) {
            throw new Error(
              "LDR instruction needs accompanying address parameter, use 0x00 if unsure"
            );
          }
          const value = addr === 0 ? this.ram.getLastLoadedValue() : this.ram.getDataAt(addr);
          this.stack.push(value);
          this.logger.memory(addr, value, false);
          break;
        }
        // -----------------------------------------------------------
        // Control flow
        // -----------------------------------------------------------
        case 30: {
          const addr = this.program[this.pc++];
          if (addr === void 0) {
            throw new Error(
              "JMP instruction needs accompanying address parameter"
            );
          }
          if (addr >= this.program.length) {
            throw new Error(
              `Invalid instruction address: 0x${addr.toString(16)}`
            );
          }
          this.pc = addr;
          this.logger.jump(pcAtStart, addr, true, false);
          break;
        }
        case 31: {
          const addr = this.program[this.pc++];
          const condition = this.stack.pop();
          if (addr === void 0) throw new Error("JCN instruction needs accompanying address parameter");
          if (addr >= this.program.length) throw new Error(`Invalid instruction address: 0x${addr.toString(16)}`);
          const taken = condition > 0;
          if (taken) this.pc = addr;
          this.logger.jump(pcAtStart, addr, taken, true);
          break;
        }
        // -----------------------------------------------------------
        // Character literal loading
        // -----------------------------------------------------------
        case 32: {
          const value = this.program[this.pc++];
          if (value === void 0) {
            throw new Error(
              "ECD instruction needs accompanying parameter"
            );
          }
          this.stack.push(value);
          break;
        }
        // -----------------------------------------------------------
        // Comparisons
        // -----------------------------------------------------------
        case 33: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("EQU", b, a));
          break;
        }
        case 34: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("GTH", b, a));
          break;
        }
        case 35: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(this.alu.exec("LTH", b, a));
          break;
        }
        // -----------------------------------------------------------
        // Halt
        // -----------------------------------------------------------
        case 255: {
          this.running = false;
          break;
        }
        default: {
          throw new Error(
            `Unknown opcode: 0x${(opcode ?? 0).toString(16)}`
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `At pc=0x${pcAtStart.toString(16).padStart(4, "0")} opcode=0x${opcode.toString(16).padStart(2, "0")}: ${err.message}`,
        err
      );
      this.running = false;
      throw err;
    }
    this.logger.step(pcAtStart, opcode, this.stackSnapshot());
    return this.running;
  }
  /** Run until `BRK` or an error. */
  run() {
    this.running = true;
    while (this.running) this.step();
  }
  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------
  /**
   * Copy the live stack into a plain `number[]` so that display/output
   * adapters cannot accidentally mutate the CPU's internal state by
   * holding a reference to the underlying `Uint8Array`.
   */
  stackSnapshot() {
    const data = this.stack.getStackData();
    const sp = this.stack.getStackPointer();
    const snapshot = new Array(sp);
    for (let i = 0; i < sp; i++) {
      snapshot[i] = data[i] ?? 0;
    }
    return snapshot;
  }
};

// src/cli/NodeOutput.ts
var NodeOutput = class {
  /**
   * Print a number followed by a newline (OUT, 0x18).
   * Matches the original terminal behaviour, where each OUT was on its
   * own line, so existing programs produce the same visible output.
   */
  writeNumber(value) {
    process.stdout.write(value.toString() + "\n");
  }
  /**
   * Print a single ASCII character with no trailing newline (DCD, 0x02).
   * No newline so that a sequence of DCDs forms a string, e.g.
   *   LDA 72  DCD
   *   LDA 105 DCD
   *   LDA 33  DCD
   * prints `Hi!` on one line.
   */
  writeChar(char) {
    process.stdout.write(char);
  }
  /**
   * Print the whole stack on one line, e.g. `[ 1 2 3 ]` (LOG, 0x19).
   * Includes a trailing newline so successive LOGs don't run together.
   */
  writeStack(values) {
    process.stdout.write("[ " + values.join(" ") + " ]\n");
  }
  /** Report an error on stderr. */
  writeError(message) {
    process.stderr.write(message + "\n");
  }
};

// src/cli/TerminalDisplay.ts
var BAR_CHAR = "\u2588";
var MAX_BAR = 60;
var TerminalDisplay = class {
  /**
   * Render the current top-of-stack value as a single horizontal bar
   * (SHW, 0x1B). Example for value 7:
   *
   *   ███████  7
   */
  showTop(value) {
    const width = Math.min(value, MAX_BAR);
    process.stdout.write(BAR_CHAR.repeat(width) + "  " + value + "\n");
  }
  /**
   * Render the full stack as a labelled bar chart (PRT, 0x1A). Example
   * for a stack `[3, 5, 1]`:
   *
   *   Stack:
   *     [  0]  ███  3
   *     [  1]  █████  5
   *     [  2]  █  1
   *
   * An empty stack prints `Stack: (empty)`.
   */
  printStack(values) {
    process.stdout.write("Stack:\n");
    if (values.length === 0) {
      process.stdout.write("  (empty)\n");
      return;
    }
    values.forEach((value, index) => {
      const width = Math.min(value, MAX_BAR);
      const label = index.toString().padStart(3);
      const bar = BAR_CHAR.repeat(width);
      process.stdout.write(`  [${label}]  ${bar}  ${value}
`);
    });
  }
};

// src/cli/FileLogSink.ts
var import_node_fs = require("node:fs");
var FileLogSink = class {
  path;
  closed = false;
  constructor(options) {
    this.path = options.path;
    try {
      if (options.truncate) {
        (0, import_node_fs.writeFileSync)(this.path, "", "utf8");
      } else {
        (0, import_node_fs.appendFileSync)(this.path, "", "utf8");
      }
    } catch (err) {
      throw new Error(
        `Could not open log file '${this.path}': ${err.message}`
      );
    }
  }
  write(line) {
    if (this.closed) return;
    (0, import_node_fs.appendFileSync)(this.path, line + "\n", "utf8");
  }
  close() {
    this.closed = true;
  }
};

// src/cli/index.ts
var EXIT_OK = 0;
var EXIT_USAGE = 1;
var EXIT_FILE = 2;
var EXIT_ASSEMBLY = 3;
var EXIT_RUNTIME = 4;
var USAGE = `oxntal \u2014 a tiny stack-based CPU

Usage:
    oxntal <program.oxn>              Assemble and run a program
    oxntal run <program.oxn>          Same, with an explicit "run" verb
    oxntal --help                     Show this message

Options:
    --no-display            Suppress graphical (SHW / PRT) output
    --log <path>            Write the debug log to <path>. Default: mycpu.log
                            Use '--log -' to write to stderr instead.
    --trace                 Alias for '--log -'
    --no-log                Disable the debug log entirely
    --verbose               Step through execution, printing pc, opcode, and
                            stack to stderr after each instruction
    -h, --help              Show this message

Exit codes:
    0  success
    1  bad usage
    2  file could not be read
    3  assembly error
    4  runtime error

Examples:
    oxntal examples/hello.oxn
    oxntal run examples/countdown.oxn --trace
    oxntal examples/countdown.oxn --log debug.log
`;
function parseCLI(argv) {
  let parsed;
  try {
    parsed = (0, import_node_util.parseArgs)({
      args: argv,
      options: {
        "no-display": { type: "boolean", default: false },
        "trace": { type: "boolean", default: false },
        "verbose": { type: "boolean", default: false },
        "help": { type: "boolean", short: "h", default: false },
        "log": { type: "string" },
        "no-log": { type: "boolean", default: false }
      },
      allowPositionals: true,
      strict: true
    });
  } catch (err) {
    return { kind: "error", message: err.message };
  }
  const { values, positionals } = parsed;
  if (values.help) return { kind: "help" };
  if (positionals.length === 0) {
    return { kind: "error", message: "no program file specified" };
  }
  const file = positionals[0] === "run" ? positionals[1] : positionals[0];
  if (file === void 0) {
    return {
      kind: "error",
      message: "'run' requires a file argument"
    };
  }
  const noLog = values["no-log"] === true;
  const trace = values.trace === true;
  const logPath = values.log;
  if (noLog && (trace || logPath !== void 0)) {
    return {
      kind: "error",
      message: "--no-log cannot be combined with --log or --trace"
    };
  }
  if (trace && logPath !== void 0) {
    return {
      kind: "error",
      message: "--trace and --log are mutually exclusive"
    };
  }
  let logTarget;
  if (noLog) {
    logTarget = { kind: "none" };
  } else if (trace || logPath === "-") {
    logTarget = { kind: "stderr" };
  } else if (logPath !== void 0) {
    logTarget = { kind: "file", path: logPath };
  } else {
    logTarget = { kind: "file", path: "oxntal.log" };
  }
  return {
    kind: "ok",
    opts: {
      file,
      display: values["no-display"] !== true,
      logTarget,
      verbose: values.verbose === true
    }
  };
}
function makeLogger(target) {
  switch (target.kind) {
    case "none":
      return new Logger();
    case "stderr":
      return new Logger({
        sink: {
          write(line) {
            process.stderr.write(line + "\n");
          }
        }
      });
    case "file":
      return new Logger({
        sink: new FileLogSink({ path: target.path })
      });
  }
}
function main() {
  const result = parseCLI(process.argv.slice(2));
  if (result.kind === "help") {
    process.stdout.write(USAGE);
    return EXIT_OK;
  }
  if (result.kind === "error") {
    process.stderr.write(`Error: ${result.message}

`);
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  const opts = result.opts;
  const output = new NodeOutput();
  const display = opts.display ? new TerminalDisplay() : nullDisplay;
  let logger;
  try {
    logger = makeLogger(opts.logTarget);
  } catch (err) {
    output.writeError(err.message);
    return EXIT_FILE;
  }
  process.on("exit", () => {
    logger.stop();
  });
  logger.start(`OXNTAL for CLI @ ${(/* @__PURE__ */ new Date()).toLocaleString("en-GB")}`);
  if (opts.logTarget.kind === "file") {
    logger.info(`Logging to ${opts.logTarget.path}`);
  }
  try {
    let source;
    try {
      source = (0, import_node_fs2.readFileSync)(opts.file, "utf8");
    } catch (err) {
      const e = err;
      if (e.code === "ENOENT") {
        output.writeError(`File not found: ${opts.file}`);
      } else if (e.code === "EISDIR") {
        output.writeError(`Not a file: ${opts.file}`);
      } else {
        output.writeError(`Could not read ${opts.file}: ${e.message}`);
      }
      logger.stop();
      return EXIT_FILE;
    }
    logger.event("Initialised Assembler");
    const assembler = new Assembler(logger);
    let bytecode;
    try {
      bytecode = assembler.assemble(source);
    } catch (err) {
      logger.error(err.message, err);
      logger.stop();
      output.writeError(`Assembly error: ${err.message}`);
      return EXIT_ASSEMBLY;
    }
    logger.bytecode(bytecode);
    logger.event("CPU initialised");
    const cpu = new CPU(output, display, logger);
    cpu.load(bytecode);
    logger.event("Execution started");
    try {
      if (opts.verbose) {
        runVerbose(cpu);
      } else {
        cpu.run();
      }
    } catch (err) {
      logger.stop();
      output.writeError(`Runtime error: ${err.message}`);
      return EXIT_RUNTIME;
    }
    return EXIT_OK;
  } finally {
    logger.stop();
  }
}
function runVerbose(cpu) {
  cpu.running = true;
  while (cpu.running) {
    const pc = cpu.pc;
    const op = cpu.program[pc] ?? 0;
    const sp = cpu.stack.getStackPointer();
    const stack = snapshotStack(cpu);
    process.stderr.write(
      `[pc=${hex4(pc)} sp=${sp.toString().padStart(3)} op=0x${op.toString(16).padStart(2, "0")}] stack=[${stack.join(" ")}]
`
    );
    cpu.step();
  }
}
function snapshotStack(cpu) {
  const data = cpu.stack.getStackData();
  const sp = cpu.stack.getStackPointer();
  const result = new Array(sp);
  for (let i = 0; i < sp; i++) result[i] = data[i] ?? 0;
  return result;
}
function hex4(n) {
  return n.toString(16).padStart(4, "0");
}
process.exitCode = main();
