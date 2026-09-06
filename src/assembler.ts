function parseNumber(token: string): number {
    if (/^(?:0[xX][0-9a-fA-F]+)$/.test(token)) {
        return parseInt(token, 16); // Parse Hex
    } else if (/^(?:0[bB][01]+)$/.test(token)){
        return parseInt(token, 2); // Parse Binary
    }
    return parseInt(token, 10);
}

function isValidNumber(char: string, type?: "hex" | "dec" | "bin" | "all"): boolean {
    // Checks if it is a decimal, hex or binary number
    switch (type){
        case "hex":
            return /^(?:0[xX][0-9a-fA-F]+)$/.test(char);
        case "bin":
            return /^(?:0[bB][01]+)$/.test(char);
        case "dec":
            return /^(?:[0-9]+)$/.test(char);
        default:
            return /^(?:[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/.test(char);
    }
}

export default class Assembler {
    private opcodes: { [mnemonic: string]: number } = {
        LDA: 0x01, DCD: 0x02, POP: 0x03, NIP: 0x04, SWP: 0x05, DUP: 0x06,
        OVR: 0x07, ROT: 0x08, CLR: 0x09,
        ADD: 0x0A, SUB: 0x0B, MUL: 0x0C, DIV: 0x0D, MOD: 0x0E,
        AND: 0x0F, ORA: 0x10, EOR: 0x11, NOT: 0x12,
        INC: 0x13, DEC: 0x14, SHL: 0x15, SHR: 0x16, NEG: 0x17,
        OUT: 0x18, LOG: 0x19, PRT: 0x1A, SHW: 0x1B, STA: 0x1C, LDR: 0x1D,
        BRK: 0xFF,
    };

    private opcodesWithParameters: string[]  = [
        "LDA", 
        "STA",
        "LDR",
        "JMP",
    ]

    assemble(source: string): number[] {
        const bytecode: number[] = [];
        const symbolTable: { [label: string]: number }  = {}
        const lines = source.split("\n");

        for (let line of lines) {

            //Remove Comments
            if (line.includes('//')){
                let count = 0;
                let position = 0;

                while ((position = line.indexOf("//", position)) !== -1) {
                    count++;
                    position += 2;
                }

                const commentCount = Math.floor(count / 2);

                for (let i = 0; i < commentCount; i++) {
                    const start = line.indexOf("//");
                    if (start === -1) break;

                    const end = line.indexOf("//", start + 2);
                    if (end === -1) break;

                    line = line.slice(0, start) + line.slice(end + 2);
                }
            }

            line = line.trim();
            if (line === "" || typeof line === undefined) continue;

            const tokens = line.split(/\s+/);

            // First Pass (Symbol table Generation)
            for(let i = 0; i < tokens.length; i++){
                    if(tokens[i]?.startsWith(">")){
                        const labelName = line.slice(1, tokens[i]?.length);
                        symbolTable[labelName] = i++;
                    }
            }

            // Second Pass (Replace labels with addresses)
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];

                if (token) {
                    const address = symbolTable[token];
                    if (address) {
                        tokens[i] = address.toString();
                    } 
                }
            }



            // Third Pass (Assembly)
            for (const token of tokens){
                if (token in this.opcodes){
                    const mnemonic = token.toUpperCase();
                    const opcode = this.opcodes[mnemonic];
                    if (opcode === undefined) throw new Error(`Unknown instruction: ${mnemonic}`);
                    bytecode.push(opcode);
                    if (this.opcodesWithParameters.includes(mnemonic)) {
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