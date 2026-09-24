"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/cpu/logger.ts
  var nullSink = {
    write() {
    }
  };
  var Logger = class {
    constructor(options = {}) {
      __publicField(this, "sink");
      __publicField(this, "format");
      __publicField(this, "startTime");
      __publicField(this, "closed");
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
    constructor(logger = nullLogger) {
      __publicField(this, "opcodes", {
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
      });
      /**
       * Instructions that consume the next token as an inline parameter.
       * Any instruction here adds 2 bytes to the bytecode stream; every other
       * instruction adds 1.
       */
      __publicField(this, "opcodesWithParameters", /* @__PURE__ */ new Set([
        "LDA",
        "STA",
        "LDR",
        "JMP",
        "ECD",
        "JCN"
      ]));
      /**
       * Where variable allocation starts. Address 0 is reserved by the CPU's
       * STA/LDR opcodes as "auto-allocate", so we start at 1.
       */
      __publicField(this, "firstDataAddress", 1);
      __publicField(this, "dataAddressLimit", 256);
      __publicField(this, "logger");
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
      __publicField(this, "gate", gate);
    }
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
      __publicField(this, "gate", gate);
    }
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
    // Stack Pointer
    constructor(size = 256) {
      __publicField(this, "data");
      __publicField(this, "sp");
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
    constructor(size = 256) {
      __publicField(this, "data");
      __publicField(this, "usedAddresses");
      __publicField(this, "lastLoadedAddress");
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
    constructor(output = nullOutput, display = nullDisplay, logger = nullLogger) {
      __publicField(this, "stack");
      __publicField(this, "alu");
      __publicField(this, "ram");
      __publicField(this, "program");
      __publicField(this, "pc");
      __publicField(this, "running");
      __publicField(this, "output");
      __publicField(this, "display");
      __publicField(this, "logger");
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

  // src/web/BufferOutput.ts
  var BufferOutput = class {
    constructor() {
      __publicField(this, "stdout", "");
      __publicField(this, "stderr", "");
      __publicField(this, "numbers", []);
      __publicField(this, "chars", []);
      __publicField(this, "stacks", []);
    }
    writeNumber(value) {
      this.numbers.push(value);
      this.stdout += value + "\n";
    }
    writeChar(char) {
      this.chars.push(char);
      this.stdout += char;
    }
    writeStack(values) {
      this.stacks.push([...values]);
      this.stdout += "[ " + values.join(" ") + " ]\n";
    }
    writeError(message) {
      this.stderr += message + "\n";
    }
    getStdout() {
      return this.stdout;
    }
    getStderr() {
      return this.stderr;
    }
    getNumbers() {
      return [...this.numbers];
    }
    getChars() {
      return [...this.chars];
    }
    getStacks() {
      return this.stacks.map((a) => [...a]);
    }
  };

  // src/web/CanvasDisplay.ts
  var CanvasDisplay = class {
    constructor(canvas2) {
      __publicField(this, "ctx");
      const ctx = canvas2.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      this.ctx = ctx;
    }
    showTop(value) {
      const { width, height } = this.ctx.canvas;
      this.ctx.clearRect(0, 0, width, height);
      const size = value % 100 + 10;
      this.ctx.fillStyle = `rgb(${value}, ${255 - value}, 128)`;
      this.ctx.fillRect(50, 50, size, size);
    }
    printStack(values) {
      const { width, height } = this.ctx.canvas;
      this.ctx.clearRect(0, 0, width, height);
      values.forEach((val, i) => {
        this.ctx.fillStyle = `hsl(${val}, 100%, 50%)`;
        this.ctx.fillRect(i * 10, 200 - val, 8, val);
      });
    }
  };

  // src/web/StringLogSink.ts
  var StringLogSink = class {
    constructor() {
      __publicField(this, "lines", []);
      __publicField(this, "closed", false);
    }
    write(line) {
      if (this.closed) return;
      this.lines.push(line);
    }
    close() {
      this.closed = true;
    }
    toString() {
      return this.lines.join("\n");
    }
    clear() {
      this.lines.length = 0;
    }
  };

  // src/web/api.ts
  function assemble(source, options = {}) {
    const logSink = options.captureLog ? new StringLogSink() : null;
    const logger = logSink ? new Logger({ sink: logSink }) : new Logger();
    if (logSink) logger.start(`OXNTAL for WEB @ ${(/* @__PURE__ */ new Date()).toLocaleString("en-GB")}`);
    try {
      const bytecode = new Assembler(logger).assemble(source);
      if (logSink) logger.bytecode(bytecode);
      if (logSink) logger.stop();
      return {
        ok: true,
        bytecode,
        log: logSink?.toString(),
        error: void 0
      };
    } catch (err) {
      if (logSink) {
        logger.error(err.message, err);
        logger.stop();
      }
      return {
        ok: false,
        bytecode: void 0,
        log: logSink?.toString(),
        error: err.message
      };
    }
  }
  function execute(bytecode, options = {}) {
    const logSink = options.captureLog ? new StringLogSink() : null;
    const logger = logSink ? new Logger({ sink: logSink }) : new Logger();
    const output = new BufferOutput();
    const display = options.canvas ? new CanvasDisplay(options.canvas) : nullDisplay;
    if (logSink) logger.start(`OXNTAL WEB @ ${(/* @__PURE__ */ new Date()).toLocaleString("en-GB")}`);
    logger.event("CPU initialised");
    const cpu = new CPU(output, display, logger);
    cpu.load([...bytecode]);
    logger.event("Execution started");
    try {
      cpu.run();
      if (logSink) logger.stop();
      return {
        ok: true,
        stdout: output.getStdout(),
        stderr: output.getStderr(),
        numbers: output.getNumbers(),
        chars: output.getChars(),
        finalStack: snapshotStack(cpu),
        log: logSink?.toString(),
        error: void 0
      };
    } catch (err) {
      if (logSink) logger.stop();
      return {
        ok: false,
        stdout: output.getStdout(),
        stderr: output.getStderr(),
        numbers: output.getNumbers(),
        chars: output.getChars(),
        finalStack: snapshotStack(cpu),
        log: logSink?.toString(),
        error: {
          kind: "runtime",
          message: err.message
        }
      };
    }
  }
  function run(options) {
    const asm = assemble(options.source, {
      captureLog: options.captureLog
    });
    if (!asm.ok || !asm.bytecode) {
      return {
        ok: false,
        stdout: "",
        stderr: "",
        numbers: [],
        chars: [],
        finalStack: [],
        bytecode: void 0,
        log: asm.log,
        error: {
          kind: "assembly",
          message: asm.error ?? "Unknown assembly error"
        }
      };
    }
    const exec = execute(asm.bytecode, {
      canvas: options.canvas,
      captureLog: options.captureLog
    });
    return {
      ok: exec.ok,
      stdout: exec.stdout,
      stderr: exec.stderr,
      numbers: exec.numbers,
      chars: exec.chars,
      finalStack: exec.finalStack,
      bytecode: asm.bytecode,
      log: exec.log,
      error: exec.error
    };
  }
  function snapshotStack(cpu) {
    const data = cpu.stack.getStackData();
    const sp = cpu.stack.getStackPointer();
    const snapshot = new Array(sp);
    for (let i = 0; i < sp; i++) snapshot[i] = data[i] ?? 0;
    return snapshot;
  }

  // src/desktop/renderer/app.ts
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element: #${id}`);
    return el;
  }
  var sourceEl = $("source");
  var outputEl = $("output");
  var logEl = $("log");
  var canvas = $("screen");
  var statusEl = $("status");
  var infoEl = $("info");
  var samplesBtn = $("samplesBtn");
  var samplesMenu = $("samplesMenu");
  var openBtn = $("openBtn");
  var fileInput = $("fileInput");
  var runBtn = $("runBtn");
  var runLogBtn = $("runLogBtn");
  var clearBtn = $("clearBtn");
  var logToggle = $("logToggle");
  var logPanel = document.querySelector(".log-panel");
  var SAMPLES = [
    {
      name: "Hello",
      source: `//
# Prints "Hi!" followed by a newline.
//

LDA " 10 33 105 72 "
DCD * 4
BRK
`
    },
    {
      name: "Countdown",
      source: `VAR counter

LDA 5
STA counter

>loop
LDR counter
OUT
LDR counter
DEC
STA counter
LDR counter
LDA 0
GTH
JCN loop

BRK
`
    },
    {
      name: "FizzBuzz",
      source: `VAR n

LDA 1
STA n

>loop
  LDR n
  LDA 15
  MOD
  LDA 0
  EQU
  JCN case_fb

  LDR n
  LDA 3
  MOD
  LDA 0
  EQU
  JCN case_f

  LDR n
  LDA 5
  MOD
  LDA 0
  EQU
  JCN case_b

  LDR n
  OUT
  JMP next

>case_fb
  LDA " 122 122 117 66 122 122 105 70 "
  DCD * 8
  JMP next

>case_f
  LDA " 122 122 105 70 "
  DCD * 4
  JMP next

>case_b
  LDA " 122 122 117 66 "
  DCD * 4
  JMP next

>next
  LDA 10
  DCD

  LDR n
  INC
  STA n

  LDR n
  LDA 20
  GTH
  LDA 0
  EQU
  JCN loop

BRK
`
    },
    {
      name: "Bell Curve",
      source: `// A smooth parabola: v = 2 * i * (20 - i). Peaks at 200 in the middle. //
VAR i
VAR v

LDA 0
STA i

>loop
  LDR i
  LDA 21
  LTH
  JCN body
  JMP done

>body
  LDA 20
  LDR i
  SUB
  LDR i
  MUL
  LDA 2
  MUL
  STA v
  LDR v

  LDR i
  INC
  STA i
  JMP loop

>done
PRT
BRK
`
    },
    {
      name: "Bar Chart",
      source: `LDA 16
SHW
LDA 32
SHW
LDA 48
SHW
LDA 64
SHW
LDA 96
SHW
BRK
`
    },
    {
      name: "Pyramid of Stars",
      source: `VAR row
VAR spaces
VAR stars

LDA 0
STA row

>outer
  LDA 4
  LDR row
  SUB
  STA spaces

  >space_loop
    LDR spaces
    LDA 0
    GTH
    JCN space_done
    LDA 32
    DCD
    LDR spaces
    DEC
    STA spaces
    JMP space_loop

  >space_done

  LDR row
  LDA 2
  MUL
  INC
  STA stars

  >star_loop
    LDR stars
    LDA 0
    GTH
    JCN star_done
    LDA 42
    DCD
    LDR stars
    DEC
    STA stars
    JMP star_loop

  >star_done

  LDA 10
  DCD

  LDR row
  INC
  STA row

  LDR row
  LDA 5
  LTH
  JCN outer

BRK
`
    }
  ];
  function updateInfo() {
    const v = sourceEl.value;
    const lines = v.length ? v.split("\n").length : 0;
    infoEl.textContent = `${lines} lines \xB7 ${v.length} chars`;
  }
  sourceEl.addEventListener("input", updateInfo);
  sourceEl.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = sourceEl.selectionStart;
      const end = sourceEl.selectionEnd;
      sourceEl.value = sourceEl.value.slice(0, start) + "    " + sourceEl.value.slice(end);
      sourceEl.selectionStart = sourceEl.selectionEnd = start + 4;
      updateInfo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      doRun(false);
    }
  });
  SAMPLES.forEach((sample) => {
    const li = document.createElement("li");
    li.textContent = sample.name;
    li.addEventListener("click", () => {
      sourceEl.value = sample.source;
      samplesMenu.classList.remove("open");
      updateInfo();
      setStatus(`Loaded sample: ${sample.name}`);
    });
    samplesMenu.appendChild(li);
  });
  samplesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    samplesMenu.classList.toggle("open");
  });
  document.addEventListener("click", () => {
    samplesMenu.classList.remove("open");
  });
  openBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sourceEl.value = String(reader.result ?? "");
      updateInfo();
      setStatus(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    fileInput.value = "";
  });
  function setStatus(text) {
    statusEl.textContent = text;
  }
  function clearOutput() {
    outputEl.textContent = "";
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function appendError(kind, message) {
    const div = document.createElement("div");
    div.className = "err";
    div.textContent = `[${kind}] ${message}`;
    outputEl.appendChild(div);
  }
  function doRun(withLog) {
    clearOutput();
    setStatus("Running\u2026");
    let result;
    try {
      result = run({
        source: sourceEl.value,
        canvas,
        captureLog: withLog
      });
    } catch (err) {
      appendError("Exception", err.message ?? String(err));
      setStatus("Error");
      return;
    }
    if (result.stdout.length) {
      outputEl.appendChild(document.createTextNode(result.stdout));
    }
    if (result.error) {
      appendError(result.error.kind, result.error.message);
    } else if (result.stderr.length) {
      appendError("stderr", result.stderr);
    }
    if (withLog) {
      logEl.textContent = result.log ?? "(log not captured)";
      logEl.scrollTop = 0;
      setLogCollapsed(false);
    }
    outputEl.scrollTop = 0;
    setStatus(result.error ? "Finished with errors" : "Finished");
  }
  runBtn.addEventListener("click", () => doRun(false));
  runLogBtn.addEventListener("click", () => doRun(true));
  clearBtn.addEventListener("click", () => {
    clearOutput();
    setStatus("Cleared");
  });
  var logCollapsed = true;
  function setLogCollapsed(collapsed) {
    logCollapsed = collapsed;
    logPanel.classList.toggle("collapsed", collapsed);
    logToggle.textContent = collapsed ? "show" : "hide";
  }
  logToggle.addEventListener("click", () => setLogCollapsed(!logCollapsed));
  var canvasWrap = document.querySelector(".canvas-wrap");
  var MAX_CANVAS = 384;
  function fitCanvas() {
    const w = canvasWrap.clientWidth - 24;
    const h = canvasWrap.clientHeight - 24;
    const size = Math.floor(Math.min(w, h, MAX_CANVAS));
    if (size < 32) return;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
  }
  new ResizeObserver(fitCanvas).observe(canvasWrap);
  sourceEl.value = SAMPLES[0].source;
  updateInfo();
  requestAnimationFrame(fitCanvas);
  setStatus("Ready");
})();
