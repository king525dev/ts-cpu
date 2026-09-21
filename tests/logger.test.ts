import { describe, it, expect } from "vitest";
import Logger, { type LogSink, nullSink } from "../src/cpu/logger.js";

/** Collect lines into an array for assertions. */
function makeStringSink(): { sink: LogSink; lines: string[]; text: () => string } {
    const lines: string[] = [];
    const sink: LogSink = {
        write(line) {
            lines.push(line);
        },
    };
    return { sink, lines, text: () => lines.join("\n") };
}

describe("Logger", () => {
    it("does nothing when given no sink", () => {
        const logger = new Logger();
        expect(() => {
            logger.start();
            logger.info("hello");
            logger.bytecode([1, 2, 3]);
            logger.step(0, 1, []);
            logger.stop();
        }).not.toThrow();
    });

    it("does nothing with the null sink", () => {
        const logger = new Logger({ sink: nullSink });
        logger.start();
        logger.info("ignored");
        logger.stop();
        // No assertion needed beyond "did not throw".
    });

    it("writes a banner and a closing line", () => {
        const { sink, lines } = makeStringSink();
        const logger = new Logger({ sink });
        logger.start("TEST");
        logger.stop();
        expect(lines[0]).toBe("// --> TEST <-- //");
        expect(lines[1]).toBe("");
        expect(lines[lines.length - 1]).toMatch(/Process Exited/);
    });

    it("prefixes messages with a timestamp and an elapsed suffix", () => {
        const { sink, lines } = makeStringSink();
        const logger = new Logger({
            sink,
            timestampFormat: () => "TS",
        });
        logger.start();
        logger.info("hello");
        // lines[0] is the banner, lines[1] is blank, lines[2] is "hello".
        expect(lines[2]).toMatch(/^\[TS\] hello \{\d+ms\}$/);
    });

    it("formats bytecode as lowercase hex", () => {
        const { sink, text } = makeStringSink();
        const logger = new Logger({ sink });
        logger.bytecode([0x00, 0x12, 0x58, 0x95]);
        expect(text()).toContain("00 12 58 95");
    });

    it("formats a step with pc, opcode, sp, and stack", () => {
        const { sink, text } = makeStringSink();
        const logger = new Logger({ sink });
        logger.step(0x0004, 0x1d, [10, 33]);
        const joined = text();
        expect(joined).toContain("pc=0x0004");
        expect(joined).toContain("op=0x1d");
        expect(joined).toContain("sp=2");
        expect(joined).toContain("0a 21");
    });

    it("captures the error message and a truncated stack trace", () => {
        const { sink, text } = makeStringSink();
        const logger = new Logger({ sink });
        try {
            throw new Error("something failed");
        } catch (err) {
            logger.error("oops", err);
        }
        const joined = text();
        expect(joined).toContain("ERR! oops");
        expect(joined).toContain("something failed");
    });

    it("logs unconditional jumps as taken", () => {
        const { sink, text } = makeStringSink();
        const logger = new Logger({ sink });
        logger.jump(0x0004, 0x0010, true, false);
        expect(text()).toContain("JMP 0x0004 -> 0x0010 (taken)");
    });

    it("logs conditional jumps as taken or not taken", () => {
        const { sink, text } = makeStringSink();
        const logger = new Logger({ sink });
        logger.jump(0x0006, 0x0002, true, true);
        logger.jump(0x0008, 0x0002, false, true);
        const joined = text();
        expect(joined).toContain("JCN 0x0006 -> 0x0002 (taken)");
        expect(joined).toContain("JCN 0x0008 -> 0x0002 (not taken)");
    });

    it("logs RAM accesses", () => {
        const { sink, text } = makeStringSink();
        const logger = new Logger({ sink });
        logger.memory(0x10, 0x42, true);
        logger.memory(0x10, 0x42, false);
        const joined = text();
        expect(joined).toContain("RAM wrote 42 @ 10");
        expect(joined).toContain("RAM read  42 @ 10");
    });

    it("stop() is idempotent", () => {
        const { sink, lines } = makeStringSink();
        const logger = new Logger({ sink });
        logger.start();
        logger.stop();
        const before = lines.length;
        logger.stop();
        expect(lines.length).toBe(before);
    });
});