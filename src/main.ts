import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `// Testing if this Compiles with Comments and Labels //
LDA 10
DUP
>loop
OUT
LDA 10
ADD // Add 10 again then duplicate //
DUP
JMP loop
BRK
`;


const assembler = new Assembler();
const bytecode = assembler.assemble(source);
const cpu = new CPU();
cpu.load(bytecode);
cpu.run();