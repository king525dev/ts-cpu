# OXN — Concepts

> **You are here because:** you want to understand how this CPU works.
> **You may also want:** the [tutorial](tutorial.md) — write your first
> program — or the [reference](reference.md) — every opcode and rule.

This document explains the why behind OXN. If you just want to run
programs, the [tutorial](tutorial.md) is a better place to start. If you
want to look up an opcode, the [reference](reference.md) has you covered.

---

## 1. The premise

A CPU is a machine that reads a program and does what it says. That's
the whole thing. Every register, every opcode, every flag exists to
make that loop possible.

> I got into computers because I was curious of how it worked. Now I'm
> closer.

That quote is the reason this project exists. You can't really believe
"everything is a computer" until you've built one, all the way down,
without cheating. OXN is that build. There is no point at which an
arithmetic operation falls through to JavaScript's `+`, `&`, or `^`.
Every sum the machine performs is carried out by switches opening and
closing.

It is heavily inspired by the [Uxn/Varvara ecosystem](https://100r.co/site/uxn.html)
and its assembly language [Uxntal](https://wiki.xxiivv.com/site/uxntal.html).
Uxn showed that a small enough stack machine could run real programs —
editors, games, drawing tools — on almost any hardware. OXN is a much
younger sibling: smaller, simpler, less useful, and built mainly to
understand how Uxn might work.

## 2. The seven layers

```
    ┌───────────────────────────────────────────────┐
    │  transistors   NMOS and PMOS as switches      │
    ├───────────────────────────────────────────────┤
    │  NAND          the only primitive gate        │
    ├───────────────────────────────────────────────┤
    │  logic gates   NOT, AND, OR, XOR from NAND    │
    ├───────────────────────────────────────────────┤
    │  adders        half, full, 8-bit ripple       │
    ├───────────────────────────────────────────────┤
    │  ALU           arithmetic and logic           │
    ├───────────────────────────────────────────────┤
    │  CPU           fetch, decode, execute         │
    ├───────────────────────────────────────────────┤
    │  OXNTAL        the language                   │
    └───────────────────────────────────────────────┘
```

Each layer knows only about the one below it. The CPU has no idea that
`ADD` is eight full adders chained together. The ALU has no idea that
a `NAND` is four transistors. That is the point of a layer — it lets
you build up without having to remember down.

You could stop at any layer and have something useful. Stop at the ALU
and you have a calculator. Stop at the CPU and you have an interpreter.
Stop at OXNTAL and you have a small assembly language. The layers
above don't require the layers below to be the way they are — they
only require them to expose the right interface. That's what
abstraction means in practice.

## 3. Transistors

A transistor is a switch with a remote control. It has three terminals:
a gate, and the two ends of a channel. Whether current flows
through the channel depends on the gate.

Two kinds.

- **N-type (NMOS).** Conducts when the gate is high (`1`).
- **P-type (PMOS).** Conducts when the gate is low (`0`).

The two types are complements of each other. That complementarity is
not a curiosity — it is the reason CMOS chips burn almost no power at
rest. For any input, exactly one of the two transistor networks
conducts, and the other does not. No current flows from the power rail
to ground, because there is never a continuous path through both.

OXN models transistors as `NTypeTransistor` and `PTypeTransistor` with
a gate and a `conducts()` method. A real MOSFET has a threshold
voltage, a drain-source resistance that varies with gate voltage, a
gate capacitance, a leakage current. All of that is thrown away. What
remains is the digital abstraction, which is what the CPU actually
depends on. There is no way to say "the voltage on this gate is 2.3V,
so the transistor is 78% on." A bit is `0` or `1`, and a transistor
either conducts or it doesn't.

## 4. NAND

You need one gate to start with. The industry picked NAND. Two reasons.

**Reason one: NAND is cheap in CMOS.** Four transistors. Two PMOS in
parallel on the pull-up side, two NMOS in series on the pull-down side.
The pull-up network conducts if either input is low, pulling the output
high. The pull-down network conducts only if both inputs are high,
pulling the output low. Exactly one of them conducts at any time, as
CMOS requires. The full layout is drawn in a comment in
`src/cpu/hardware/nand.ts` if you want to see it.

**Reason two: NAND is functionally complete.** Any boolean function
can be built from NAND gates alone. This is a theorem, not a
coincidence. In OXN we take it seriously: `logicGates.ts` is not
allowed to use native `&`, `|`, `^`, or `~`. Every gate is a call to
`NAND.gate(a, b)`. If a bug ever creeps in and a native operator slips
through, the file's promise to be transistor-derived is broken, and
the file is wrong.

That restriction is why the whole tower holds. It is the one rule that
makes the "from transistors upward" claim provable rather than
decorative.

## 5. Logic gates

From NAND you get everything.

- **NOT** — tie both inputs together: `NAND(a, a)`.
- **AND** — a NAND followed by a NOT. Two NANDs total.
- **OR** — De Morgan's law. `NOT(NOT(a) AND NOT(b))`. Three NANDs.
- **XOR** — four NANDs, in a small criss-cross pattern.

That's it. Four functions, twelve NANDs, ten lines of TypeScript.
Every arithmetic and logical operation the CPU performs is built on
top of these.

The `logicGates.ts` file is worth reading in full. It's less than
fifty lines, and it contains the entire vocabulary of boolean
computation.

## 6. Adders

Addition is the first thing that stops looking like a gate and starts
looking like arithmetic.

A half adder takes two bits and produces a sum and a carry:

```
    A  B  │ SUM CARRY
    0  0  │  0    0
    0  1  │  1    0
    1  0  │  1    0
    1  1  │  0    1
```

`1 + 1 = 10` in binary, so the sum is `0` and the carry is `1`. The
sum is `XOR(A, B)` — one or the other, not both. The carry is
`AND(A, B)` — both. Two gates, and you can add two bits.

A **full adder** extends this to three inputs: `a`, `b`, and an
incoming carry from a less significant column. Chain two half adders
and OR their carries. That's it. A full adder is three gates stacked
in the obvious way.

An **8-bit adder** is eight full adders in a row. The carry out of bit
0 feeds the carry in of bit 1. The carry out of bit 1 feeds bit 2. And
so on. This is called a **ripple-carry adder**, because the carry
ripples through the chain. It's the slowest possible design for an
8-bit adder — the worst-case delay is eight full adders deep — and
it's the one OXN uses, because it's the easiest to read.

When you write `LDA 10 LDA 20 ADD`, the two numbers travel down through
eight full adders, each built from two half adders, each built from
XOR and AND, each built from NANDs, each built from four transistors.
The result climbs back up. Every one of those layers is in a file you
can read.

## 7. The ALU

The Arithmetic Logic Unit is the top of the hardware stack. From
outside, it exposes one method:

```ts
alu.exec("ADD", 10, 20)   // → 30
```

Inside, it converts `10` and `20` into arrays of eight bits, runs the
appropriate circuit, and converts the result back into a number.

Everything below the ALU works on `Bit` (`0 | 1`). Everything above
works on `number` (0–255). The conversion happens in exactly one file,
`bitUtils.ts`, and nowhere else. `bitUtils.ts` is also the only file
in the hardware layer permitted to use native bitwise operators, and
only for the mechanical job of splitting a byte into bits and
reassembling it. That's a wiring concern, not a computation.

The ALU does not use the CPU. It does not use the stack. It does not
know that a program exists. If you want a calculator, you can take
`src/cpu/hardware/` and drop the rest.

## 8. Subtraction and two's complement

There is no subtractor in OXN. There doesn't need to be.

`A − B` is the same as `A + NOT(B) + 1`. This is called two's
complement subtraction, and it is how nearly every real CPU does it.
The same 8-bit adder that computes `10 + 20` also computes `20 − 10`,
with an inverter on one input and a `+1` on the carry-in.

It's worth sitting with this for a moment. Subtraction, which feels
like a fundamentally different operation from addition, is done by
addition with a bit of creative rewriting. One adder, two operations.
That kind of reuse is what makes hardware design tractable at all.

The same trick shows up all over OXN:

- `NEG` is `NOT(a) + 1`.
- `INC` is `a + 1`, one operand hardwired to `ONE`.
- `DEC` is `a - 1`, which is `a + NOT(ONE) + 1`.

Every one of them routes through the same eight adders. The
`hardware/alu.ts` file is short because of it.

## 9. Why a stack machine?

Two ways to design a CPU.

**Register machines.** (x86, ARM, MIPS, RISC-V.) Instructions name
registers. `ADD r1, r2` adds two register values. Fast, but you need
sixteen or thirty-two registers, a compiler that does register
allocation, and a calling convention that says which registers
survive a function call and which don't.

**Stack machines.** (Forth, Uxn, OXN, JVM bytecode, WebAssembly in
places.) Instructions act on the top of a stack. `ADD` pops two
values, adds them, pushes the result. No registers to name. The
encoding is trivially compact — most instructions are one byte.

OXN is a stack machine because stack machines are easier to build and
easier to reason about. There is no register allocation, no calling
convention, no "which register holds what" to remember. The stack is
the only place intermediate values live, and the instruction set is
small enough to fit on a postcard.

The cost is performance. In a register machine, three or four
operations can be in flight at once, because they use different
registers. In a stack machine, everything funnels through the top of
the stack, and instructions serialise behind each other. For a CPU
that fits in a few thousand lines of TypeScript, that cost is
invisible.

## 10. The stack

256 bytes. A `Uint8Array`. A stack pointer that starts at 0 and grows
upward.

The stack pointer is the index of the next free slot. Pushing stores
a byte at `data[sp]` and increments `sp`. Popping decrements `sp` and
returns `data[sp]`. Those two lines are the whole data structure.

There is no bounds checking at the machine level. Pushing when the
stack is full and popping when it's empty will silently corrupt
memory. Every assembly programmer needs to know this. The CPU is not
going to save you, because a real CPU doesn't save you, and the point
of OXN is to be a real CPU.

There are helper operations on the stack — `DUP`, `SWP`, `OVR`, `ROT`,
`NIP` — that manipulate the top few values without involving RAM. They
exist because on a stack machine, you often need to reorder values
without ever storing them. `DUP` is the most common; it lets an
instruction use a value without consuming it.

## 11. RAM

256 bytes. Address 0 is special: `STA 0` means "put this value at the
next free address", and `LDR 0` reads back whatever was stored that
way. Every other address is used directly.

Variables declared with `VAR x` or `@x` are allocated starting at
address 1, going up. The assembler does the allocation at assembly
time, so by the time the CPU runs, every `STA x` and `LDR x` has
already been replaced with a concrete address. There is no runtime
symbol table, no lookup, no name resolution. Just bytes.

RAM is deliberately small. 256 bytes is enough to hold a handful of
variables and a small buffer. It is not enough to hold a string of
any length, a sprite, or a map. If OXN ever grows, RAM will be the
first thing to expand.

## 12. The program counter

The PC is a byte index into the program. It points at the next
instruction to be fetched, not the current one.

Every instruction increments the PC by one for the opcode, and by
another one if the instruction takes a parameter. `LDA 5` is two
bytes: `0x01 0x05`. After it runs, the PC has advanced by two. After
`DUP` — one byte, no parameter — it advances by one.

`JMP` and `JCN` are the only instructions that change the PC to
something other than "the next byte". They set it to an absolute
address, which the assembler has already resolved. Since addresses are
stored as single bytes, an OXN program is limited to 256 bytes of
bytecode. That's a real limit, and it's the first thing to fix if the
language ever grows.

## 13. Fetch, decode, execute

Every instruction goes through the same three phases. This is the
heart of the machine, and it's about thirty lines of TypeScript in
`cpu.ts`.

**Fetch.** Read `program[pc]`. That byte is the opcode. Increment PC.

**Decode.** Look at the opcode. `0x01`? We're doing `LDA`. `0x0A`?
`ADD`. `0xFF`? `BRK`.

**Execute.** Do the thing. Maybe pop from the stack, maybe push,
maybe read `program[pc]` for a parameter, maybe jump. For most
instructions, execution is three or four lines.

The CPU logs each step when a `Logger` is attached. Run with
`--trace` and you get one line per instruction:

```
    [21.09.26-22:44] [pc=0x0000 op=0x01 sp=1] Stack: [ 05 ] {3ms}
    [21.09.26-22:44] [pc=0x0002 op=0x18 sp=0] Stack: [  ] {3ms}
```

Read that as: at byte 0 we executed opcode `0x01` (`LDA`), and after
it ran the stack had one byte on it. Then at byte 2 we executed `0x18`
(`OUT`), and after it ran the stack was empty.

The trace is the whole machine, opened up. There is no hidden state.
What you see is what the CPU sees.

## 14. Design decisions

A few things that were deliberate, and a few that weren't.

**8-bit, not 16.** Every value fits in a byte. Every address fits in a
byte. The whole system is small enough to hold in your head. Sixteen
bits would have doubled the gate count of every adder and comparator,
for no benefit to a project that will never be fast.

**Stack machine, not register machine.** Fewer instructions, simpler
encoding, nothing to allocate. The cost is performance, and we don't
care about performance here.

**Two's complement subtraction.** Zero extra hardware. The adder
already exists, and inverting one input plus a carry-in is free.

**The ALU is standalone.** It has no dependency on the CPU, the stack,
or the assembler. If you want to reuse it, you can.

**The CPU has no I/O.** It calls four methods on `CPUOutput` and two
on `CPUDisplay`. Somebody else provides those objects. The CPU doesn't
know if it's talking to a terminal, a canvas, or a test harness.

**Program addresses are one byte.** Which means programs top out at
256 bytes. This is the first thing to fix if OXN ever grows.

**Comments are paired `//` markers.** This is a bug, or at least a
quirk. Most assemblers treat `//` as "to the end of the line". OXN
treats it as a toggle: everything between the first and second `//` is
discarded, and an odd number is an error. It works, but it surprises
people. It's on the list.

**Labels resolve to bytecode addresses, not token indices.** This is
the fix for a subtle bug that existed in an earlier version of the
assembler. If a label's address is computed as a token index, it drifts
the moment any instruction takes two bytes. The current version walks
the token stream and counts bytes, which is the only correct way to
do it.

## 15. The adapter pattern

The CPU does not know where its output goes. It calls methods on two
interfaces:

```ts
interface CPUOutput {
    writeNumber(value: number): void;
    writeChar(char: string): void;
    writeStack(values: readonly number[]): void;
    writeError(message: string): void;
}

interface CPUDisplay {
    showTop(value: number): void;
    printStack(values: readonly number[]): void;
}
```

Somebody else provides concrete implementations. There are three:

- **CLI.** `NodeOutput` writes numbers and characters to
  `process.stdout`, errors to `process.stderr`. `TerminalDisplay`
  draws ASCII bars with `█`.
- **Web.** `BufferOutput` accumulates strings in memory. The API
  returns them at the end.
- **Desktop.** Same as web, running inside Electron.

The pattern is called dependency inversion: the CPU depends on an
interface it defines, not on the environment it runs in. If you want
OXN to talk to a serial port, an LED matrix, or a Discord bot, you
write a new adapter and pass it in. You don't touch the CPU. You don't
touch the assembler. You don't touch anything else.

This is what makes OXN reusable. The core is a pure logic engine. All
the platform-specific mess lives at the edges, in files that are
rarely more than fifty lines long.

## 16. The logger

Same idea, one level up. The CPU also emits a debug log — one line
per instruction, one line per jump, one line per RAM access. Where
does the log go? Same answer: whatever sink you provide.

The logger itself owns the format. The sink owns the destination.
`FileLogSink` writes to disk. `StringLogSink` accumulates in memory.
A `nullSink` discards everything.

Logging is opt-in. If you construct the CPU with no logger, it uses
the null sink, and every `logger.info(...)` call is a no-op. The CPU
does not slow down because logging is off.

The interesting thing about the sink is how small it is. It has one
method, `write(line)`, and an optional `close()`. That's the whole
contract. Any destination you can imagine — a file, a network socket,
a database, an in-memory ring buffer — is expressed in those two
methods.

## 17. What OXN is not

A few things it would be easy to assume, and are false.

It is not fast. The gate-level ALU means `ADD` is roughly eight
hundred function calls through the transistor layer. A native `+`
would be one CPU instruction. The trade is worth making because the
point is understanding, not speed.

It is not complete. There are no functions, no interrupts, no signed
integers, no floating point, no linker. Programs are limited to 256
bytes. RAM is limited to 256 bytes. The stack is limited to 256 bytes.
These are all fixable, but they haven't been fixed.

It is not a compiler. OXNTAL is an assembler. Each line of source maps
to one or two bytes. There is no optimisation pass, no type checking,
no semantic analysis beyond label and variable resolution.

It is not a Uxn emulator. It is inspired by Uxn, and the shape of the
instruction set is similar, but the opcodes are different, the memory
model is different, and the assembly language is different. A Uxn ROM
will not run on OXN, and an OXN program will not run on Uxn.

## 18. Where to go next

If you want to use OXN, read the [tutorial](tutorial.md).

If you want to extend OXN — add instructions, add RAM, add a
frontend — read the [reference](reference.md) first, then come back
here for the design rationale.

If you want to understand OXN, read the code. It's small enough to
read end-to-end in an afternoon. Start at `src/cpu/cpu.ts` and follow
the switch statement. Each case tells you what one instruction does.
Then follow any of them downward — `ADD` leads to `hardware/alu.ts`,
which leads to `hardware/adders.ts`, which leads to
`hardware/logicGates.ts`, which leads to `hardware/nand.ts`, which
leads to `hardware/transistor.ts`. That's the whole machine, all the
way down.

Go read it.