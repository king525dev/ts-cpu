//#region \0@oxc-project+runtime@0.150.0/helpers/esm/typeof.js
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
//#endregion
//#region \0@oxc-project+runtime@0.150.0/helpers/esm/toPrimitive.js
function toPrimitive(t, r) {
	if ("object" != _typeof(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.150.0/helpers/esm/toPropertyKey.js
function toPropertyKey(t) {
	var i = toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.150.0/helpers/esm/defineProperty.js
function _defineProperty(e, r, t) {
	return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
//#endregion
//#region src/cpu/logger.ts
/** A sink that discards everything. Used as the default. */
var nullSink = { write() {} };
var Logger = class {
	constructor(options = {}) {
		_defineProperty(this, "sink", void 0);
		_defineProperty(this, "format", void 0);
		_defineProperty(this, "startTime", void 0);
		_defineProperty(this, "closed", void 0);
		this.sink = options.sink ?? nullSink;
		this.format = options.timestampFormat ?? defaultTimestamp;
		this.startTime = nowMs();
		this.closed = false;
	}
	/** Begin a session. Prints a banner and resets the elapsed clock. */
	start(title = `OXNTAL @ ${(/* @__PURE__ */ new Date()).toLocaleString()}`) {
		this.startTime = nowMs();
		this.closed = false;
		this.raw(`\n\n// --> ${title} <-- //`);
		this.raw("");
	}
	/** End the session and close the sink. Safe to call more than once. */
	stop() {
		if (this.closed) return;
		this.line("Process Exited");
		this.closed = true;
		this.sink.close?.();
	}
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
		if (cause instanceof Error && cause.message && !message.includes(cause.message)) headline += `: ${cause.message}`;
		this.line(headline);
		if (cause instanceof Error && cause.stack) {
			const frames = cause.stack.split("\n").slice(1, 4);
			for (const frame of frames) this.line(`     ${frame.trim()}`);
		}
	}
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
		this.line(`[pc=0x${toHexWord(pc)} op=0x${toHexByte(opcode)} sp=${stack.length}] Stack: [ ${stackHex} ]`);
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
		this.line(`Flow: ${kind} 0x${toHexWord(from)} -> 0x${toHexWord(to)} (${outcome})`);
	}
	/**
	* RAM read or write.
	*
	*   RAM wrote 42 @ 10
	*   RAM read  00 @ 10
	*/
	memory(addr, value, isWrite) {
		this.line(`RAM ${isWrite ? "wrote" : "read "} ${toHexByte(value)} @ ${toHexByte(addr)}`);
	}
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
		this.line(`  Referenced label '${name}' (0x${toHexWord(bytecodeAddress)})`);
	}
	/**
	* Dump the symbol table after the scan pass. Variables and labels are
	* printed in declaration order. Skipped entirely when both are empty, so
	* trivial programs don't get a noisy header with nothing under it.
	*/
	symbolTable(labels, vars) {
		if (labels.size === 0 && vars.size === 0) return;
		this.line("Symbol table:");
		for (const [name, addr] of vars) this.line(`  var   ${name} -> 0x${toHexByte(addr)}`);
		for (const [name, addr] of labels) this.line(`  label ${name} -> 0x${toHexWord(addr)}`);
	}
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
	return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}-${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function toHexByte(n) {
	return n.toString(16).padStart(2, "0");
}
function toHexWord(n) {
	return n.toString(16).padStart(4, "0");
}
var nowMs = () => typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
/**
* A Logger that does nothing. Used as the default third argument to the
* CPU constructor, so existing call sites keep working unchanged.
*/
var nullLogger = new Logger();
//#endregion
//#region src/cpu/assembler.ts
/**
* Turns assembly source text into bytecode for the CPU.
*
* The assembler runs in five passes, each of which is a pure function over
* an array of string tokens:
*
*   0. stripComments           – remove `// ... //` regions
*   1. expandMultiInstruction  – `LDA " 1 2 3 "`  →  `LDA 1 LDA 2 LDA 3`
*   2. expandRepeatedInstruction – `DUP * 4`      →  `DUP DUP DUP DUP`
*   3. expandShorthand         – `#5` / `x++`     →  longer token runs
*   4. scan                    – resolve `>label`, `@name`, `VAR name`
*   5. emit                    – walk the tokens and produce bytes
*
*/
function parseNumber(token) {
	if (/^(?:0[xX][0-9a-fA-F]+)$/.test(token)) return parseInt(token, 16);
	if (/^(?:0[bB][01]+)$/.test(token)) return parseInt(token.slice(2), 2);
	return parseInt(token, 10);
}
function isValidNumber(token, type = "all") {
	switch (type) {
		case "hex": return /^(?:0[xX][0-9a-fA-F]+)$/.test(token);
		case "bin": return /^(?:0[bB][01]+)$/.test(token);
		case "dec": return /^(?:[0-9]+)$/.test(token);
		default: return /^(?:[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/.test(token);
	}
}
var Assembler = class {
	constructor(logger = nullLogger) {
		_defineProperty(this, "opcodes", {
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
		_defineProperty(
			this,
			/**
			* Instructions that consume the next token as an inline parameter.
			* Any instruction here adds 2 bytes to the bytecode stream; every other
			* instruction adds 1.
			*/
			"opcodesWithParameters",
			/* @__PURE__ */ new Set([
				"LDA",
				"STA",
				"LDR",
				"JMP",
				"ECD",
				"JCN"
			])
		);
		_defineProperty(
			this,
			/**
			* Where variable allocation starts. Address 0 is reserved by the CPU's
			* STA/LDR opcodes as "auto-allocate", so we start at 1.
			*/
			"firstDataAddress",
			1
		);
		_defineProperty(this, "dataAddressLimit", 256);
		_defineProperty(this, "logger", void 0);
		this.logger = logger;
	}
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
		if (inComment) throw new Error("Unterminated comment: odd number of '//' markers");
		return result;
	}
	expandMultiInstruction(tokens) {
		const result = [];
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token !== "\"") {
				result.push(token);
				continue;
			}
			const instruction = result[result.length - 1];
			if (instruction === void 0 || !this.opcodesWithParameters.has(instruction)) throw new Error(`Unexpected '"' at token ${i}: previous token "${instruction}" is not a parameterised instruction`);
			result.pop();
			let closed = false;
			i++;
			while (i < tokens.length) {
				const value = tokens[i];
				if (value === "\"") {
					closed = true;
					break;
				}
				result.push(instruction, value);
				i++;
			}
			if (!closed) throw new Error(`Unterminated string starting at token ${i}`);
		}
		return result;
	}
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
			if (instruction === void 0 || !(instruction in this.opcodes)) throw new Error(`Invalid repeat at token ${i}: "${instruction}" is not an instruction`);
			if (countToken === void 0 || !isValidNumber(countToken, "dec")) throw new Error(`Invalid repeat count at token ${i + 1}: "${countToken}"`);
			const count = parseNumber(countToken);
			result.pop();
			for (let j = 0; j < count; j++) result.push(instruction);
			i++;
		}
		return result;
	}
	expandShorthand(tokens) {
		const result = [];
		for (const token of tokens) if (token.startsWith("#") && token.length > 1) result.push("LDA", token.slice(1));
		else if (token.endsWith("++") && token.length > 2) {
			const name = token.slice(0, -2);
			result.push("LDR", name, "INC", "STA", name);
		} else result.push(token);
		return result;
	}
	scan(tokens) {
		const labels = /* @__PURE__ */ new Map();
		const vars = /* @__PURE__ */ new Map();
		let nextDataAddress = this.firstDataAddress;
		let bytecodeAddress = 0;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token === "VAR") {
				const name = tokens[i + 1];
				if (name === void 0) throw new Error(`VAR at token ${i} is missing a name`);
				this.assertUnique(name, labels, vars);
				if (nextDataAddress >= this.dataAddressLimit) throw new Error("Out of data addresses (256 max)");
				vars.set(name, nextDataAddress);
				this.logger.varAllocated(name, nextDataAddress);
				nextDataAddress++;
				i++;
				continue;
			}
			if (token.startsWith("@")) {
				const name = token.slice(1);
				if (name === "") throw new Error(`Empty '@' label at token ${i}`);
				this.assertUnique(name, labels, vars);
				if (nextDataAddress >= this.dataAddressLimit) throw new Error("Out of data addresses (256 max)");
				vars.set(name, nextDataAddress);
				this.logger.varAllocated(name, nextDataAddress);
				nextDataAddress++;
				continue;
			}
			if (token.startsWith(">")) {
				const name = token.slice(1);
				if (name === "") throw new Error(`Empty '>' label at token ${i}`);
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
		return {
			labels,
			vars
		};
	}
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
					if (param === void 0) throw new Error(`${token} at token ${i} is missing a parameter`);
					bytecode.push(this.resolveParameter(token, param, labels, vars));
					i++;
				}
				continue;
			}
			throw new Error(`Unknown token at position ${i}: "${token}"`);
		}
		return bytecode;
	}
	resolveParameter(mnemonic, param, labels, vars) {
		if (mnemonic === "ECD") return param.charCodeAt(0) & 255;
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
		throw new Error(`Invalid parameter "${param}" for ${mnemonic}: expected a number, label, or variable`);
	}
	assertUnique(name, labels, vars) {
		if (labels.has(name)) throw new Error(`Duplicate label: ${name}`);
		if (vars.has(name)) throw new Error(`Duplicate variable: ${name}`);
	}
};
//#endregion
//#region src/cpu/hardware/transistor.ts
/**
* N-type MOSFET (NMOS).
*
*   conducts when its gate is HIGH (1).
*   blocks   when its gate is LOW  (0).
*
* In CMOS circuits, NMOS transistors form the "pull-down" network — when
* they conduct, they connect the output to ground (0).
*
* The transistor is modelled as a swtich. A real MOSFET has a
* gate-threshold voltage and a resistance that varies with gate voltage;
* that is not relevant to me, so it has been left out. What's left is the digital
* abstraction, which is what every CPU design ultimately relies on.
*/
var NTypeTransistor = class {
	constructor(gate) {
		_defineProperty(this, "gate", void 0);
		this.gate = gate;
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
/**
* P-type MOSFET (PMOS).
*
*   conducts when its gate is LOW  (0).
*   blocks   when its gate is HIGH (1).
*
* PMOS transistors form the "pull-up" network — when they conduct, they
* connect the output to the positive supply (1).
*
* The complementary behaviour of NMOS and PMOS is the whole reason CMOS
* gates consume almost no power in a steady state: exactly one of the two
* networks conducts at any time.
*/
var PTypeTransistor = class {
	constructor(gate) {
		_defineProperty(this, "gate", void 0);
		this.gate = gate;
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
//#endregion
//#region src/cpu/hardware/nand.ts
/**
* A 2-input NAND gate built from four CMOS transistors.
*
* Layout (standard CMOS NAND):
*
*              Vdd (1)
*                │
*          ┌─────┴─────┐
*          │           │
*       PMOS(A)     PMOS(B)      ← pull-up network (parallel)
*          │           │
*          └─────┬─────┘
*                │
*                ├─────── OUT
*                │
*          ┌─────┴─────┐
*              NMOS(A)
*                │
*              NMOS(B)           ← pull-down network (series)
*                │
*              GND (0)
*
*
*   * The PMOS pair is *parallel*. If either A or B is LOW, at least one
*     PMOS conducts, connecting the output to Vdd. So the output is HIGH
*     whenever NOT(A AND B).
*
*   * The NMOS pair is *series*. Both must conduct for the output to be
*     pulled to ground. Both conduct only when A AND B are both HIGH.
*
* The two networks are complementary: for any input, exactly one conducts.
*
* Truth table:
*   A  B  | OUT
*   0  0  |  1
*   0  1  |  1
*   1  0  |  1
*   1  1  |  0
*/
var NAND = class {
	static gate(a, b) {
		const pmosA = new PTypeTransistor(a);
		const pmosB = new PTypeTransistor(b);
		const pullUp = pmosA.conducts() || pmosB.conducts();
		const nmosA = new NTypeTransistor(a);
		const nmosB = new NTypeTransistor(b);
		const pullDown = nmosA.conducts() && nmosB.conducts();
		if (pullUp === pullDown) throw new Error(`Invalid CMOS NAND state: pullUp=${pullUp}, pullDown=${pullDown}`);
		return pullUp ? 1 : 0;
	}
};
//#endregion
//#region src/cpu/hardware/logicGates.ts
/**
* The four basic logic gates, each built from NAND gates like in modern CPUs.
* 
*/
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
//#endregion
//#region src/cpu/hardware/bitUtils.ts
/**
* Split a number into its 8 bits, MSB first.
*
*/
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
/** Recombine eight bits, MSB first, into a number in the range 0–255. */
function byteToNumber(byte) {
	let out = 0;
	for (let i = 0; i < 8; i++) out = out << 1 | byte[i];
	return out & 255;
}
//#endregion
//#region src/cpu/hardware/adders.ts
/**
* Half adder: adds two bits, producing a sum and a carry.
*
*   SUM   = A XOR B
*   CARRY = A AND B
*
* Truth table:
*   A  B  | SUM CARRY
*   0  0  |  0    0
*   0  1  |  1    0
*   1  0  |  1    0
*   1  1  |  0    1
*
* (In binary: 1 + 1 = 10, so sum=0, carry=1.)
*/
function halfAdder(a, b) {
	return {
		sum: LogicGates.XOR(a, b),
		carry: LogicGates.AND(a, b)
	};
}
/**
* Full adder: adds two bits plus an incoming carry, producing a sum and a
* carry to the next column.
*
* Chain two half adders:
*   first  = halfAdder(a, b)             — adds the two input bits
*   second = halfAdder(first.sum, cin)   — adds the incoming carry
*   carry  = first.carry OR second.carry
*
* The OR is needed because at most one of the two half adders can produce
* a carry at a time (if both did, the total would be 4, which cannot fit
* in a single bit column).
*/
function fullAdder(a, b, carryIn) {
	const first = halfAdder(a, b);
	const second = halfAdder(first.sum, carryIn);
	return {
		sum: second.sum,
		carry: LogicGates.OR(first.carry, second.carry)
	};
}
/**
* Ripple-carry 8-bit adder.
*
* Eight full adders chained together, one per bit column. The carry out
* of bit N feeds the carry in of bit N+1.
*
* The final carry out is discarded — this is how every 8-bit CPU behaves.
* It is exactly what `(a + b) & 0xff` does in JavaScript.
*
* The bits are processed from LSB (index 7) to MSB (index 0) so that each
* column's carry is available for the next one.
*/
function addBytes(a, b) {
	const result = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	];
	let carry = 0;
	for (let i = 7; i >= 0; i--) {
		const r = fullAdder(a[i], b[i], carry);
		result[i] = r.sum;
		carry = r.carry;
	}
	return result;
}
//#endregion
//#region src/cpu/hardware/alu.ts
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
var ZERO = [
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
];
var ONE = [
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1
];
/**
* Subtraction via two's complement.
*
*   A - B  =  A + NOT(B) + 1
*
*/
function subBytes(a, b) {
	return addBytes(a, addBytes(byteNot(b), ONE));
}
/**
* Multiplication by repeated addition.
*
* A real 8×8 multiplier is a large array of adders (a "Wallace tree").
* We use repeated addition for the same result with far less code. Every
* step still goes through the 8-bit adder, so MUL ultimately depends on
* gates, NAND, and transistors just like ADD does.
*/
function mulBytes(a, b) {
	const times = byteToNumber(b);
	let result = ZERO;
	for (let i = 0; i < times; i++) result = addBytes(result, a);
	return result;
}
/** Unsigned comparison: is `a` strictly less than `b`? */
function byteLessThan(a, b) {
	return byteGreaterThan(b, a);
}
/**
* Unsigned comparison: is `a` strictly greater than `b`?
*
* Compare from MSB to LSB. At the first position where the bits differ,
* the value with a 1 wins. We track whether all higher bits have been
* equal so far; a 1 in `a` only counts if nothing above it already
* decided the comparison.
*/
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
	while (byteLessThan(remainder, b) === 0) remainder = subBytes(remainder, b);
	return remainder;
}
function negBytes(a) {
	return addBytes(byteNot(a), ONE);
}
function shlBytes(a, b) {
	const shift = byteToNumber(b);
	if (shift >= 8) return ZERO;
	const result = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	];
	for (let i = 0; i < 8 - shift; i++) result[i] = a[i + shift];
	return result;
}
function shrBytes(a, b) {
	const shift = byteToNumber(b);
	if (shift >= 8) return ZERO;
	const result = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	];
	for (let i = shift; i < 8; i++) result[i] = a[i - shift];
	return result;
}
/**
* The Arithmetic Logic Unit.
*
* Externally, the ALU looks the same as it always has: `exec(op, a, b)`
* takes a mnemonic and two numbers, and returns a number in the range
* 0–255. Internally, every operation routes through the layered hardware
* modules above — nothing in this file uses native arithmetic operators
* on the operands themselves.
*
* The only place native bitwise operators appear is `bitUtils`, and only
* for splitting a number into bits and back. That's a wiring concern,
* not a computation.
*/
var ALU = class {
	exec(op, a, b = 0) {
		const A = numberToByte(a);
		const B = numberToByte(b);
		switch (op) {
			case "ADD": return byteToNumber(addBytes(A, B));
			case "SUB": return byteToNumber(subBytes(A, B));
			case "MUL": return byteToNumber(mulBytes(A, B));
			case "DIV": return byteToNumber(divBytes(A, B));
			case "MOD": return byteToNumber(modBytes(A, B));
			case "AND": return byteToNumber(byteAnd(A, B));
			case "ORA": return byteToNumber(byteOr(A, B));
			case "EOR": return byteToNumber(byteXor(A, B));
			case "NOT": return byteToNumber(byteNot(A));
			case "INC": return byteToNumber(addBytes(A, ONE));
			case "DEC": return byteToNumber(subBytes(A, ONE));
			case "SHL": return byteToNumber(shlBytes(A, B));
			case "SHR": return byteToNumber(shrBytes(A, B));
			case "NEG": return byteToNumber(negBytes(A));
			case "EQU": return byteEqual(A, B);
			case "GTH": return byteGreaterThan(A, B);
			case "LTH": return byteLessThan(A, B);
			default: throw new Error(`Unknown ALU op: ${op}`);
		}
	}
};
//#endregion
//#region src/cpu/stack.ts
var Stack = class {
	constructor(size = 256) {
		_defineProperty(this, "data", void 0);
		_defineProperty(this, "sp", void 0);
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
		if (this.sp === 0) throw new Error("Stack underflow");
		else this.data[--this.sp];
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
//#endregion
//#region src/cpu/ram.ts
var RAM = class {
	constructor(size = 256) {
		_defineProperty(this, "data", void 0);
		_defineProperty(this, "usedAddresses", void 0);
		_defineProperty(this, "lastLoadedAddress", void 0);
		this.data = new Uint8Array(size);
		this.usedAddresses = /* @__PURE__ */ new Set();
		this.lastLoadedAddress = 0;
		this.addWildCardDataAt(0, 25);
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
		if (!this.isSpaceAvailable(addr)) throw new Error(`Data already exists at address ${addr}`);
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
		if (data !== void 0) return data;
		else throw new Error(`Error retrieving data at ${addr}`);
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
		if (value !== void 0) return value;
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
			if (allocatedAddresses && allocatedAddresses.has(addr)) continue;
			if (!this.usedAddresses.has(addr)) return addr;
		}
		throw new Error("RAM is full");
	}
	addDataAtFreeAddress(value) {
		const addr = this.findFreeAddress();
		this.addDataAt(addr, value);
		return addr;
	}
	validateAddress(addr) {
		if (!Number.isInteger(addr)) throw new Error(`Address must be an integer: ${addr}`);
		if (addr < 1 || addr >= this.data.length) throw new Error(`Address ${addr} is out of bounds (1-${this.data.length - 1})`);
	}
	validateByte(value) {
		if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(`RAM value must be an integer between 0 and 255: ${value}`);
	}
};
//#endregion
//#region src/cpu/io.ts
/**
* No-op output. Useful as a default constructor argument and as the base
* for tests that only care about a subset of the methods.
*/
var nullOutput = {
	writeNumber() {},
	writeChar() {},
	writeStack() {},
	writeError() {}
};
/**
* No-op display. Headless environments (CI, unit tests, a pure CLI build
* that doesn't want to print ASCII art) can use this without any DOM.
*/
var nullDisplay = {
	showTop() {},
	printStack() {}
};
//#endregion
//#region src/cpu/cpu.ts
/**
* A stack-based CPU.
*
* The CPU is a pure logic engine: it takes a bytecode program, executes it
* one opcode at a time, and reports results through two injected adapters
* (`CPUOutput` and `CPUDisplay`). 
* 
*   const cpu = new CPU(new NodeOutput(), new TerminalDisplay());
*   cpu.load(bytecode);
*   cpu.run();
*
*/
var CPU = class {
	constructor(output = nullOutput, display = nullDisplay, logger = nullLogger) {
		_defineProperty(this, "stack", void 0);
		_defineProperty(this, "alu", void 0);
		_defineProperty(this, "ram", void 0);
		_defineProperty(this, "program", void 0);
		_defineProperty(this, "pc", void 0);
		_defineProperty(this, "running", void 0);
		_defineProperty(this, "output", void 0);
		_defineProperty(this, "display", void 0);
		_defineProperty(this, "logger", void 0);
		this.stack = new Stack();
		this.alu = new ALU();
		this.ram = new RAM();
		this.program = /* @__PURE__ */ new Uint8Array(0);
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
				case 1: {
					const value = this.program[this.pc++];
					if (value === void 0) throw new Error("LDA instruction needs accompanying parameter");
					this.stack.push(value);
					break;
				}
				case 2:
					this.output.writeChar(String.fromCharCode(this.stack.pop()));
					break;
				case 3:
					this.stack.pop();
					break;
				case 4:
					this.stack.nip();
					break;
				case 5:
					this.stack.swap();
					break;
				case 6:
					this.stack.dup();
					break;
				case 7:
					this.stack.ovr();
					break;
				case 8:
					this.stack.rot();
					break;
				case 9:
					this.stack.clr();
					break;
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
				case 24:
					this.output.writeNumber(this.stack.pop());
					break;
				case 25:
					this.output.writeStack(this.stackSnapshot());
					break;
				case 26:
					this.display.printStack(this.stackSnapshot());
					break;
				case 27:
					this.display.showTop(this.stack.peek());
					break;
				case 28: {
					const addr = this.program[this.pc++];
					if (addr === void 0) throw new Error("STA instruction needs accompanying address parameter, use 0x00 if unsure");
					const value = this.stack.pop();
					if (addr === 0) this.ram.addDataAtFreeAddress(value);
					else this.ram.writeDataAt(addr, value);
					this.logger.memory(addr, value, true);
					break;
				}
				case 29: {
					const addr = this.program[this.pc++];
					if (addr === void 0) throw new Error("LDR instruction needs accompanying address parameter, use 0x00 if unsure");
					const value = addr === 0 ? this.ram.getLastLoadedValue() : this.ram.getDataAt(addr);
					this.stack.push(value);
					this.logger.memory(addr, value, false);
					break;
				}
				case 30: {
					const addr = this.program[this.pc++];
					if (addr === void 0) throw new Error("JMP instruction needs accompanying address parameter");
					if (addr >= this.program.length) throw new Error(`Invalid instruction address: 0x${addr.toString(16)}`);
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
				case 32: {
					const value = this.program[this.pc++];
					if (value === void 0) throw new Error("ECD instruction needs accompanying parameter");
					this.stack.push(value);
					break;
				}
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
				case 255:
					this.running = false;
					break;
				default: throw new Error(`Unknown opcode: 0x${(opcode ?? 0).toString(16)}`);
			}
		} catch (err) {
			this.logger.error(`At pc=0x${pcAtStart.toString(16).padStart(4, "0")} opcode=0x${opcode.toString(16).padStart(2, "0")}: ${err.message}`, err);
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
	/**
	* Copy the live stack into a plain `number[]` so that display/output
	* adapters cannot accidentally mutate the CPU's internal state by
	* holding a reference to the underlying `Uint8Array`.
	*/
	stackSnapshot() {
		const data = this.stack.getStackData();
		const sp = this.stack.getStackPointer();
		const snapshot = new Array(sp);
		for (let i = 0; i < sp; i++) snapshot[i] = data[i] ?? 0;
		return snapshot;
	}
};
//#endregion
//#region src/web/BufferOutput.ts
/**
* A CPUOutput that records everything the program prints. Useful when the
* caller wants to render output themselves (in a <pre>, an alert, or a
* terminal emulator component).
*
* `stdout` is what a terminal user would see: numbers one per line,
* characters concatenated, and stack dumps in bracket form.
*/
var BufferOutput = class {
	constructor() {
		_defineProperty(this, "stdout", "");
		_defineProperty(this, "stderr", "");
		_defineProperty(this, "numbers", []);
		_defineProperty(this, "chars", []);
		_defineProperty(this, "stacks", []);
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
//#endregion
//#region src/web/CanvasDisplay.ts
/**
* A CPUDisplay that draws to a 2D canvas. Used by the web API whenever the
* caller provides a <canvas> element, and by the desktop app's renderer.
*
* Both SHW and PRT clear the canvas first, so they show one frame at a time.
*/
var CanvasDisplay = class {
	constructor(canvas) {
		_defineProperty(this, "ctx", void 0);
		const ctx = canvas.getContext("2d");
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
//#endregion
//#region src/web/StringLogSink.ts
/**
* A LogSink that accumulates everything in memory and exposes it as a
* single string. Used by the web API when the caller asks for the debug
* log, and by tests.
*/
var StringLogSink = class {
	constructor() {
		_defineProperty(this, "lines", []);
		_defineProperty(this, "closed", false);
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
//#endregion
//#region src/web/api.ts
/**
* Assemble source text into bytecode.
*
* Never throws. Errors are reported through the `ok` / `error` fields.
*/
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
/**
* Execute already-assembled bytecode.
*
* Never throws. Errors are reported through the `ok` / `error` fields.
*/
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
/**
* Assemble then execute in a single call.
*/
function run(options) {
	const asm = assemble(options.source, { captureLog: options.captureLog });
	if (!asm.ok || !asm.bytecode) return {
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
//#endregion
export { Assembler, BufferOutput, CPU, CanvasDisplay, Logger, StringLogSink, assemble, execute, run };

//# sourceMappingURL=oxntal.es.js.map