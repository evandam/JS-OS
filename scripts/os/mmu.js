/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

function MMU() {
   
}

// add the base limit of the current process to the target address
MMU.prototype.translate = function (addr) {
    var trans = _CPU.process.base + addr;
    if (this.inRange(trans))
        return trans;
    else {
        krnTrapError("ADDRESS OUT OF RANGE");
        _KernelInterruptQueue.enqueue(new Interrupt(KILL_IRQ, _CPU.process));
    }
}

// target address must be within the process' base and limit
MMU.prototype.inRange = function (addr) {
    return _CPU.process.base <= addr && _CPU.process.limit >= addr;
};

// TODO: will eventually need to translate logical/physical addresses
// easy enough...just addr + pcb.base, but thats for project 3...
MMU.prototype.read = function (addr) {
    addr = this.translate(addr);
    return _Memory.mem[addr];   // check base/limit here
};

MMU.prototype.write = function (addr, byte) {
    addr = this.translate(addr);
    // need to convert the byte (base 10) to hex.
    var hex = byte.toString(16);
    if (hex.length === 1)   // leading 0
        hex = '0' + hex;
    _Memory.mem[addr].hi = hex.charAt(0);
    _Memory.mem[addr].lo = hex.charAt(1);
};
