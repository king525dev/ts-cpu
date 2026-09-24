# OXN — Reference

> **You are here because:** you want to look up an opcode, a rule, or a number.
> **You may also want:** the [tutorial](tutorial.md) — write your first
> program — or the [concepts](concepts.md) — how the machine works.

This is a lookup document. It assumes you already know what you want.

---

## 1. Quick facts

```
    Architecture        8-bit stack machine
    Value range         0 – 255
    Stack               256 bytes, LIFO
    RAM                 256 bytes
    Program             up to 256 bytes
    Instructions        40
    Instruction size    1 or 2 bytes
    Endianness          n/a (no multi-byte values)
    Registers           PC and SP, both internal
    Flags register      none (comparisons push a value)
```

## 2. Memory map

```
    0x00  ┌────────────────────────┐
          │  RAM slot 0 (wildcard) │
    0x01  ├────────────────────────┤
          │  Variables             │
          │  (VAR / @name)         │
          │                        │
    0xFF  └────────────────────────┘
```

The stack is not memory-mapped. It lives inside the CPU as a
separate 256-byte array.

Program memory is also separate. The CPU reads bytecode from its
own `program` array, indexed by the program counter. Therefore, the 
CPU uses a Harvard Architecture rather than the popular Von Neumann
Architechtire

Address 0 in RAM is special: `STA 0` stores into the next free slot,
and `LDR 0` reads back the value most recently stored that way. Every
other address is used directly.

## 3. Internal state

The CPU has no user-visible registers. Its only state is:

```
    PC      number      Byte index of the next opcode to fetch.
    SP      number      Index of the next free slot on the stack.
```

The PC points at the next instruction, not the current one.
By the time `step()` has decoded an opcode, PC has already advanced
past it.

## 4. Instruction format

Two shapes.

**1-byte:**

```
    ┌────────┐
    │ opcode │
    └────────┘
```

**2-byte:**

```
    ┌────────┬───────────┐
    │ opcode │ parameter │
    └────────┴───────────┘
```

The parameter is always a single byte. It's an immediate value, a RAM
address, or a jump target — depending on the instruction.

Exactly six instructions take a parameter: `LDA`, `STA`, `LDR`, `JMP`,
`JCN`, `ECD`.

## 5. Opcode table

```
    ┌────────┬──────────┬───────┬───────────────────────────────┐
    │ Opcode │ Mnemonic │ Bytes │ Effect                        │
    ├────────┼──────────┼───────┼───────────────────────────────┤
    │  0x01  │ LDA      │  2    │ Push the next byte.           │
    │  0x02  │ DCD      │  1    │ Pop, print as ASCII char.     │
    │  0x03  │ POP      │  1    │ Discard top.                  │
    │  0x04  │ NIP      │  1    │ Discard second.               │
    │  0x05  │ SWP      │  1    │ Swap top two.                 │
    │  0x06  │ DUP      │  1    │ Duplicate top.                │
    │  0x07  │ OVR      │  1    │ Copy second onto top.         │
    │  0x08  │ ROT      │  1    │ Rotate top three.             │
    │  0x09  │ CLR      │  1    │ Clear the stack.              │
    │  0x0A  │ ADD      │  1    │ a + b.                        │
    │  0x0B  │ SUB      │  1    │ b − a.                        │
    │  0x0C  │ MUL      │  1    │ a × b.                        │
    │  0x0D  │ DIV      │  1    │ b ÷ a (integer).              │
    │  0x0E  │ MOD      │  1    │ b mod a.                      │
    │  0x0F  │ AND      │  1    │ a & b.                        │
    │  0x10  │ ORA      │  1    │ a | b.                        │
    │  0x11  │ EOR      │  1    │ a ^ b.                        │
    │  0x12  │ NOT      │  1    │ ~a.                           │
    │  0x13  │ INC      │  1    │ a + 1.                        │
    │  0x14  │ DEC      │  1    │ a − 1.                        │
    │  0x15  │ SHL      │  1    │ b << a.                       │
    │  0x16  │ SHR      │  1    │ b >> a.                       │
    │  0x17  │ NEG      │  1    │ −a.                           │
    │  0x18  │ OUT      │  1    │ Pop, print as number.         │
    │  0x19  │ LOG      │  1    │ Print the whole stack.        │
    │  0x1A  │ PRT      │  1    │ Draw the whole stack.         │
    │  0x1B  │ SHW      │  1    │ Draw the top value.           │
    │  0x1C  │ STA      │  2    │ Pop, store at RAM address.    │
    │  0x1D  │ LDR      │  2    │ Load from RAM address.        │
    │  0x1E  │ JMP      │  2    │ Unconditional jump.           │
    │  0x1F  │ JCN      │  2    │ Conditional jump.             │
    │  0x20  │ ECD      │  2    │ Push a character code.        │
    │  0x21  │ EQU      │  1    │ Push 1 if a == b, else 0.     │
    │  0x22  │ GTH      │  1    │ Push 1 if b > a, else 0.      │
    │  0x23  │ LTH      │  1    │ Push 1 if b < a, else 0.      │
    │  0x24  │ VAR      │  0    │ Declare a variable.           │
    │  0xFF  │ BRK      │  1    │ Halt.                         │
    └────────┴──────────┴───────┴───────────────────────────────┘
```

