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
        JMP: 0x1E, JCN: 0x1F, 
        ECD: 0x20, EQU: 0x21, GTH: 0X22, LTH: 0X23,
        BRK: 0xFF,
    };

    private opcodesWithParameters: string[]  = [
        "LDA", 
        "STA",
        "LDR",
        "JMP",
        "ECD",
        "JCN"
    ]

    assemble(source: string): number[] {
        const bytecode: number[] = [];
        const symbolTable: { [label: string]: number }  = {};
        let tokens = source.trim().split(/\s+/).filter(
            token => token !== '' || typeof(token) !== undefined || typeof(token) !== null
        );

        // First Pass: Remove Comments and Create Symbol Table
        //Remove Comments
        if (tokens.includes('//')){
            let count = 0;
            let position = 0;

            while ((position = tokens.indexOf("//", position)) !== -1) {
                count++;
                position += 1;
            }

            const commentCount = Math.floor(count / 2);

            for (let i = 0; i < commentCount; i++) {
                const start = tokens.indexOf("//");
                if (start === -1) break;

                const end = tokens.indexOf("//", start + 2);
                if (end === -1) break;

                tokens = tokens.slice(0, start).concat(tokens.slice(end + 1));
            }
        }

        // Generate Symbol Table
        for(let i = 0; i < tokens.length; i++){
            let token = tokens[i]
            if(token !== undefined){
                if(token.startsWith(">")){
                    const labelName = token.slice(1, token.length);
                    symbolTable[labelName] = i++;
                }
            }
        }

        // Second Pass: Replace labels with addresses
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token !== undefined) {
                const address = symbolTable[token];
                if (address !== undefined) {
                    tokens[i] = address.toString();
                } 
            }
        }

        // Third Pass: Assembly
        for(let i = 0; i < tokens.length; i++){
            let token = tokens[i]
            if(token !== undefined){
                if (token in this.opcodes){
                    const mnemonic = token.toUpperCase();
                    const opcode = this.opcodes[mnemonic];
                    if (opcode === undefined) throw new Error(`Unknown instruction: ${mnemonic}`);
                    bytecode.push(opcode);
                    if (this.opcodesWithParameters.includes(mnemonic)) {
                        const indexOfValue = tokens.indexOf(token, i) + 1;
                        if (tokens[indexOfValue] && isValidNumber(tokens[indexOfValue]) && mnemonic !== "ECD"){
                            const value = parseNumber(tokens[ indexOfValue ]);
                            bytecode.push(value & 0xFF);
                        } else if (tokens[ indexOfValue ] && mnemonic == "ECD") {
                            const value = tokens[ indexOfValue ].charCodeAt(0);
                            bytecode.push(value & 0xFF);
                        }
                    } 
                }
            }
        }

        return bytecode;
    }
}