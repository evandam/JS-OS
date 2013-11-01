/*
Prototype for Process Control Blocks
The PCB tracks the current state of registers, PC and flags, 
as well as the base and limit of the process's memory space.
*/
function PCB() {
    this.init = function (base, limit) {
        this.pid = _ResidentList.length;
        this.base = base;
        this.limit = limit;
        this.PC = base; // start PC at first location in process
        this.Acc = 0;
        this.Xreg = 0;
        this.Yreg = 0;
        this.Zflag = 0;
    };
};