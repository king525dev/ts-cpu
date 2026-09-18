import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `
@num
@max

LDA 5
STA max

LDA 0
STA num

>loop
LDA " 100 108 114 111 87 111 108 108 101 104 95 "
DCD * 10
LDA num
INC
DUP
OUT
LDA max
LTH
JCN loop

BRK
`;

const cpu = new CPU();
const assembler = new Assembler();
const bytecode = assembler.assemble(source);
cpu.load(bytecode);
cpu.run();