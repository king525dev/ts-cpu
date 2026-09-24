# OXN — Installation

> **You are here because:** you want to run OXN on your machine.
> **You may also want:** the [tutorial](tutorial.md) — write your first
> program — or the [reference](reference.md) — every opcode and rule.

There are four ways to use OXN. Pick the one that matches what you want
to do.

| Method                              | Best for                                 |
|-------------------------------------|------------------------------------------|
| [Web demo](#1-the-web-demo)         | Trying it out without installing anything|
| [Web API](#2-the-web-api)           | Calling OXN from another website         |
| [CLI from source](#3-the-cli-from-source) | Writing and running programs locally|
| [Standalone binary](#4-the-standalone-binary) | Running programs without Node.js installed |

---

## 1. The web demo

The demo is a small HTML page that loads the bundled CPU and lets you
write and run programs in a textarea. No installation of any kind.

Open [`OXN for web`](https://king525dev.github.io/ts-cpu/)
in any modern browser.

You get:

- A text editor for assembly source.
- A **Run** button.
- An **Output** panel showing what the program printed.
- A **Display** canvas showing what it drew.
- A **Samples** dropdown with programs to start from.

You can also run the demo locally from a clone of the repository. See
[section 3](#3-the-cli-from-source) for how to clone, then open
`src/web/demo.html` directly in your browser. Some features — the
Samples menu, the file loader — need a real server; see
[Running the demo locally](#running-the-demo-locally) below.

---

## 2. The web API

If you want to embed OXN in your own website — as a widget on a
blog post, a teaching tool, a puzzle — you can load the bundled
library and call it directly.

The bundle is served from GitHub Pages at a stable URL. Add this to
your HTML:

```html
<script src="https://king525dev.github.io/ts-cpu/dist/web/oxntal.iife.js"></script>
<script>
  const result = window.Oxntal.run({
    source: "LDA 42\nOUT\nBRK"
  });
  console.log(result.stdout);   // "42\n"
</script>
```

The `run()` function returns a plain object — no promises, no
callbacks — with the following fields:

```
    ok           boolean     true if both assembly and execution succeeded
    stdout       string      everything the program printed
    stderr       string      anything sent to stderr
    numbers      number[]    every value passed to OUT, in order
    chars        string[]    every character passed to DCD, in order
    finalStack   number[]    the stack contents when the program halted
    bytecode     number[]    the assembled bytecode, or undefined
    log          string      the debug log, if captureLog was true
    error        object      { kind, message } if ok is false
```

Options:

```
    source       string      the assembly source text (required)
    canvas       HTMLCanvasElement | undefined   where SHW and PRT draw
    captureLog   boolean     whether to capture and return the log
```

For finer control — assembling without running, executing bytecode
without assembling — the module also exports `assemble()`, `execute()`,
`CPU`, `Assembler`, `Logger`, `BufferOutput`, `CanvasDisplay`, and
`StringLogSink`. See the [reference](reference.md) for the CLI-level
details; the API mirrors them.

---

## 3. The CLI from source

The most useful path if you want to write and run your own programs.
Requires Node.js 20 or later.

### Clone and install

```sh
git clone https://github.com/king525dev/ts-cpu
cd ts-cpu
npm install
```

### Run a program

```sh
npx tsx src/cli/index.ts path/to/program.oxn
```

If `program.oxn` is:

```
LDA 42
OUT
BRK
```

You'll see `42` printed to stdout.

### The command-line options

```
    --no-display     suppress SHW and PRT output
    --log <path>     write a debug log to <path> (default: mycpu.log)
    --log -          write the log to stderr
    --trace          alias for --log -
    --no-log         disable logging
    --verbose        per-instruction trace to stderr
    -h, --help       show usage
```

Common combinations:

```sh
# Just run it, no log, no trace
npx tsx src/cli/index.ts program.oxn --no-log

# Run with a per-step trace visible in the terminal
npx tsx src/cli/index.ts program.oxn --verbose

# Run with the full logger written to a file
npx tsx src/cli/index.ts program.oxn --log debug.log
```

### Bundled programs

The repository ships with example programs under `programs/`. Try:

```sh
npx tsx src/cli/index.ts programs/tests/hello.oxn
npx tsx src/cli/index.ts programs/tests/countdown.oxn
```

### Making `oxn` a global command

Once you've confirmed the CLI works, you can install it as a real
command on your PATH:

```sh
npm run build
npm link
```

Now `oxn` works from any directory:

```sh
oxn programs/tests/hello.oxn
```

`npm link` creates a symlink from your global npm bin directory to
the CLI entry point in this repository. To remove it later, run
`npm unlink -g ts-cpu`.

### Running the demo locally

The web demo works best when served over HTTP, because the Samples
menu loads a manifest file that a `file://` page can't fetch.

**With Vite:**

```sh
npm run build
npx vite
```

Vite prints a local URL like `http://localhost:5173/src/web/demo.html`.
Open it.

**With any static server:**

```sh
npx serve .
# then visit http://localhost:3000/src/web/demo.html
```

If you'd rather not install another tool, opening `src/web/demo.html`
directly in your browser works too — the Samples menu falls back to a
short hardcoded list instead of loading the files from `programs/`.

---

## 4. The standalone binary

> **Warning:** the standalone binary is currently built with
> [Bun](https://bun.sh), not Node.js SEA. Bun uses a different
> JavaScript engine (JavaScriptCore) than Node and the browser (V8).
> The behaviour of the ALU under Bun has not been verified as
> thoroughly as under V8. Prefer the CLI from source for anything
> important.

If you want to distribute OXN to someone who doesn't have Node.js
installed, you can build a single-file executable.

### Build it yourself

Install Bun:

**macOS / Linux:**

```sh
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Then build:

```sh
bun build src/cli/index.ts --compile --outfile oxn
```

You now have a single file called `oxn`. Run it like the CLI:

```sh
./oxn programs/tests/hello.oxn
```

### Cross-compile for other platforms

From any machine that has Bun installed, you can target another
operating system:

```sh
bun build src/cli/index.ts --compile --target=bun-linux-x64      --outfile oxn-linux-x64
bun build src/cli/index.ts --compile --target=bun-darwin-arm64   --outfile oxn-macos-arm64
bun build src/cli/index.ts --compile --target=bun-windows-x64    --outfile oxn-windows-x64.exe
```

Three binaries, from one command on one machine. This is the
convenience that Bun provides over Node.js SEA, which must be run
separately on each target OS.

### Prebuilt binaries

Downloadable builds are published on the
[Releases page](https://github.com/YOUR-USER/ts-cpu/releases) for each
tagged version.

**First run on macOS:** Gatekeeper blocks unsigned binaries. Right-click
the file, choose Open, and confirm. After that it runs normally.

**First run on Windows:** SmartScreen shows a warning. Click "More
info" then "Run anyway".

**Linux:** no restrictions. You may need to `chmod +x oxn-linux-x64`
the first time.

---

## Which method should I use?

If you just want to see what OXN does: **the web demo**.

If you want to write programs and run them: **the CLI from source**.

If you want to embed OXN in another project: **the web API**.

If you want to hand OXN to someone who doesn't have Node.js: **the
standalone binary**, with the warning above in mind.

---

## Where to go next

- The [tutorial](tutorial.md) teaches you to write programs.
- The [concepts](concepts.md) explains how the machine works.
- The [reference](reference.md) has every opcode and every rule.
- The `src/cpu/` directory is the source of truth. Start with `cpu.ts`.