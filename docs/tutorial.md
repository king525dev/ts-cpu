# OXN — Tutorial

> **You are here because:** you want to write and run your first program.
> **You may also want:** the [concepts](concepts.md) — how the machine works
> — or the [reference](reference.md) — every opcode and rule.

Nothing here assumes you have written assembly before. Nothing here
assumes you know what a stack is. If you can open a terminal and type a
command, you have everything you need.

---

## 1. Install

You need Node.js 20 or later. If you don't have it, get it from
[nodejs.org](https://nodejs.org). Everything else comes from `npm`.

```sh
git clone https://github.com/king525dev/ts-cpu
cd ts-cpu
npm install
npm run build
```

You now have a working OXN machine. There are three ways to use it:

- From a terminal, which is what this tutorial covers.
- In a browser, by opening `src/web/demo.html`.
- As a desktop app, once you've built the installer.

The terminal is the easiest place to learn.

## 2. The first program

Create a file called `first.oxn` and put three lines in it:

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

That is a complete program. Three instructions, one result. Let's take
each line apart.

## 3. What a stack is

Before the three lines make sense, you need one mental image: a stack of
plates.

A stack has one rule. You can put a new plate on top, or take the top
plate off. That's it. You can't reach into the middle. You can't pull a
plate out of the bottom.

```
        ┌──────────┐
   top  │          │  ← the only place you can add or remove
        ├──────────┤
        │          │
        ├──────────┤
 bottom │          │
        └──────────┘
```

The OXN stack holds numbers, not plates. Up to 256 of them. When you
push a number, it goes on top. When you pop, the top number comes off.

Every instruction in OXN either pushes something, pops something, or
does something with what's already there.

## 4. `LDA 42`

`LDA` pushes a number onto the stack. `LDA 42` pushes `42`.

```
before:   [ ]
after:    [ 42 ]
```

## 5. `OUT`

`OUT` pops the top number and prints it.

```
before:   [ 42 ]
after:    [ ]
output:   42
```

## 6. `BRK`

`BRK` stops the CPU. Without it, the CPU would read past the end of
your program into whatever comes next in memory, which is not what you
want.

**End every program with `BRK`.**

## 7. Watching the machine work

Type the same three lines again but run them with `--verbose`:

```sh
npx tsx src/cli/index.ts first.oxn --verbose
```

You'll see two streams of output. The `42` still goes to your terminal
as before. But now there's a second set of lines, one per instruction,
on stderr:

```
[pc=0000 sp=  0 op=0x01] stack=[]
[pc=0002 sp=  1 op=0x18] stack=[42]
[pc=0003 sp=  0 op=0xff] stack=[]
```

Read each line left to right:

- `pc=0000` — the program counter, the byte we're about to execute.
- `sp=  0` — the stack pointer, how many things are on the stack.
- `op=0x01` — the opcode, `0x01` is `LDA`.
- `stack=[]` — what's on the stack before this instruction runs.

So the first line says: "we're about to run the instruction at byte 0,
the stack is empty." Then `LDA 42` runs. The second line says: "we're
about to run the instruction at byte 2, the stack has one thing on it."
That's the `42`.

This is the single most useful debugging tool in the whole machine.
When a program misbehaves, run it with `--verbose` and watch.

## 8. Arithmetic

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

`ADD` pops the top two numbers, adds them, and pushes the result.

```
before ADD:   [ 10 20 ]
after ADD:    [ 30 ]
```

Notice the order. `LDA 10` pushes first, `LDA 20` pushes second, so
`20` is on top. `ADD` doesn't care about top vs bottom — it adds the
two values it can see, and pushes the sum.

The full set of arithmetic instructions:

| Instruction | What it computes       |
|-------------|------------------------|
| `ADD`       | a + b                  |
| `SUB`       | b − a                  |
| `MUL`       | a × b                  |
| `DIV`       | b ÷ a (integer)        |
| `MOD`       | b mod a (the remainder)|

For `SUB`, `DIV`, and `MOD` the order matters. In every case the
second value you pushed is the one on the left.

```
LDA 10
LDA 20
SUB
OUT
BRK
```

Output: `10`. Because it computes `20 − 10`, not `10 − 20`.

## 9. Printing characters

`OUT` prints a number. `DCD` prints an ASCII character instead.

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

`72` is `H`, `105` is `i`, `33` is `!`. The [reference](reference.md)
has a fuller table, but you can look any character up in an ASCII
chart. Uppercase `A` starts at 65. Lowercase `a` starts at 97.

`DCD` doesn't add a newline, so consecutive `DCD`s string together.

## 10. A shorter way to write the same thing

Typing `LDA` over and over is tedious. OXNTAL has a shorthand for
this: put the numbers in quotes and the assembler expands each one into
its own `LDA`.

```
LDA " 72 105 33 "
DCD * 3
BRK
```

Two new things here:

- `LDA " 72 105 33 "` expands to `LDA 72 LDA 105 LDA 33`.
- `DCD * 3` means "do `DCD` three times".

Same output. Half the typing.

Watch out for the order. The stack is last-in-first-out, so the value
you push last is the one `DCD` prints first. If you write
`LDA " 33 105 72 "` and then `DCD * 3`, you get `Hi!` — because `72`
is `H` and it comes off the top first.

```
LDA " 33 105 72 "
DCD * 3
BRK
```

Output: `Hi!`

This is a real trick that trips people up. The stack reverses things.
Every time you write a chain of `LDA`s followed by a chain of `DCD`s,
ask yourself: *what order will these come off?*

## 11. Variables

The stack is temporary. Numbers fall off it as fast as they go on. If
you want to remember something across several instructions, you need a
variable.

A variable is a small box in RAM that holds one number. You give it a
name with `VAR`:

```
VAR counter
```

That's a declaration. It produces no bytecode — it just tells the
assembler "whenever I write `counter` later, substitute the address
this variable was given."

Then `STA` and `LDR` read and write it.

```
VAR counter

LDA 5
STA counter

LDR counter
OUT
BRK
```

Output: `5`.

`STA counter` pops the top of the stack and stores it in the box.
`LDR counter` pushes the contents of the box back onto the stack.

Every `VAR` you declare gets its own box. `VAR x` and `VAR y` are two
different boxes.

```
VAR x
VAR y

LDA 10
STA x

LDA 20
STA y

LDR x
LDR y
ADD
OUT
BRK
```

Output: `30`.

## 12. Labels

A label is a name for a position in your program.

```
>loop
```

The `>` marks it as a label. `loop` is its name.

To jump to a label, use `JMP`:

```
JMP loop
```

That sets the program counter to wherever the label is. If `loop` is
above the `JMP`, execution goes back. If it's below, execution goes
forward.

Don't run this:

```
>loop
JMP loop
```

It jumps to itself forever. The CPU will run until you kill it with
Ctrl-C. It's worth trying once, just to see.

## 13. Conditional jumps

An infinite loop is easy. A controlled loop is more useful.

`JCN` is a conditional jump. It pops a value. If the value is non-zero,
the jump happens. If it's zero, execution continues normally.

Pair `JCN` with a comparison to make a real loop. `GTH` pops two
values and pushes `1` if the second is greater than the first, or `0`
otherwise.

Here's a countdown from 5:

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

Run it, and read it a line at a time:

- `LDR n` — push the current value of `n`.
- `OUT` — print it.
- `LDR n / DEC / STA n` — decrement `n` and store it back.
- `LDR n / LDA 0 / GTH` — push `n`, push `0`, then `GTH` pushes `1` if
  `n > 0`.
- `JCN loop` — if the comparison pushed `1`, jump back to `loop`.

Output:

```
5
4
3
2
1
```

When `n` reaches `0`, `GTH` pushes `0`, `JCN` doesn't jump, and `BRK`
stops the machine.

## 14. Reading the trace of a real loop

Run the countdown with `--verbose` and watch the stack:

```sh
npx tsx src/cli/index.ts countdown.oxn --verbose
```

The trace will show you exactly what's happening. Look for the moment
`JCN` fires:

```
[pc=0014 sp=  1 op=0x1f] stack=[1]
```

`op=0x1f` is `JCN`. The stack has a single `1` on it. The jump
happens. A few instructions later, the same line appears with `0`:

```
[pc=0014 sp=  1 op=0x1f] stack=[0]
```

And this time the program counter doesn't change. The loop exits.

That's the whole shape of control flow. Everything else — nested loops,
`if` statements, `while` loops, `for` loops — is built from these two
instructions: a comparison that pushes a truth value, and a jump that
reads it.

## 15. Comments

Comments in OXNTAL are delimited by two `//` markers. Everything
between the first and the second is discarded.

```
// this is a comment //
LDA 5
```

An odd number of `//` markers in a file is an error. If you write:

```
LDA 5 // push five
```

the assembler will complain about an unterminated comment, because
there's one `//` and no matching second one. You'd need to write:

```
// push five //
LDA 5
```

This is unusual. Most assemblers treat `//` as "ignore the rest of
the line". OXNTAL pairs them up instead. It works, but it's a surprise
the first time, and it's on the [list of things to fix](concepts.md#14-design-decisions).

For now, put your comments on their own lines with a matching pair of
`//` markers on either side.

## 16. Putting it all together

Here's a slightly larger program. It prints the numbers 1 through 5,
each on its own line, then stops.

```
VAR i

LDA 1
STA i

>loop
  LDR i
  OUT

  LDR i
  INC
  STA i

  LDR i
  LDA 6
  LTH
  JCN loop

BRK
```

Output:

```
1
2
3
4
5
```

Notice the change from the countdown. The countdown compared `n > 0`
with `GTH` and decremented. This one compares `i < 6` with `LTH` and
increments. Same structure, different direction.

Every loop has three parts:

1. **The body.** What you want to happen each time.
2. **The update.** How the loop variable changes.
3. **The test.** When to stop.

If you can write those three, you can write any loop.

## 17. Where to go next

You now know:

- How to push and pop numbers with `LDA` and `OUT`.
- How to add, subtract, multiply, divide.
- How to print characters with `DCD`.
- How to remember things with `VAR`, `STA`, `LDR`.
- How to loop with labels, comparisons, and `JCN`.
- How to debug with `--verbose`.

That is enough to write real programs. Not big ones — the whole
program has to fit in 256 bytes — but real ones.

The [reference](reference.md) has every opcode and every rule. The
[concepts document](concepts.md) explains why the machine is built
this way, from transistors upward.

Somewhere in `programs/` are more examples. `programs/samples/countdown.oxn`
is a bigger version of the loop above. `programs/samples/hello.oxn` is the
shortest possible program that does something useful.

If you get stuck, run with `--verbose` and read the stack. The machine
is not hiding anything from you.

Go write something.