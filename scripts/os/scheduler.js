// the default scheduler is round robin with a quantum of 6
function Scheduler() {
    this.cycle = 0;
    this.quantum = 6;
    this.algorithm = FIRST_COME_FIRST_SERVE;
}

Scheduler.prototype.schedule = function () {
    switch (this.algorithm) {
        case ROUND_ROBIN:
            this.roundRobin();
            break;
        case FIRST_COME_FIRST_SERVE:
            this.fcfs();
            break;
        default:
            krnTrapError("Invalid Scheduler!");
            _CPU.isExecuting = false;
            break;
    }
};

Scheduler.prototype.roundRobin = function () {
    this.cycle++;
    if (this.cycle >= this.quantum) {
        _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
        this.cycle = 0;
    }
};

Scheduler.prototype.fcfs = function () {
    /* DO NOTHING!
     * When a process terminates and there are other processes in the ready queue
     * The next one is automatically switched in
     */
};