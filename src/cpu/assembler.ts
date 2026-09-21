// --------------------------------------------------------- //
// ASSEMBLER.ts
// --------------------------------------------------------- //

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

import Logger, { nullLogger } from "./logger.js";

function parseNumber(token: string): number {
    if (/^(?:0[xX][0-9a-fA-F]+)$/.test(token)) return parseInt(token, 16);
    if (/^(?:0[bB][01]+)$/.test(token)) return parseInt(token.slice(2), 2);
    return parseInt(token, 10);
}

function isValidNumber(
    token: string,
    type: "hex" | "dec" | "bin" | "all" = "all",
): boolean {
    switch (type) {
        case "hex": return /^(?:0[xX][0-9a-fA-F]+)$/.test(token);
        case "bin": return /^(?:0[bB][01]+)$/.test(token);
        case "dec": return /^(?:[0-9]+)$/.test(token);
        default:    return /^(?:[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/.test(token);
    }
}

export default class Assembler {
    private readonly opcodes: Readonly<Record<string, number>> = {
        LDA: 0x01, DCD: 0x02, POP: 0x03, NIP: 0x04, SWP: 0x05, DUP: 0x06,
        OVR: 0x07, ROT: 0x08, CLR: 0x09,
        ADD: 0x0A, SUB: 0x0B, MUL: 0x0C, DIV: 0x0D, MOD: 0x0E,
        AND: 0x0F, ORA: 0x10, EOR: 0x11, NOT: 0x12,
        INC: 0x13, DEC: 0x14, SHL: 0x15, SHR: 0x16, NEG: 0x17,
        OUT: 0x18, LOG: 0x19, PRT: 0x1A, SHW: 0x1B,
        STA: 0x1C, LDR: 0x1D,
        JMP: 0x1E, JCN: 0x1F,
        ECD: 0x20, EQU: 0x21, GTH: 0x22, LTH: 0x23, VAR: 0x24,
        BRK: 0xFF,
    };

    /**
     * Instructions that consume the next token as an inline parameter.
     * Any instruction here adds 2 bytes to the bytecode stream; every other
     * instruction adds 1.
     */
    private readonly opcodesWithParameters: ReadonlySet<string> = new Set([
        "LDA", "STA", "LDR", "JMP", "ECD", "JCN",
    ]);

    /**
     * Where variable allocation starts. Address 0 is reserved by the CPU's
     * STA/LDR opcodes as "auto-allocate", so we start at 1.
     */
    private readonly firstDataAddress = 1;
    private readonly dataAddressLimit = 256;
    private readonly logger: Logger;

    constructor(logger: Logger = nullLogger) {
        this.logger = logger;
    }

    // ---------------------------------------------------------------------
    // Public entry point
    // ---------------------------------------------------------------------

    assemble(source: string): number[] {
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
    private stripComments(tokens: string[]): string[] {
        const result: string[] = [];
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
    private expandMultiInstruction(tokens: string[]): string[] {
        const result: string[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;

            if (token !== '"') {
                result.push(token);
                continue;
            }

            const instruction = result[result.length - 1];
            if (
                instruction === undefined ||
                !this.opcodesWithParameters.has(instruction)
            ) {
                throw new Error(
                    `Unexpected '"' at token ${i}: previous token ` +
                    `"${instruction}" is not a parameterised instruction`,
                );
            }

            // Remove the instruction: we will re-emit it before each value.
            result.pop();

            let closed = false;
            i++;
            while (i < tokens.length) {
                const value = tokens[i]!;
                if (value === '"') { closed = true; break; }
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
    private expandRepeatedInstruction(tokens: string[]): string[] {
        const result: string[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;

            if (token !== "*") {
                result.push(token);
                continue;
            }

            const instruction = result[result.length - 1];
            const countToken = tokens[i + 1];

            if (
                instruction === undefined ||
                !(instruction in this.opcodes)
            ) {
                throw new Error(
                    `Invalid repeat at token ${i}: ` +
                    `"${instruction}" is not an instruction`,
                );
            }

            if (
                countToken === undefined ||
                !isValidNumber(countToken, "dec")
            ) {
                throw new Error(
                    `Invalid repeat count at token ${i + 1}: "${countToken}"`,
                );
            }

            const count = parseNumber(countToken);
            result.pop();
            for (let j = 0; j < count; j++) result.push(instruction);
            i++; // skip the count token
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
    private expandShorthand(tokens: string[]): string[] {
        const result: string[] = [];
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
    private scan(tokens: string[]): {
        labels: Map<string, number>;
        vars: Map<string, number>;
    } {
        const labels = new Map<string, number>();
        const vars = new Map<string, number>();

        let nextDataAddress = this.firstDataAddress;
        let bytecodeAddress = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;

            // `VAR name` — allocates a data address for `name`.
            if (token === "VAR") {
                const name = tokens[i + 1];
                if (name === undefined) {
                    throw new Error(`VAR at token ${i} is missing a name`);
                }
                this.assertUnique(name, labels, vars);
                if (nextDataAddress >= this.dataAddressLimit) {
                    throw new Error("Out of data addresses (256 max)");
                }
                vars.set(name, nextDataAddress);
                this.logger.varAllocated(name, nextDataAddress);
                nextDataAddress++;
                i++; // skip name
                continue;
            }

            // `@name` — same as `VAR name`.
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

            // `>name` — a code label pointing at the next instruction.
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

            // Instruction — advance the bytecode counter.
            if (token in this.opcodes) {
                bytecodeAddress += 1;
                if (this.opcodesWithParameters.has(token)) {
                    bytecodeAddress += 1;
                    i++; // skip parameter
                }
            }
        }

        return { labels, vars };
    }

    // ---------------------------------------------------------------------
    // Pass 5: emit bytecode
    // ---------------------------------------------------------------------
    private emit(
        tokens: string[],
        labels: Map<string, number>,
        vars: Map<string, number>,
    ): number[] {
        const bytecode: number[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;

            // Declarations produce no bytecode.
            if (token === "VAR") { i++; continue; }
            if (token.startsWith("@") || token.startsWith(">")) continue;

            const opcode = this.opcodes[token];
            if (opcode !== undefined) {
                bytecode.push(opcode);

                if (this.opcodesWithParameters.has(token)) {
                    const param = tokens[i + 1];
                    if (param === undefined) {
                        throw new Error(
                            `${token} at token ${i} is missing a parameter`,
                        );
                    }
                    bytecode.push(this.resolveParameter(token, param, labels, vars));
                    i++; // skip parameter
                }
                continue;
            }

            throw new Error(
                `Unknown token at position ${i}: "${token}"`,
            );
            
        }

        return bytecode;
    }

    private resolveParameter(
        mnemonic: string,
        param: string,
        labels: Map<string, number>,
        vars: Map<string, number>,
    ): number {
        // ECD takes a character literal, not a number.
        if (mnemonic === "ECD") {
            return param.charCodeAt(0) & 0xFF;
        }

        const labelAddr = labels.get(param);
        if (labelAddr !== undefined){ 
            this.logger.labelReferenced(param, labelAddr);
            return labelAddr & 0xFF;
        }

        const varAddr = vars.get(param);
        if (varAddr !== undefined){
            this.logger.varReferenced(param, varAddr);
            return varAddr & 0xFF;
        }
        if (isValidNumber(param)) return parseNumber(param) & 0xFF;

        throw new Error(
            `Invalid parameter "${param}" for ${mnemonic}: ` +
            `expected a number, label, or variable`,
        );
    }

    private assertUnique(
        name: string,
        labels: Map<string, number>,
        vars: Map<string, number>,
    ): void {
        if (labels.has(name)) {
            throw new Error(`Duplicate label: ${name}`);
        }
        if (vars.has(name)) {
            throw new Error(`Duplicate variable: ${name}`);
        }
    }
}