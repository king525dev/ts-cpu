export default class ALU {
    exec(op: string, a: number, b: number = 0): number {
        switch (op) {
        case "ADD": return (a + b) & 0xFF;
        case "SUB": return (a - b) & 0xFF;
        case "MUL": return (a * b) & 0xFF;
        case "DIV": return b === 0 ? 0 : Math.floor(a / b) & 0xFF;
        case "MOD": return b === 0 ? 0 : (a % b) & 0xFF;
        case "AND": return (a & b) & 0xFF;
        case "ORA": return (a | b) & 0xFF;
        case "EOR": return (a ^ b) & 0xFF;
        case "NOT": return (~a) & 0xFF;
        case "INC": return (a + 1) & 0xFF;
        case "DEC": return (a - 1) & 0xFF;
        case "SHL": return (a << b) & 0xFF;
        case "SHR": return (a >> b) & 0xFF;
        case "NEG": return (-a) & 0xFF;
        case "EQU": return (a === b ? 1 : 0)
        case "GTH": return (a > b ? 1 : 0)
        case "LTH": return (a < b ? 1 : 0)
        default: throw new Error(`Unknown ALU op: ${op}`);
        }
    }
}