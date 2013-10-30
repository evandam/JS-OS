/*
Prototype for Process Control Blocks
The PCB tracks the current state of registers, PC and flags, 
as well as the base and limit of the process's memory space.
*/
function PCB() {
    this.pid = 0;    // Process Identifier
    this.base = 0;    // will actually be 0 for iProject2
    this.limit = 0;    // 255 for iProject2...but MMU will eventually determine
    this.PC = 0;    // Current state of CPU for process's execution
    this.Acc = 0;
    this.Xreg = 0;
    this.Yreg = 0;
    this.Zflag = 0;

    this.init = function (base, limit, pc, x, y, z) {
        this.pid = _ResidentList.length;
        this.base = base;
        this.limit = limit;
        this.PC = pc;
        this.Xreg = x;
        this.Yreg = y;
        this.Zflag = z;
    };
};