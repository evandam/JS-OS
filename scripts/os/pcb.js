/*
Prototype for Process Control Blocks
The PCB tracks the current state of registers, PC and flags, 
as well as the base and limit of the process's memory space.
*/
function PCB() {
    this.init = function (base, limit) {
        if (ResidentList.length > 0)
            this.pid = ResidentList[ResidentList.length - 1].pid + 1;
        else
            this.pid = 0;
        this.base = base;
        this.limit = limit;
        this.PC = 0; 
        this.Acc = 0;
        this.Xreg = 0;
        this.Yreg = 0;
        this.Zflag = 0;
        this.priority = 1;
        this.status = '';
    };

    this.toString = function () {
        return '{PID: ' + this.pid +
       ', Status: ' + this.status +
       ', Priority: ' + this.priority + 
       ', Acc: ' + this.Acc +
       ', PC: ' + this.PC +
       ', Xreg: ' + this.Xreg +
       ', Yreg: ' + this.Yreg +
       ', Zflag: ' + this.Zflag +
       ', Base: ' + this.base +
       ', Limit: ' + this.limit + '}';
    }
};