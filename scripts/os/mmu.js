/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

function MMU() {
    this.PCBs = [];
    this.currentPid = 0;
}

MMU.prototype.read = function (pid, addr) {
    if(this.inRange(pid, addr))
        return _Memory.mem[addr];   // check base/limit here
    else
        krnTrapError("ACCESSED ADDRESS OUT OF RANGE");
};

MMU.prototype.write = function (pid, addr, byte) {
    if(this.inRange(pid, addr)) {
        // need to convert the byte (base 10) to hex.
        var hex = byte.toString(16);
        if (hex.length === 1)   // leading 0
            hex = '0' + hex;
        _Memory.mem[addr].hi = hex.charAt(0);
        _Memory.mem[addr].lo = hex.charAt(1);
    }
    else
        krnTrapError("ACCESSED ADDRESS OUT OF RANGE");
}

MMU.prototype.inRange = function (pid, addr) {
    var pcb = this.PCBs[pid];
    return pcb.base <= addr && pcb.limit >= addr;
}