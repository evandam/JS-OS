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

MMU.prototype.write = function (pid, addr, toWrite) {
    _Memory.mem[addr] = toWrite;
}