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
        this.PC = 0; 
        this.Acc = 0;
        this.Xreg = 0;
        this.Yreg = 0;
        this.Zflag = 0;
    };

    this.toString = function () {
        return '{PID: ' + this.pid +
       ', Acc: ' + this.Acc +
       ', PC: ' + this.PC +
       ', Xreg: ' + this.Xreg +
       ', Yreg: ' + this.Yreg +
       ', Zflag: ' + this.Zflag +
       ', Base: ' + this.base +
       ', Limit: ' + this.limit + '}';
    }
};