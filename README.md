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

## Versioning

| ISA   | CPU   | Assembler | Notes                                  |
|-------|-------|-----------|----------------------------------------|
| 0.1   | 0.1   | 0.1       | Initial stack machine, no RAM          |
| 0.2   | 0.2   | 0.2       | Added RAM, jumps, comparisons, `VAR`   |
| 0.3   | 0.3   | 0.3       | Rebuilt ALU from transistors upward    |

Breaking changes are documented in the release notes.