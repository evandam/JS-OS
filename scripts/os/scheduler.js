// the default scheduler is round robin with a quantum of 6
function Scheduler() {
    this.cycle = 0;
    this.quantum = 6;
    this.algorithm = ROUND_ROBIN;
}

Scheduler.prototype.schedule = function () {
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
        // the process can execute a cycle and then check the quantum
        _CPU.cycle();
        this.cycle++;
        if (this.cycle >= this.quantum) {
            if (ReadyQueue.length > 0) {
                _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
            }
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
            _CPU.isExecuting = false;
        }
        else {
            _CPU.isExecuting = false;
        }
    }
    // there's still a process to execute
    else
        _CPU.cycle();
};

Scheduler.prototype.priority = function () {
    // non-preemptive, so we don't want to do anything if theres already a running process
    // this searches the queue in order, so it uses FCFS for tie breakers
    if (!_CPU.process) {
        if (ReadyQueue.length > 0) {
            var highestPriority = 0;
            for (var i = 0; i < ReadyQueue.length; i++) {
                if (ReadyQueue[i].priority > ReadyQueue[highestPriority].priority) {
                    highestPriority = i;
                }
            }
            var nextPCB = ReadyQueue[highestPriority];
            ReadyQueue.splice(highestPriority, 1);
            ReadyQueue.unshift(nextPCB);

            _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
            _CPU.isExecuting = false;
        }
        else {
            _CPU.isExecuting = false;
        }
    }
    // there's still a process to execute
    else
        _CPU.cycle();
};

// update the CPU state to match the next process' PCB from the ready queue
Scheduler.prototype.contextSwitch = function () {
    hostLog("Context switching");
    // flip the mode bit - these are kernel mode operations
    _Mode = 0;
    if (_CPU.process) {
        // save the current state of the CPU in the PCB
        _CPU.process.PC = _CPU.PC;
        _CPU.process.Acc = _CPU.Acc;
        _CPU.process.Xreg = _CPU.Xreg;
        _CPU.process.Yreg = _CPU.Yreg;
        _CPU.process.Zflag = _CPU.Zflag;

        _CPU.process.status = READY;
        // push the process back on the ready queue for the next round
        ReadyQueue.push(_CPU.process);
    }

    // new process from the ready queue
    var nextProcess = ReadyQueue.shift();
    // need to swap the file in from disk to mem
    if (nextProcess.status == ONDISK) {
        var partition = _CPU.mmu.getFreePartition();
        // roll a process out if no free partitions
        if (partition == DISK_PARTITION)
            partition = _CPU.mmu.rollOut();

        // roll the process we want to run in to the free partition
       nextProcess = _CPU.mmu.rollIn(nextProcess, partition);
    }

    _CPU.process = nextProcess;
    _CPU.process.status = RUNNING;

    _CPU.PC = _CPU.process.PC;
    _CPU.Acc = _CPU.process.Acc;
    _CPU.Xreg = _CPU.process.Xreg;
    _CPU.Yreg = _CPU.process.Yreg;
    _CPU.Zflag = _CPU.process.Zflag;

    if (!_CPU.isExecuting)
        _CPU.isExecuting = true;

    updateProcessesDisplay();
    // done with kernel operations, flip back to user mode for processes
    _Mode = 1;
};
