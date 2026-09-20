// --------------------------------------------------------- //
// DISPLAY.ts
// --------------------------------------------------------- //

import Stack from './stack.js';

export default class Display {
    private ctx: CanvasRenderingContext2D;
    constructor(canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d")!;
    }

    showTop(value: number) {
        this.ctx.clearRect(0, 0, 256, 256);
        // Draw a cube whose size depends on value
        const size = value % 100 + 10;
        this.ctx.fillStyle = `rgb(${value}, ${255-value}, 128)`;
        this.ctx.fillRect(50, 50, size, size);
    }

    printStack(stack: Stack) {
        // Draw bars for each stack item
        this.ctx.clearRect(0, 0, 256, 256);
        for (let i = 0; i < stack.getStackPointer(); i++) {
        const val = stack.getStackData()[i] || 0;
        this.ctx.fillStyle = `hsl(${val}, 100%, 50%)`;
        this.ctx.fillRect(i * 10, 200 - val, 8, val);
        }
    }
}