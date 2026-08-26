function parseNumber(token: string): number {
    if (/^(?:0[xX][0-9a-fA-F]+)$/.test(token)) {
        return parseInt(token, 16); // Parse Hex
    } else if (/^(?:0[bB][01]+)$/.test(token)){
        return parseInt(token, 2); // Parse Binary
    }
    return parseInt(token, 10);
}

function isValidNumber(char: string): boolean {
    // Checks if it is a decimal, hex or binary number
    return /^(?:[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/.test(char);
}

export default class Assembler {
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

            if (line.includes(';')){
                const end = line.indexOf(';');
                line = line.slice(0, end); // remove comments
            }

            line = line.trim();
            if (line === "" || typeof line === undefined) continue;

            const tokens = line.split(/\s+/);

            for (const token of tokens){
                if (token in this.opcodes){
                    const mnemonic = token.toUpperCase();
                    const opcode = this.opcodes[mnemonic];
                    if (opcode === undefined) throw new Error(`Unknown instruction: ${mnemonic}`);
                    bytecode.push(opcode);
                    if (mnemonic === "LDA") {
                        const indexOfValue = tokens.indexOf(token) + 1;
                        if (tokens[indexOfValue] && isValidNumber(tokens[indexOfValue])){
                            const value = parseNumber(tokens[ indexOfValue ]);
                            bytecode.push(value & 0xFF);
                        }
                    }
                }
            }
        }

        return bytecode;
    }
}