// the default scheduler is round robin with a quantum of 6
function Scheduler() {
    this.cycle = 0;
    this.quantum = 6;
    this.algorithm = ROUND_ROBIN;
}

Scheduler.prototype.schedule = function () {
    if (!_CPU.isExecuting)
        _CPU.isExecuting = true;

    switch (this.algorithm) {
        case ROUND_ROBIN:
            this.roundRobin();
            break;
        case FCFS:
            this.fcfs();
            break;
        case PRIORITY:
            this.priority();
            break;
        default:
            krnTrapError("Invalid Scheduler!");
            _CPU.isExecuting = false;
            break;
    }
};

Scheduler.prototype.roundRobin = function () {
    // the current process finished
    if (!_CPU.process) {
        // let round robin start the next process without waiting for quantum to expire
        this.cycle = 0;

        // start the next process if there is one, otherwise stop execution
        if (ReadyQueue.length > 0) {
            _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
        }
        else {
            _CPU.isExecuting = false;
        }
    }
    else {
        this.cycle++;
        if (this.cycle >= this.quantum) {
            _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
            this.cycle = 0;
        }
    }
};

Scheduler.prototype.fcfs = function () {
    // non-preemptive, so we don't want to do anything if theres already a running process
    if (!_CPU.process) {
        // start the next process in the ready queue
        if (ReadyQueue.length > 0) {
            _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
        }
        else {
            _CPU.isExecuting = false;
        }
    }
};

Scheduler.prototype.priority = function () {
    // non-preemptive, so we don't want to do anything if theres already a running process
    if (!_CPU.process) {

    }
};

// update the CPU state to match the next process' PCB from the ready queue
Scheduler.prototype.contextSwitch = function () {
    hostLog("Context switching");

    // flip the mode bit - these are kernel mode operations
    _Mode = 0;
    if (_CPU.process) {
        // save the current state of the CPU in the PCB
        updatePCB();
        _CPU.process.status = 'Ready';
        // push the process back on the ready queue for the next round
        ReadyQueue.push(_CPU.process);

        updateProcessesDisplay();
    }
    // new process from the ready queue
    _CPU.process = ReadyQueue.shift();
    _CPU.process.status = 'Running';

    _CPU.PC = _CPU.process.PC;
    _CPU.Acc = _CPU.process.Acc;
    _CPU.Xreg = _CPU.process.Xreg;
    _CPU.Yreg = _CPU.process.Yreg;
    _CPU.Zflag = _CPU.process.Zflag;

    // done with kernel operations, flip back to user mode for processes
    _Mode = 1;
    updateProcessesDisplay();
};