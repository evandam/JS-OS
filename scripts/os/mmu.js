/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

function MMU() {
    this.process = null;  // the PCB of the current process
}

// add the base limit of the current process to the target address
MMU.prototype.translate = function (addr) {
    var trans = this.process.base + addr;
    if (this.inRange(trans))
        return trans;
    else {
        krnTrapError("ADDRESS OUT OF RANGE");
        _KernelInterruptQueue.enqueue(new Interrupt(KILL_IRQ, this.process));
    }
}

// target address must be within the process' base and limit
MMU.prototype.inRange = function (addr) {
    return this.process.base <= addr && this.process.limit >= addr;
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

// update the CPU state to match the next process' PCB from the ready queue
MMU.prototype.contextSwitch = function (nextProcess) {
    // push old pcb back to ready queue if there is one
    if (this.process) {
        ReadyQueue.push(this.process);
        updateReadyQueueDisplay();
    }
    // new process from the ready queue
    this.process = nextProcess;
    _CPU.PC = this.process.PC;
    _CPU.Acc = this.process.Acc;
    _CPU.Xreg = this.process.Xreg;
    _CPU.Yreg = this.process.Yreg;
    _CPU.Zflag = this.process.Zflag;
};

// update the current PCB to reflect the current state of the CPU
MMU.prototype.updatePCB = function () {
    this.process.PC = _CPU.PC;
    this.process.Acc = _CPU.Acc;
    this.process.Xreg = _CPU.Xreg;
    this.process.Yreg = _CPU.Yreg;
    this.process.Zflag = _CPU.Zflag;
};