`VAR` produces no bytecode. It's resolved entirely at assembly time.

## 6. Instruction reference

Notation below: `a` is the value popped first (the top of the stack),
`b` is the value popped second.

### LDA — `0x01` — 2 bytes

```
    LDA 42
```

Push an immediate byte onto the stack.

```
    before   [ ... ]
    after    [ ... 42 ]
```

### DCD — `0x02` — 1 byte

```
    DCD
```

Pop the top value and print it as an ASCII character. No trailing
newline, so consecutive `DCD`s concatenate.

```
    before   [ ... 72 ]
    after    [ ... ]
    output   H
```

### POP — `0x03` — 1 byte

Pop and discard.

```
    before   [ ... a ]
    after    [ ... ]
```

### NIP — `0x04` — 1 byte

Remove the second value.

```
    before   [ ... a b ]
    after    [ ... b ]
```

### SWP — `0x05` — 1 byte

Swap the top two.

```
    before   [ ... a b ]
    after    [ ... b a ]
```

### DUP — `0x06` — 1 byte

Duplicate the top.

```
    before   [ ... a ]
    after    [ ... a a ]
```

### OVR — `0x07` — 1 byte

Copy the second value to the top.

```
    before   [ ... a b ]
    after    [ ... a b a ]
```

### ROT — `0x08` — 1 byte

Rotate the top three. The top becomes the third, the second becomes
the first, the first becomes the second.

```
    before   [ ... a b c ]
    after    [ ... b c a ]
```

### CLR — `0x09` — 1 byte

Empty the stack. Sets SP to 0.

### ADD — `0x0A` — 1 byte

```
    before   [ ... a b ]
    after    [ ... (b + a) & 0xFF ]
```

### SUB — `0x0B` — 1 byte

```
    before   [ ... a b ]
    after    [ ... (b - a) & 0xFF ]
```

### MUL — `0x0C` — 1 byte

```
    before   [ ... a b ]
    after    [ ... (a * b) & 0xFF ]
```

### DIV — `0x0D` — 1 byte

Integer division. If `a` is zero, pushes zero.

```
    before   [ ... a b ]
    after    [ ... floor(b / a) ]
```

### MOD — `0x0E` — 1 byte

Remainder. If `a` is zero, pushes zero.

```
    before   [ ... a b ]
    after    [ ... b % a ]
```

### AND — `0x0F` — 1 byte

Bitwise AND.

### ORA — `0x10` — 1 byte

Bitwise OR.

### EOR — `0x11` — 1 byte

Bitwise XOR.

### NOT — `0x12` — 1 byte

Bitwise NOT. Masks to 8 bits.

```
    before   [ ... a ]
    after    [ ... (~a) & 0xFF ]
```

### INC — `0x13` — 1 byte

Increment the top value by one, modulo 256.

### DEC — `0x14` — 1 byte

Decrement the top value by one, modulo 256.

### SHL — `0x15` — 1 byte

Shift `b` left by `a` bits.

```
    before   [ ... a b ]
    after    [ ... (b << a) & 0xFF ]
```

### SHR — `0x16` — 1 byte

Shift `b` right by `a` bits.

