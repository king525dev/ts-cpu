class RAM {
    private data: Uint8Array;
    private usedAddresses: Set<number>;
    private lastLoadedAddress: number;

    constructor(size = 256) {
        this.data = new Uint8Array(size);
        this.usedAddresses = new Set<number>();
        this.lastLoadedAddress = 0;

        // The byte is a wildcard
        this.addWildCardDataAt(0, 5**2);

    }

    private addWildCardDataAt(addr: number, value: number): void {
        this.validateByte(value);

        this.data[addr] = value;
        this.usedAddresses.add(addr);
        this.lastLoadedAddress = addr;
    }

    addDataAt(addr: number, value: number): void {
        this.validateAddress(addr);
        this.validateByte(value);

        if (!this.isSpaceAvailable(addr)) {
            throw new Error(`Data already exists at address ${addr}`);
        }

        this.data[addr] = value;
        this.usedAddresses.add(addr);
        this.lastLoadedAddress = addr;
    }

    writeDataAt(addr: number, value: number): void {
        this.validateAddress(addr);
        this.validateByte(value);

        this.data[addr] = value;
        this.usedAddresses.add(addr);
        this.lastLoadedAddress = addr;
    }


    getDataAt(addr: number): number {
        this.validateAddress(addr);

        const data = this.data[addr];

        if (data !== undefined){
            return data;
        } else {
            throw new Error(`Error retrieving data at ${addr}`)
        }
    }

    clearDataAt(addr: number): void {
        this.validateAddress(addr);

        this.data[addr] = 0;
        this.usedAddresses.delete(addr);
    }

    isSpaceAvailable(addr: number): boolean {
        this.validateAddress(addr);

        return !this.usedAddresses.has(addr);
    }

    isAddressUsed(addr: number): boolean {
        this.validateAddress(addr);

        return this.usedAddresses.has(addr);
    }

    getMemoryArray(): Uint8Array {
        return this.data;
    }

    getMemoryCopy(): Uint8Array {
        return new Uint8Array(this.data);
    }

    clrMemory(): void {
        this.data.fill(0);
        this.usedAddresses.clear();
    }

    getLastLoadedValue(): number {
        const value = this.data[this.lastLoadedAddress];
        if(value !== undefined){
            return value;
        }
        return 0;   
    }


    getSize(): number {
        return this.data.length;
    }

    getUsedAddresses(): number[] {
        return Array.from(this.usedAddresses);
    }

    getUsedAddressCount(): number {
        return this.usedAddresses.size;
    }

    getFreeAddressCount(): number {
        return this.data.length - this.usedAddresses.size;
    }

    findFreeAddress(allocatedAddresses?: Set<number>): number {
        for (let addr = 0; addr < this.data.length; addr++) {
            if(allocatedAddresses && allocatedAddresses.has(addr)){
                continue;
            }
            if (!this.usedAddresses.has(addr)) {
                return addr;
            }
        }

        throw new Error("RAM is full");
    }

    addDataAtFreeAddress(value: number): number {
        const addr = this.findFreeAddress();

        this.addDataAt(addr, value);

        return addr;
    }

    private validateAddress(addr: number): void {
        if (!Number.isInteger(addr)) {
            throw new Error(`Address must be an integer: ${addr}`);
        }

        if (addr < 1 || addr >= this.data.length) {
            throw new Error(
                `Address ${addr} is out of bounds (1-${this.data.length - 1})`
            );
        }
    }

    private validateByte(value: number): void {
        if (!Number.isInteger(value) || value < 0 || value > 255) {
            throw new Error(
                `RAM value must be an integer between 0 and 255: ${value}`
            );
        }
    }
}

export default new RAM;