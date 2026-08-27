export default class RAM {
    private data: Uint8Array;
    private usedAddresses: Set<number>;

    constructor(size = 256) {
        this.data = new Uint8Array(size);
        this.usedAddresses = new Set<number>();
    }

    /**
     * Add data to a specific memory address.
     */
    addData(addr: number, value: number): void {
        this.validateAddress(addr);
        this.validateByte(value);

        if (!this.isSpaceAvailable(addr)) {
            throw new Error(`Data already exists at address ${addr}`);
        }

        this.data[addr] = value;
        this.usedAddresses.add(addr);
    }

    /**
     * Write/overwrite data at a specific address.
     *
     * Unlike addData(), this will overwrite existing data.
     */
    writeData(addr: number, value: number): void {
        this.validateAddress(addr);
        this.validateByte(value);

        this.data[addr] = value;
        this.usedAddresses.add(addr);
    }

    /**
     * Return the data stored at a specific address.
     */
    getData(addr: number): number {
        this.validateAddress(addr);

        return this.data[addr];
    }

    /**
     * Clear data at a specific address.
     */
    clearData(addr: number): void {
        this.validateAddress(addr);

        this.data[addr] = 0;
        this.usedAddresses.delete(addr);
    }

    /**
     * Check whether a specific address is unused.
     */
    isSpaceAvailable(addr: number): boolean {
        this.validateAddress(addr);

        return !this.usedAddresses.has(addr);
    }

    /**
     * Check whether a specific address contains data.
     */
    isAddressUsed(addr: number): boolean {
        this.validateAddress(addr);

        return this.usedAddresses.has(addr);
    }

    /**
     * Return the entire RAM array.
     */
    getMemoryArray(): Uint8Array {
        return this.data;
    }

    /**
     * Return a copy of the RAM array.
     *
     * This prevents external code from directly modifying RAM.
     */
    getMemoryCopy(): Uint8Array {
        return new Uint8Array(this.data);
    }

    /**
     * Clear all memory.
     */
    clrMemory(): void {
        this.data.fill(0);
        this.usedAddresses.clear();
    }

    /**
     * Return the size of the RAM.
     */
    getSize(): number {
        return this.data.length;
    }

    /**
     * Return all addresses currently containing data.
     */
    getUsedAddresses(): number[] {
        return Array.from(this.usedAddresses);
    }

    /**
     * Return the number of addresses currently being used.
     */
    getUsedAddressCount(): number {
        return this.usedAddresses.size;
    }

    /**
     * Return the number of free addresses.
     */
    getFreeAddressCount(): number {
        return this.data.length - this.usedAddresses.size;
    }

    /**
     * Find the first available memory address.
     */
    findFreeAddress(): number {
        for (let addr = 0; addr < this.data.length; addr++) {
            if (!this.usedAddresses.has(addr)) {
                return addr;
            }
        }

        throw new Error("RAM is full");
    }

    /**
     * Add data to the first available address.
     *
     * Returns the address where the data was stored.
     */
    addDataAtFreeAddress(value: number): number {
        const addr = this.findFreeAddress();

        this.addData(addr, value);

        return addr;
    }

    /**
     * Validate that an address exists in RAM.
     */
    private validateAddress(addr: number): void {
        if (!Number.isInteger(addr)) {
            throw new Error(`Address must be an integer: ${addr}`);
        }

        if (addr < 0 || addr >= this.data.length) {
            throw new Error(
                `Address ${addr} is out of bounds (0-${this.data.length - 1})`
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
