import type { CPUDisplay } from "../cpu/io.js";

/**
 * A CPUDisplay that draws to a 2D canvas. Used by the web API whenever the
 * caller provides a <canvas> element, and by the desktop app's renderer.
 *
 * Both SHW and PRT clear the canvas first, so they show one frame at a time.
 */
export class CanvasDisplay implements CPUDisplay {
    private readonly ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
    }

    showTop(value: number): void {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);
        const size = (value % 100) + 10;
        this.ctx.fillStyle = `rgb(${value}, ${255 - value}, 128)`;
        this.ctx.fillRect(50, 50, size, size);
    }

    printStack(values: readonly number[]): void {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);
        values.forEach((val, i) => {
            this.ctx.fillStyle = `hsl(${val}, 100%, 50%)`;
            this.ctx.fillRect(i * 10, 200 - val, 8, val);
        });
    }
}