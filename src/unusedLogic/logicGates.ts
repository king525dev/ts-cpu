function AND(a: number, b: number): number {
    return a & b;         
}
function OR(a: number, b: number): number {
    return a | b;
}
function XOR(a: number, b: number): number {
    return a ^ b;
}
function NOT(a: number): number {
    return (~a) & 0x01;    
}

function fullAdder(a: number, b: number, carryIn: number): [number, number] {
    const sum1 = XOR(a, b);
    const sum = XOR(sum1, carryIn);
    const carryOut = OR(AND(a, b), AND(sum1, carryIn));
    return [sum & 0x01, carryOut & 0x01];
}

function add8bit(num1: number, num2: number): number {
    let result = 0;
    let carry = 0;
    for (let i = 0; i < 8; i++) {
        const bitA = (num1 >> i) & 1;
        const bitB = (num2 >> i) & 1;
        const [sumBit, carryOut] = fullAdder(bitA, bitB, carry);
        result |= (sumBit << i);
        carry = carryOut;
    }
    return result & 0xFF;   
}