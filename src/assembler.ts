function parseNumber(token: string): number {
    if (token.startsWith("0x")) {
        return parseInt(token, 16);
    }
    return parseInt(token, 10);
}

class Assembler {
    private opcodes: { [mnemonic: string]: number } = {
        LDA: 0x01, DCD: 0x02, POP: 0x03, NIP: 0x04, SWP: 0x05, DUP: 0x06,
        OVR: 0x07, ROT: 0x08, CLR: 0x09,
        ADD: 0x10, SUB: 0x11, MUL: 0x12, DIV: 0x13, MOD: 0x14,
        AND: 0x15, ORA: 0x16, EOR: 0x17, NOT: 0x18,
        INC: 0x19, DEC: 0x1A, SHL: 0x1B, SHR: 0x1C, NEG: 0x1D,
        OUT: 0x20, LOG: 0x21, PRT: 0x22, SHW: 0x23,
        BRK: 0xFF,
    };

    assemble(source: string): number[] {
        const bytecode: number[] = [];
        const lines = source.split("\n");
        for (let line of lines) {
            line = line.split(";")[0].trim();  // remove comments, trim
            if (line === "") continue;
            const tokens = line.split(/\s+/);
            const mnemonic = tokens[0].toUpperCase();
            const opcode = this.opcodes[mnemonic];
            if (opcode === undefined) throw new Error(`Unknown instruction: ${mnemonic}`);
            bytecode.push(opcode);
            if (mnemonic === "LDA") {
                const value = parseNumber(tokens[1]);
                bytecode.push(value & 0xFF);
            }
        }
        return bytecode;
    }
}