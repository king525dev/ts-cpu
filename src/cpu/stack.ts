export default class Stack {
    private data: Uint8Array;
    private sp: number;   // Stack Pointer

    constructor(size = 256) {
        this.data = new Uint8Array(size);
        this.sp = 0;
    }

    getStackPointer(): number {
        return this.sp;
    }

    getStackData(): Uint8Array {
        return this.data;
    }

    push(value: number): void {
        if (this.sp >= this.data.length) throw new Error("Stack overflow");
        this.data[this.sp++] = value & 0xFF;
    }

    pop(): number{
        if (this.sp === 0){
            throw new Error("Stack underflow");
        } else {
            this.data[--this.sp];
        }
        
        return ((this.data[this.sp]) ?? 0);
    }

    peek(offset = 0): number {
        return ((this.data[this.sp - 1 - offset]) ?? 0);
    }

    dup(): void {
        if (this.sp < 1) throw new Error("Stack underflow");
        this.push(this.peek());
    }

    swap(): void {
        const a = this.pop(), b = this.pop();
        this.push(a); this.push(b);
    }

    nip(): void {
        if (this.sp < 2) throw new Error("Not enough items");
        const top = this.pop();
        this.pop();          
        this.push(top);
    }

    ovr(): void {        
        if (this.sp < 2) throw new Error("Not enough items");
        this.push(this.peek(1));
    }

    rot(): void {    
        const c = this.pop(), b = this.pop(), a = this.pop();
        this.push(b); this.push(c); this.push(a);
    }

    clr(): void {
        this.sp = 0;
    }
}