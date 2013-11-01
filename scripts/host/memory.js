// Simulation of physical main memory
function Memory () {
    this.size = MEMORY_SIZE;    // 768 bytes (enough for 3 processes)
    this.mem = [];

    for (var i = 0; i < this.size; i++) {
        this.mem[i] = new MemoryCell();    // initialize all bytes to zero - change this to a memory cell prototype
    }
};

function MemoryCell() {
    this.lo = '0';
    this.hi = '0';
};

MemoryCell.prototype.toHex = function () {
    return this.hi + "" + this.lo;
};

MemoryCell.prototype.toDecimal = function () {
    return parseInt(this.hi + this.lo, 16);
};