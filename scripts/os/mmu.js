/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

function MMU() {
    
}

MMU.prototype.read = function (pid, addr) {
    return _Memory.mem[addr];   // check base/limit here
};

MMU.prototype.write = function (pid, addr, byte) {
    // need to convert the byte (base 10) to hex.
    var hex = byte.toString(16);
    if (hex.length === 1)   // leading 0
        hex = '0' + hex;
    _Memory.mem[addr].hi = hex.charAt(0);
    _Memory.mem[addr].lo = hex.charAt(1);
}

var MemoryManagementUnit = function () {
    this.PCBs = [];
    // TODO: memory access function for PCB with permission checks
};
