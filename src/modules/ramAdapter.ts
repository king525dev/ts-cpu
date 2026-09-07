import RAM from "../cpu/ram.js";

export default class ramOperations {
    ram: typeof RAM;

    constructor(){
        this.ram  = RAM;
    }

    addDataAtFreeAddress(value: number): number {
        return this.ram.addDataAtFreeAddress(value);
    }
}