### NEG — `0x17` — 1 byte

Two's complement negation.

```
    before   [ ... a ]
    after    [ ... (-a) & 0xFF ]
```

### OUT — `0x18` — 1 byte

Pop and print as a number, followed by a newline.

### LOG — `0x19` — 1 byte

Print the entire stack on one line, in bracket form. Does not modify
the stack.

```
    before   [ 10 20 30 ]
    after    [ 10 20 30 ]
    output   [ 10 20 30 ]
```

### PRT — `0x1A` — 1 byte

Draw the entire stack via the display adapter. In the browser, this is
a canvas. In the terminal, an ASCII bar chart. Does not modify the
stack.

### SHW — `0x1B` — 1 byte

Draw the top of the stack via the display adapter. Does not modify
the stack.

### STA — `0x1C` — 2 bytes

```
    STA address
```

Pop the top of the stack and store it in RAM at the given address.

If the address is `0`, the value is stored at the next free RAM
address, and that address becomes the "last loaded" address.

```
    before   [ ... a ]   RAM[address] = a
    after    [ ... ]
```

### LDR — `0x1D` — 2 bytes

```
    LDR address
```

Push the value at the given RAM address onto the stack.

If the address is `0`, the value stored by the most recent `STA 0`
is pushed instead.

```
    before   [ ... ]
    after    [ ... RAM[address] ]
```

### JMP — `0x1E` — 2 bytes

```
    JMP label
```

Set the program counter to the given address.

### JCN — `0x1F` — 2 bytes

```
    JCN label
```

Pop a value. If it's non-zero, set the program counter to the given
address. Otherwise continue to the next instruction.

```
    before   [ ... condition ]
    after    [ ... ]
```

### ECD — `0x20` — 2 bytes

```
    ECD A
```

Push the ASCII code of the given character. The assembler converts the
character at assembly time.

```
    ECD A        ; same as LDA 65
```

### EQU — `0x21` — 1 byte

Pop two values. Push `1` if they're equal, `0` otherwise.

### GTH — `0x22` — 1 byte

Pop two values. Push `1` if the second is greater than the first, `0`
otherwise.

```
    before   [ ... a b ]
    after    [ ... (b > a) ? 1 : 0 ]
```

### LTH — `0x23` — 1 byte

Pop two values. Push `1` if the second is less than the first, `0`
otherwise.

### VAR — `0x24` — 0 bytes

```
    VAR counter
```

Declare a variable. The assembler allocates the next free RAM address
and substitutes it wherever the name appears. Produces no bytecode.

### BRK — `0xFF` — 1 byte

Halt. The CPU stops. Any bytecode after `BRK` is never executed.

## 7. OXNTAL syntax

A program is a sequence of tokens. Whitespace separates them. Newlines
have no special meaning.

### Numbers

```
    Decimal     10          →  10
    Hex         0x0A        →  10
    Binary      0b1010      →  10
```

The `0x` and `0b` prefixes are required for hexadecimal and binary.
A bare `A` is not `10` — it's a symbol reference.

Values are truncated to 8 bits when emitted. `LDA 300` pushes `44`.

### Comments

Delimited by two `//` markers. Everything between the first and the
second is discarded.

```
    // this is a comment //
    LDA 5
```

An odd number of `//` markers is an error.

This is unusual. Most assemblers treat `//` as "to end of line".
OXNTAL pairs them.

### Labels

```
    >loop
    JMP loop
```

`>name` declares a label at the current bytecode position. `name` alone
references it.

### Variables

```
    VAR counter
    @counter        ; equivalent
    STA counter
    LDR counter
```

Both forms allocate the next free RAM address. Address allocation
starts at 1, since 0 is reserved by `STA`/`LDR`.

### Multi-instruction shorthand

```
    LDA " 1 2 3 "       ; → LDA 1 LDA 2 LDA 3
```

Works with any parameterised instruction.

### Repetition shorthand

```
    DUP * 4             ; → DUP DUP DUP DUP
```

Works with any instruction. The count must be a decimal number.

### Immediate shorthand

```
    #5                  ; → LDA 5
```

### Increment shorthand

```
    x++                 ; → LDR x INC STA x
```

## 8. CLI

