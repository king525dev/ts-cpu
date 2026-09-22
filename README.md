# OXN

A stack machine, and the assembler that feeds it.

You can run OXN from a terminal, in a browser, or inside a desktop app.

- **[Tutorial](docs/tutorial.md)** — I want to write my first program.
- **[Concepts](docs/concepts.md)** — I want to understand how this CPU works.
- **[Reference](docs/reference.md)** — What exactly does opcode `0x1A` do?

---

> I got into computers because I was curious of how it worked. Now I'm closer.

OXN started as a question. Every CPU is a stack of abstractions, and every
abstraction hides the one below it. I wanted to take the lid off, all the
way down — from transistors, to NAND gates, to the ALU, to the assembler.
You are looking at the result.

It is heavily inspired by the [Uxn/Varvara ecosystem](https://100r.co/site/uxn.html)
and its assembly language [Uxntal](https://wiki.xxiivv.com/site/uxntal.html).

## What it is

- An 8-bit stack machine, written in TypeScript.
- 256 bytes of RAM, 256 bytes of stack.
- 40 instructions, all built on top of a gate-level ALU.
- An assembler called OXNTAL.
- Three frontends: CLI, browser, desktop.

## What it is not

- Not a physical CPU.
- Not a compiler.
- Not finished.

## Try it

```sh
oxn programs/hello.oxn
```

If that printed `Hi!` you already have a working machine.
[Read the tutorial if you want to write your own →](docs/tutorial.md)

## The three layers of this project

```
    transistors  ──  NMOS and PMOS as binary switches
        │
      NAND        ──  the only universal gate
        │
    logic gates   ──  NOT, AND, OR, XOR
        │
      adders      ──  half, full, 8-bit ripple-carry
        │
       ALU        ──  everything arithmetic and logical
        │
      the CPU     ──  the fetch/decode/execute loop
        │
    OXNTAL        ──  the language
```

Read the [concepts](docs/concepts.md) to see why each layer exists.
```

---

## `docs/tutorial.md`

```markdown
# OXN — Tutorial

> **You are here because:** you want to write and run your first program.
> **You may also want:** the [concepts](concepts.md) — how the machine works —
> or the [reference](reference.md) — every opcode and rule.

The tutorial assumes you have never written assembly before, and that
you have never used a stack. Nothing else is assumed.

---

## 1. Install

You need Node.js 20 or later. Everything else comes from `npm`.

```sh
git clone https://github.com/YOUR-USER/ts-cpu
cd ts-cpu
npm install
npm run build
```

That's it. If you'd rather not clone, there's a web version:
open `src/web/demo.html` in a browser after running `npm run build`.

## 2. Your first program

Create a file called `first.oxn`:

```
LDA 42
OUT
BRK
```

Run it:

```sh
npx tsx src/cli/index.ts first.oxn
```

You should see:

```
42
```

That's a whole program. Three lines. Let's look at what each one did.

## 3. What `LDA 42` did

`LDA` **pushes** a number onto a stack. Think of a stack of plates.
You can only ever put a plate on top, or take the top plate off.

```
     ┌──────┐
     │  42  │  ← the top of the stack
     └──────┘
     ┌──────┐
     │      │
     └──────┘
```

## 4. What `OUT` did

`OUT` **pops** the top value off the stack and prints it.

```
     ┌──────┐
     │      │  ← 42 is gone
     └──────┘
     ┌──────┐
     │      │
     └──────┘
```

and `42\n` appears on your terminal.

## 5. What `BRK` did

`BRK` stops the CPU. Without it, the CPU would keep reading whatever
comes next in memory, which is not what you want.

**Every program you write should end in `BRK`.**

## 6. Arithmetic

Try this:

```
LDA 10
LDA 20
ADD
OUT
BRK
```

Output:

```
30
```

`ADD` pops the top two values, adds them, and pushes the result.
The order matters: `LDA 10 LDA 20 ADD` gives `10 + 20`, not `20 + 10`.

The CPU has:

| Instruction | What it does               |
|-------------|----------------------------|
| `ADD`       | a + b                      |
| `SUB`       | b − a (watch the order)    |
| `MUL`       | a × b                      |
| `DIV`       | b ÷ a, integer division    |
| `MOD`       | b mod a                    |

Stack order for all of them: the **second** value is on the left.

## 7. Printing characters

`OUT` prints a number. `DCD` prints a character instead. The number
is read as an ASCII code.

```
LDA 72
DCD
LDA 105
DCD
LDA 33
DCD
BRK
```

Output:

```
Hi!
```

`72` is `H`, `105` is `i`, `33` is `!`.

You can write a lot of `LDA` lines quickly using the `"..."` form.
Inside the quotes, every number becomes its own `LDA`:

```
LDA " 33 105 72 "
DCD * 3
BRK
```

`DCD * 3` means "do `DCD` three times". The result is the same `Hi!`,
but the source is shorter. (Notice the quotes are in *output* order,
so `33 105 72` — `!`, `i`, `H` — comes out as `Hi!` because the stack
reverses it.)

## 8. Variables

A variable is a small box in RAM that holds one number. You name it
with `VAR`:

```
VAR counter

LDA 5
STA counter
```

`STA counter` pops the top of the stack and stores it at the address
the assembler gave `counter`. Later, `LDR counter` pushes it back:

```
LDR counter
OUT
BRK
```

Output: `5`.

## 9. Loops

A label is a name for a position in the program. You write one with `>`:

```
>loop
```

To jump to a label, use `JMP`:

```
JMP loop
```

That jumps back to the label. Forever. That's an infinite loop — useful
to know about, not useful to run.

To loop a controlled number of times, use a **conditional jump**.
`JCN` pops the top of the stack. If it's non-zero, the jump happens.
If it's zero, execution continues.

Here's a countdown from 5 to 1:

```
VAR n

LDA 5
STA n

>loop
  LDR n
  OUT
  LDR n
  DEC
  STA n
  LDR n
  LDA 0
  GTH
  JCN loop

BRK
```

Read it line by line:

- `LDR n` — push `n`.
- `OUT` — print it.
- `LDR n / DEC / STA n` — decrement `n` and store it back.
- `LDR n / LDA 0 / GTH` — is `n` still greater than 0?
- `JCN loop` — if yes, go back to `loop`.

Output:

```
5
4
3
2
1
```

## 10. Comments

Comments in OXNTAL are delimited by two `//` markers. Everything between
the first `//` and the second is thrown away.

```
// this is a comment //
LDA 5
```

An odd number of `//` markers in a file is an error. This is unusual —
most assemblers use `//` to mean "to the end of the line" — but it's
what OXNTAL does today, and it's worth knowing before it surprises you.

## 11. Where to go next

- The [concepts document](concepts.md) explains *why* the machine
  is built this way — why a stack, why 8-bit, why the ALU is made of
  transistors.
- The [reference](reference.md) has every opcode, every rule, and
  every error message.

If you want to see more programs, look inside `programs/`.
`programs/tests/countdown.oxn` is a bigger version of the loop above.

Go write something.
```

---

## `docs/concepts.md`

```markdown
# OXN — Concepts

> **You are here because:** you want to understand how this CPU works.
> **You may also want:** the [tutorial](tutorial.md) — write your first
> program — or the [reference](reference.md) — every opcode and rule.

This document explains the *why* behind OXN. If you just want to run
programs, the [tutorial](tutorial.md) is a better place to start.

---

## 1. The premise

A CPU is a machine that reads a program and does what it says. That's it.
Everything else — every register, every instruction, every flag — exists
to make that loop possible and fast.

OXN is a CPU that has been built from the ground up. It starts at
transistors, and it climbs. There is no point at which a layer calls
down to JavaScript's `+`, `&`, or `^`. Every arithmetic operation the
CPU performs is eventually carried out by switches opening and closing.

Why? Because "everything is a computer" is a claim you can't really
believe until you've built one. This is mine.

## 2. The seven layers

```
   ┌─────────────────────────────────────────────┐
   │  transistors   NMOS, PMOS as switches       │
   ├─────────────────────────────────────────────┤
   │  NAND          the only gate                │
   ├─────────────────────────────────────────────┤
   │  logic gates   NOT, AND, OR, XOR from NAND  │
   ├─────────────────────────────────────────────┤
   │  adders        half, full, 8-bit            │
   ├─────────────────────────────────────────────┤
   │  ALU           arithmetic and logic         │
   ├─────────────────────────────────────────────┤
   │  CPU           fetch, decode, execute       │
   ├─────────────────────────────────────────────┤
   │  OXNTAL        the language                 │
   └─────────────────────────────────────────────┘
```

Each layer only knows about the one below it. The CPU has no idea
that `ADD` is eight full adders chained together. The ALU has no
idea that a `NAND` is four transistors.

That's the point of a layer: it lets you build *up* without having to
remember *down*.

## 3. Transistors

A transistor is a switch. It has three terminals: a *gate*, and two
ends of a *channel*. The gate decides whether current flows through
the channel.

There are two kinds:

- **N-type (NMOS).** Conducts when the gate is high (`1`).
- **P-type (PMOS).** Conducts when the gate is low (`0`).

The two types are complements of each other. That complementarity is
why CMOS circuits — the kind inside every modern chip — burn almost no
power when they're sitting still. For any input, exactly one transistor
network is conducting and the other is not.

OXN models them as switches with a gate and a boolean `conducts()`. Real
MOSFETs have threshold voltages, capacitances, and resistances. We
throw all of that away. What's left is the digital abstraction, which
is what a CPU actually depends on.

## 4. NAND

Of all the gates you could pick as your primitive, the industry picked
NAND. Two reasons:

1. It's the cheapest 2-input gate to build in CMOS — four transistors,
   two PMOS in parallel on the pull-up side, two NMOS in series on the
   pull-down side.
2. It's *functionally complete*. You can build every other boolean
   function out of NAND alone.

The second fact is a theorem. In OXN, we take it seriously: the
`logicGates.ts` file is not allowed to use native `&`, `|`, `^`, or `~`.
Everything goes through `NAND.gate(a, b)`.

If you want to see how NAND is built from four transistors, the file
`src/cpu/hardware/nand.ts` has the layout drawn out in a comment.
The pull-up network is parallel (either PMOS conducts → output pulled
high). The pull-down network is series (both NMOS must conduct → output
pulled low). Exactly one of them conducts for any input, which is the
CMOS invariant.

## 5. Logic gates

From NAND you get everything.

- **NOT** — tie both inputs together: `NAND(a, a)`.
- **AND** — a NAND followed by a NOT.
- **OR** — De Morgan's law: `NOT(NOT(a) AND NOT(b))`.
- **XOR** — four NANDs.

That's it. `src/cpu/hardware/logicGates.ts` has each one as a two- or
five-line function. Nothing in that file uses a native bitwise operator.

## 6. Adders

Addition is the first thing that stops looking like a gate and starts
looking like arithmetic.

A **half adder** takes two bits and produces a sum and a carry:

```
    A  B  │ SUM CARRY
    0  0  │  0    0
    0  1  │  1    0
    1  0  │  1    0
    1  1  │  0    1
```

`1 + 1 = 10` in binary, so sum is `0` and carry is `1`. That's
`XOR(A, B)` for the sum and `AND(A, B)` for the carry.

A **full adder** takes three inputs — `a`, `b`, and an incoming carry —
and produces a sum and an outgoing carry. Chain two half adders, OR
their carries, and you have one.

An **8-bit adder** is eight full adders in a row. The carry out of
bit 0 feeds the carry in of bit 1, and so on. This is called a
*ripple-carry adder* because the carry "ripples" through the chain.
It's not the fastest design, but it's the simplest, and it's what OXN
uses.

When you write `LDA 10 LDA 20 ADD`, the two numbers travel down through
eight full adders, each built from two half adders, each built from
XOR and AND, each built from NANDs, each built from four transistors.
The result climbs back up.

## 7. The ALU

The Arithmetic Logic Unit is the top of the hardware stack. It exposes
a single method:

```ts
alu.exec("ADD", 10, 20)  // → 30
```

Internally it converts `10` and `20` into two arrays of eight bits,
runs them through the appropriate circuit, and converts the result
back into a number.

Everything below the ALU works on `Bit` (`0 | 1`). Everything above
works on `number` (0–255). The conversion happens in exactly one file,
`bitUtils.ts`, and nowhere else.

## 8. Subtraction and two's complement

There is no subtractor in OXN. There doesn't need to be.

`A − B` is the same as `A + NOT(B) + 1`. This is called *two's
complement* subtraction, and it's how nearly every real CPU does it.
The same 8-bit adder that computes `10 + 20` also computes `20 − 10`,
just with an inverter on one input and a `+1` on the carry-in.

It's a beautiful thing to see. It's why subtraction is one instruction
in the CPU but zero instructions in the ALU.

## 9. Why a stack machine?

Two ways to design a CPU:

- **Register machines** (x86, ARM, MIPS). Instructions name registers.
  `ADD r1, r2` adds two register values. Fast, but you need a lot of
  registers, and the compiler has to think hard about how to use them.
- **Stack machines** (Forth, Uxn, OXN, JVM bytecode). Instructions act
  on the top of a stack. `ADD` pops two values, adds them, pushes the
  result. No registers to name, and the encoding is trivially compact.

OXN is a stack machine because stack machines are easier to build and
easier to reason about. There's no register allocation to do, no
calling convention to design, no "which register holds what" to
remember.

The trade-off is that the stack becomes a bottleneck. In a register
machine, three or four operations can be in flight at once. In a stack
machine, everything has to go through the top. For a small
educational CPU, that's fine.

## 10. The stack

256 bytes of `Uint8Array`. A stack pointer that starts at 0 and grows
upward.

The stack pointer (SP) is the index of the *next* free slot. Pushing
stores a byte at `data[sp]` and then increments `sp`. Popping
decrements `sp` and returns `data[sp]`.

The stack has no bounds checking at the machine level. Pushing when
it's full and popping when it's empty will silently corrupt memory.
Every assembly programmer needs to know this. Every assembler that
generates the wrong code will discover it the hard way.

## 11. RAM

256 bytes. Address 0 is special: `STA 0` means "put this value at the
next free address", and `LDR 0` reads it back. Every other address is
used directly.

Variables declared with `VAR x` (or `@x`) are allocated starting at
address 1, going upward. The assembler does the allocation at
assembly time, so by the time the CPU runs, every `STA x` and `LDR x`
has already been replaced with a concrete address.

## 12. The program counter

The PC is a byte index into the program. It points at the *next*
instruction to be fetched, not the current one.

Every instruction increments the PC by 1 — for the opcode — and then
by another 1 if the instruction has a parameter. `LDA 5` is two bytes:
`0x01 0x05`. After it runs, PC has advanced by two.

`JMP` and `JCN` are the only instructions that change the PC to
something other than "the next byte". They set it to an absolute
address, which the assembler has already resolved.

Since addresses are stored as single bytes, the current OXN
implementation limits the program to 256 bytes. That's a design
choice worth revisiting — see [Design Decisions](#14-design-decisions).

## 13. Fetch, decode, execute

Every instruction goes through the same three phases.

**Fetch.** Read `program[pc]`. That byte is the opcode.

**Decode.** Look at the opcode. It's `0x01`? We're doing `LDA`. `0x0A`?
`ADD`. `0xFF`? `BRK`.

**Execute.** Do the thing. Maybe pop from the stack, maybe push,
maybe read `program[pc+1]` for a parameter, maybe jump.

The CPU logs each step when a `Logger` is attached. If you run with
`--trace`, you get one line per instruction:

```
[pc=0x0000 op=0x01 sp=1] Stack: [ 05 ]
[pc=0x0002 op=0x18 sp=0] Stack: [  ]
```

Read that as: at PC 0 we executed opcode `0x01` (`LDA`), and after it
ran the stack had one byte on it. Then at PC 2 we executed `0x18`
(`OUT`), and after it ran the stack was empty.

## 14. Design decisions

A few things that were deliberate, and a few that weren't.

**8-bit instead of 16-bit.** Every operation fits in a byte. Every
value fits in a byte. Every address fits in a byte. The whole system
is small enough to hold in your head. Sixteen bits would have doubled
the gate count of every adder and every comparison.

**Stack machine instead of register machine.** Fewer instructions,
simpler encoding, nothing to allocate. The cost is performance, and
we don't care about performance here.

**Two's complement subtraction.** Zero extra hardware. The adder
already exists.

**Comments are paired `//` markers.** This is a bug, or at least a
quirk. Most assemblers treat `//` as "to the end of the line". OXN
treats it as a toggle: everything between the first and second `//`
is discarded, and an odd number is an error. It works, but it's
surprising. It's on the list.

**Program addresses are one byte.** Which means programs top out at
256 bytes. This is the first thing to fix if OXN ever grows.

**The ALU does not know about the CPU.** If you want to reuse the
gate-level ALU in another project — a calculator, an FPGA simulation,
a teaching tool — it's a standalone module. The only thing it needs
is an array of bits.

## 15. The adapters

The CPU does not know where its output goes. It calls four methods on
`CPUOutput` and two on `CPUDisplay`. Somebody else provides those
objects.

That somebody is the *adapter*. There are three:

- **CLI.** `NodeOutput` writes numbers to `process.stdout`, chars to
  `process.stdout`, and errors to `process.stderr`. `TerminalDisplay`
  draws bars with `█`.
- **Web.** `BufferOutput` accumulates strings in memory and hands them
  back at the end. `CanvasDisplay` draws rectangles.
- **Desktop.** Same as web, running inside Electron.

The pattern is called *dependency inversion*: the CPU depends on an
interface it defines, not on the environment it runs in. If you want
OXN to talk to a serial port, or an LED matrix, or a Discord bot, you
write a new adapter and pass it in. You don't touch the CPU.

## 16. The logger

Same idea, one level up. The CPU *also* emits a debug log — one line
per instruction, one line per jump, one line per RAM access. Where
does the log go? Same answer: whatever sink you provide.

The logger itself owns the *format*. The sink owns the *destination*.
`FileLogSink` writes to disk. `StringLogSink` accumulates in memory.
A null sink discards everything.

Logging is opt-in. If you construct the CPU with no logger, it uses
the null sink, and every `logger.info(...)` call is a no-op. The CPU
does not slow down because logging is off.

## 17. Where to go next

- The [reference](reference.md) lists every opcode, every error, every
  rule.
- The [tutorial](tutorial.md) gets you writing programs.
- The code itself lives in `src/cpu/`. Start with `cpu.ts` and read
  downward.
```

---

## `docs/reference.md`

```markdown
# OXN — Reference

> **You are here because:** you want to look up an opcode, a rule, or a
> number. **You may also want:** the [tutorial](tutorial.md) — write your
> first program — or the [concepts](concepts.md) — how the machine works.

This is a lookup document. It assumes you already know what you want.

---

## 1. The machine in one table

| Property          | Value                          |
|-------------------|--------------------------------|
| Word size         | 8 bits                         |
| Value range       | 0 – 255                        |
| Stack size        | 256 bytes                      |
| RAM size          | 256 bytes                      |
| Program size      | 256 bytes (addresses are 1 byte) |
| Architecture      | Stack machine                  |
| Endianness        | N/A (no multi-byte values)     |
| Instruction size  | 1 or 2 bytes                   |
| Number of opcodes | 40                             |

## 2. Memory map

```
    0x00 ┌────────────────────────┐
         │  RAM address 0         │  ← wildcard slot
         │  (STA 0 / LDR 0)       │
    0x01 ├────────────────────────┤
         │  Variables             │  ← allocated by VAR / @name
         │  ...                   │
    0xFF └────────────────────────┘
```

The stack is **not** memory-mapped. It lives inside the CPU as a
separate 256-byte array.

Program memory is **also separate** from RAM. The CPU reads bytecode
from its own `program` array, indexed by the program counter.

## 3. Registers

OXN has no user-visible registers. The only state inside the CPU is:

| Name | Size   | Purpose                                    |
|------|--------|--------------------------------------------|
| PC   | number | Index of the next bytecode byte to fetch   |
| SP   | number | Stack pointer — index of the next free slot|

Everything else the program does is via the stack and RAM.

## 4. Instruction format

Every instruction is either 1 or 2 bytes.

**1-byte instruction:**

```
    ┌────────┐
    │ opcode │
    └────────┘
```

**2-byte instruction (takes a parameter):**

```
    ┌────────┬────────────┐
    │ opcode │ parameter  │
    └────────┴────────────┘
```

The parameter is always a single byte. It's either a literal value
(0–255), a RAM address (0–255), or a jump target (0–255).

Instructions that take a parameter: `LDA`, `STA`, `LDR`, `JMP`, `JCN`,
`ECD`.

## 5. Opcode table

```
    ┌─────────┬────────┬───────┬───────────────────────────────┐
    │ Opcode  │ Mnemonic│ Bytes│ Effect                        │
    ├─────────┼────────┼───────┼───────────────────────────────┤
    │  0x01   │ LDA    │  2    │ Push the next byte.           │
    │  0x02   │ DCD    │  1    │ Pop, print as ASCII char.     │
    │  0x03   │ POP    │  1    │ Discard top.                  │
    │  0x04   │ NIP    │  1    │ Discard second.               │
    │  0x05   │ SWP    │  1    │ Swap top two.                 │
    │  0x06   │ DUP    │  1    │ Duplicate top.                │
    │  0x07   │ OVR    │  1    │ Duplicate second onto top.    │
    │  0x08   │ ROT    │  1    │ Rotate top three.             │
    │  0x09   │ CLR    │  1    │ Clear the stack.              │
    │  0x0A   │ ADD    │  1    │ a + b.                        │
    │  0x0B   │ SUB    │  1    │ b − a.                        │
    │  0x0C   │ MUL    │  1    │ a × b.                        │
    │  0x0D   │ DIV    │  1    │ b ÷ a (integer).              │
    │  0x0E   │ MOD    │  1    │ b mod a.                      │
    │  0x0F   │ AND    │  1    │ a & b.                        │
    │  0x10   │ ORA    │  1    │ a | b.                        │
    │  0x11   │ EOR    │  1    │ a ^ b.                        │
    │  0x12   │ NOT    │  1    │ ~a.                           │
    │  0x13   │ INC    │  1    │ a + 1.                        │
    │  0x14   │ DEC    │  1    │ a − 1.                        │
    │  0x15   │ SHL    │  1    │ b << a.                       │
    │  0x16   │ SHR    │  1    │ b >> a.                       │
    │  0x17   │ NEG    │  1    │ −a.                           │
    │  0x18   │ OUT    │  1    │ Pop, print as number.         │
    │  0x19   │ LOG    │  1    │ Print the whole stack.        │
    │  0x1A   │ PRT    │  1    │ Draw the whole stack.         │
    │  0x1B   │ SHW    │  1    │ Draw the top value.           │
    │  0x1C   │ STA    │  2    │ Pop, store at RAM address.    │
    │  0x1D   │ LDR    │  2    │ Load from RAM address.        │
    │  0x1E   │ JMP    │  2    │ Unconditional jump.           │
    │  0x1F   │ JCN    │  2    │ Conditional jump.             │
    │  0x20   │ ECD    │  2    │ Push the character code.      │
    │  0x21   │ EQU    │  1    │ Push 1 if b == a else 0.      │
    │  0x22   │ GTH    │  1    │ Push 1 if b > a else 0.       │
    │  0x23   │ LTH    │  1    │ Push 1 if b < a else 0.       │
    │  0x24   │ VAR    │  0    │ Declare a variable.           │
    │  0xFF   │ BRK    │  1    │ Halt the CPU.                 │
    └─────────┴────────┴───────┴───────────────────────────────┘
```

Note `VAR` produces no bytecode. It is a declaration that the assembler
resolves at assembly time.

## 6. Instructions in detail

### LDA — `0x01`

```
LDA 42
```

Push the immediate byte onto the stack.

```
before:  [ ... ]
after:   [ ... 42 ]
```

### DCD — `0x02`

```
DCD
```

Pop the top of the stack and print it as an ASCII character, without
a trailing newline.

```
before:  [ ... 72 ]
after:   [ ... ]
output:  H
```

### POP — `0x03`

Pop and discard the top of the stack.

### NIP — `0x04`

Remove the second item from the stack, keeping the top.

```
before:  [ ... a b ]
after:   [ ... b ]
```

### SWP — `0x05`

Swap the top two items.

```
before:  [ ... a b ]
after:   [ ... b a ]
```

### DUP — `0x06`

Duplicate the top item.

```
before:  [ ... a ]
after:   [ ... a a ]
```

### OVR — `0x07`

Push a copy of the second item onto the stack.

```
before:  [ ... a b ]
after:   [ ... a b a ]
```

### ROT — `0x08`

Rotate the top three items.

```
before:  [ ... a b c ]
after:   [ ... b c a ]
```

### CLR — `0x09`

Empty the stack. Sets SP to 0.

### ADD — `0x0A`

Pop two values and push their sum, modulo 256.

```
before:  [ ... a b ]
after:   [ ... (b + a) & 0xFF ]
```

### SUB — `0x0B`

Pop two values and push `b - a`, modulo 256.

```
before:  [ ... a b ]
after:   [ ... (b - a) & 0xFF ]
```

### MUL — `0x0C`

Pop two values and push `a × b`, modulo 256.

### DIV — `0x0D`

Pop two values and push `floor(b / a)`. If `a` is zero, push zero.

### MOD — `0x0E`

Pop two values and push `b % a`. If `a` is zero, push zero.

### AND — `0x0F`

Bitwise AND of the top two values.

### ORA — `0x10`

Bitwise OR of the top two values.

### EOR — `0x11`

Bitwise XOR of the top two values.

### NOT — `0x12`

Bitwise NOT of the top value.

### INC — `0x13`

Increment the top of the stack by one, modulo 256.

### DEC — `0x14`

Decrement the top of the stack by one, modulo 256.

### SHL — `0x15`

Pop two values, push `b << a`, modulo 256.

### SHR — `0x16`

Pop two values, push `b >> a`.

### NEG — `0x17`

Negate the top of the stack (two's complement).

### OUT — `0x18`

Pop and print as a number, with a newline.

### LOG — `0x19`

Print the whole stack as `[ ... ]` on one line. Does not modify the stack.

### PRT — `0x1A`

Draw the whole stack via the display adapter.

### SHW — `0x1B`

Draw the top of the stack via the display adapter.

### STA — `0x1C`

```
STA counter
```

Pop the top of the stack and store it at the given RAM address.

If the address is 0, allocate the next free RAM slot instead.

### LDR — `0x1D`

```
LDR counter
```

Push the value at the given RAM address onto the stack.

If the address is 0, push the last value stored via `STA 0`.

### JMP — `0x1E`

```
JMP loop
```

Set the program counter to the given address.

### JCN — `0x1F`

```
JCN loop
```

Pop a value. If it's non-zero, set the program counter to the given
address. Otherwise continue to the next instruction.

### ECD — `0x20`

```
ECD A
```

Push the ASCII code of the given character.

### EQU — `0x21`

Pop two values. Push `1` if they're equal, `0` otherwise.

### GTH — `0x22`

Pop two values. Push `1` if `b > a`, `0` otherwise.

### LTH — `0x23`

Pop two values. Push `1` if `b < a`, `0` otherwise.

### VAR — `0x24`

```
VAR counter
```

Declare a variable. The assembler allocates the next free RAM address
and substitutes it wherever the name appears. This instruction produces
no bytecode.

### BRK — `0xFF`

Halt the CPU. The `run()` loop exits.

## 7. OXNTAL syntax

### Numbers

| Form   | Example  | Value |
|--------|----------|-------|
| Decimal | `10`    | 10    |
| Hex    | `0x0A`   | 10    |
| Binary | `0b1010` | 10    |

### Comments

Delimited by two `//` markers. Everything between them is discarded.

```
// this is a comment //
LDA 5
```

An odd number of `//` markers is an error.

### Labels

A label is a name for a position in the bytecode.

```
>loop
JMP loop
```

Written with `>` at the declaration site, referenced by bare name.

### Variables

A variable is a name for a RAM address.

```
VAR counter
STA counter
LDR counter
```

`@name` is equivalent to `VAR name`.

### Multi-instruction shorthand

`LDA " 1 2 3 "` expands to `LDA 1 LDA 2 LDA 3`.

Works with any parameterised instruction: `LDA`, `STA`, `LDR`, `JMP`,
`JCN`, `ECD`.

### Repetition shorthand

`DUP * 4` expands to `DUP DUP DUP DUP`.

Works with any instruction.

### Immediate shorthand

`#5` expands to `LDA 5`.

### Increment shorthand

`x++` expands to `LDR x INC STA x`.

## 8. CLI

```
oxn <program.oxn>              assemble and run
oxn run <program.oxn>          same, explicit verb
oxn --help                     show usage
```

Options:

| Flag              | Effect                                                |
|-------------------|-------------------------------------------------------|
| `--no-display`    | Disable `SHW` and `PRT` output                        |
| `--log <path>`    | Write the debug log to `<path>` (default: `oxn.log`)  |
| `--log -`         | Write the log to stderr                               |
| `--trace`         | Alias for `--log -`                                   |
| `--no-log`        | Disable logging                                       |
| `--verbose`       | Step-by-step trace, `--verbose` layout                |
| `-h`, `--help`    | Show usage                                            |

### Exit codes

| Code | Meaning                     |
|------|-----------------------------|
| 0    | Success                     |
| 1    | Bad usage                   |
| 2    | File could not be read      |
| 3    | Assembly error              |
| 4    | Runtime error               |

## 9. Error messages

The assembler can raise:

```
Unknown token at position N: "X"
Duplicate label: name
Duplicate variable: name
VAR at token N is missing a name
Empty '@' label at token N
Empty '>' label at token N
Out of data addresses (256 max)
Unterminated comment: odd number of '//' markers
Unterminated string starting at token N
Unexpected '"' at token N: previous token "X" is not a parameterised instruction
Invalid repeat at token N: "X" is not an instruction
Invalid repeat count at token N: "X"
X at token N is missing a parameter
Invalid parameter "X" for Y: expected a number, label, or variable
```

The CPU can raise:

```
LDA instruction needs accompanying parameter
STA instruction needs accompanying address parameter
LDR instruction needs accompanying address parameter
JMP instruction needs accompanying address parameter
JCN instruction needs accompanying address parameter
ECD instruction needs accompanying parameter
Invalid instruction address: 0xNN
Unknown opcode: 0xNN
Stack underflow
Stack overflow
```

## 10. Versioning

| ISA   | CPU   | Assembler | Notes                                  |
|-------|-------|-----------|----------------------------------------|
| 0.1   | 0.1   | 0.1       | Initial stack machine, no RAM          |
| 0.2   | 0.2   | 0.2       | Added RAM, jumps, comparisons, `VAR`   |
| 0.3   | 0.3   | 0.3       | Rebuilt ALU from transistors upward    |

Breaking changes are documented in the release notes.

## 11. Where to go next

- The [tutorial](docs/tutorial.md) teaches you to write programs.
- The [concepts](docs/concepts.md) explains how the machine works.
- The [reference](docs/reference.md) defines every opcode and rule in a succinct manner.
- The `src/cpu/` directory is the source of truth.