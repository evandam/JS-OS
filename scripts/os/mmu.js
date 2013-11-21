/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

function MMU() {
   
}

// add the base limit of the current process to the target address
MMU.prototype.translate = function (addr) {
    var trans = _CPU.process.partition.base + addr;
    if (this.inRange(trans))
        return trans;
    else {
        krnTrapError("ADDRESS OUT OF RANGE");
        _KernelInterruptQueue.enqueue(new Interrupt(KILL_IRQ, _CPU.process));
    }
}

// target address must be within the process' base and limit
MMU.prototype.inRange = function (addr) {
    return _CPU.process.partition.base <= addr && _CPU.process.partition.limit >= addr;
};

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

    // update the display of this block
    updateMemoryDisplay(addr, hex);
};

// check if there are any free partitions
MMU.prototype.getFreePartition = function () {
    if (PARTITION_1.avail)
        return PARTITION_1;
    else if (PARTITION_2.avail)
        return PARTITION_2;
    else if (PARTITION_3.avail)
        return PARTITION_3;
    else
        return DISK_PARTITION;
}

// load a process from disk into memory
MMU.prototype.rollIn = function (pcb, partition) {
    console.log(pcb);
    console.log(partition);
};

// store a process from memory to disk
// try to use the active process since it will be the last to go next in RR
// otherwise get the last process from the ready queue
// if there aren't actually any running processes, we just take the first loaded one out of the resident list
MMU.prototype.rollOut = function () {
    // use active process or last in ready
    if (!_CPU.process)
        _CPU.process = ReadyQueue.pop();
    // if none in ready queue use one from resident
    if (!_CPU.process) {
        for (var i = 0; i < ResidentList.length; i++) {
            if (ResidentList[i].status == LOADED) {
                _CPU.process = ResidentList[i];
                break;
            }
        }
    }
    var instructions = [];
    for (var addr = 0; addr < PARTITION_SIZE; addr++) {
        instructions.push(this.read(addr).toHex());
    }
    // swap files are defined by the format "$WAP#" where # is the PID of the process
    var filename = SWAP + _CPU.process.pid;
    // create the swap file and the process' instructions to it
    _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [CREATE, filename]));
    _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [WRITE, filename, instructions.join(' ')]));

    // process is now on disk and has the partition is free
    
    var partition = _CPU.process.partition;
    _CPU.partition = DISK_PARTITION;
    _CPU.process.status = ONDISK;
    partition.avail = true;

    // set the cpu process to null until the next one is rolled in
    _CPU.process = null;

    // return the free partition for rollIn
    return partition;
};