```
    oxn <program.oxn>              assemble and run
    oxn run <program.oxn>          same, explicit verb
    oxn --help                     show usage
```

### Options

| Flag              | Effect                                                |
|-------------------|-------------------------------------------------------|
| `--no-display`    | Disable `SHW` and `PRT` output                        |
| `--log <path>`    | Write the debug log to `<path>` (default: `mycpu.log`)|
| `--log -`         | Write the log to stderr                               |
| `--trace`         | Alias for `--log -`                                   |
| `--no-log`        | Disable logging entirely                              |
| `--verbose`       | Per-step trace to stderr; see below                   |
| `-h`, `--help`    | Show usage                                            |

### `--verbose` format

One line per instruction, written to stderr.

```
    [pc=0004 sp=  2 op=0x1d] stack=[10 33]
```

Fields, left to right:

```
    pc      program counter before this instruction
    sp      stack pointer before this instruction
    op      opcode
    stack   full stack contents before this instruction
```

### `--trace` format

The full logger output, including assembler events, symbol tables,
RAM accesses, and jump events. One example line:

```
    [21.09.26-22:44] [pc=0x0004 op=0x1d sp=2] Stack: [ 0a 21 ] {3ms}
```

Unlike `--verbose`, `--trace` includes timing, assembler passes, and
control-flow events.

### Exit codes

| Code | Meaning                 |
|------|-------------------------|
| 0    | Success                 |
| 1    | Bad usage               |
| 2    | File could not be read  |
| 3    | Assembly error          |
| 4    | Runtime error           |

## 9. Assembler passes

The assembler runs in five passes. Each is a pure function over the
token array.

```
    0   stripComments             discard text between paired //
    1   expandMultiInstruction    LDA " 1 2 3 "  →  LDA 1 LDA 2 LDA 3
    2   expandRepeatedInstruction DUP * 4        →  DUP DUP DUP DUP
    3   expandShorthand           #5  /  x++     →  longer token runs
    4   scan                      allocate labels and variables
    5   emit                      walk tokens, produce bytes
```

Label addresses are computed in pass 4 by walking the token stream and
counting bytes. This is why `JMP label` resolves to the correct byte
even when instructions before the label have different sizes.

## 10. Error messages

### Assembler

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

All assembly errors cause exit code 3.

### CPU

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

All runtime errors cause exit code 4.

## 11. What OXN does not have

Documented explicitly so you know what not to look for.

```
    No registers             No user-visible GPRs. Everything is on the
                             stack or in RAM.

    No flags register        Comparisons push a value, they don't set
                             flags. To branch, use JCN.

    No addressing modes      Only immediate (LDA) and absolute (STA,
                             LDR, JMP, JCN). No indirect, no indexed,
                             no relative.

    No functions             No CALL, no RET. Subroutines are by
                             convention: JMP to a body, JMP back.

    No calling convention    Nothing is preserved. The stack is shared.

    No interrupts            The CPU runs from load to BRK.

    No floating point        Integers only, unsigned, 0–255.

    No signed integers       SUB and NEG wrap. There is no notion of
                             negative in the ISA, though the bit
                             patterns are two's complement.

    No assembler directives  No .org, .db, .equ, no sections. The
                             only pseudo-ops are VAR and @name.

    No expressions           Parameters are single numbers, labels,
                             or variables. No `LDA 5 + 3`.

    No macros                Beyond the four shorthands (quoted list,
                             * N, #N, x++).

    No linker                A program is one file.
```

## 12. Versioning

| ISA   | CPU   | Assembler | Notes                                    |
|-------|-------|-----------|------------------------------------------|
| 0.1   | 0.1   | 0.1       | Initial stack machine, no RAM            |
| 0.2   | 0.2   | 0.2       | Added RAM, jumps, comparisons, VAR       |
| 0.3   | 0.3   | 0.3       | Rebuilt ALU from transistors upward      |

Breaking changes are listed in the release notes. The opcode table has
been stable since 0.2.

## 13. Where to go next

- The [tutorial](tutorial.md) teaches you to write programs.
- The [installation](installation.md) explains how to use the program on different platforms
- The [concepts](concepts.md) explains how the machine works.
- The `src/cpu/` directory is the source of truth. Start with `cpu.ts`.