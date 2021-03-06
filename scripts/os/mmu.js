﻿/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

function MMU() {
   
}

// add the base limit of the current process to the target address
MMU.prototype.translate = function (addr) {
    var trans = parseInt(_CPU.process.partition.base) + parseInt(addr);
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
    hostLog("Rolling in PID " + pcb.pid);
    partition.avail = false;
    pcb.partition = partition;

    // load the process from disk
    var filename = SWAP + pcb.pid;
    var data = krnRead(filename);
    
    var instructions = [];
    // instructions are all stored together but we know
    // that they are broken into blocks of 2 hex digits...
    for (var i = 0; i < data.length; i += 2) {
        instructions.push(data.substring(i, i + 2));
    }

    _CPU.process = pcb;
    // write the instructions into memory
    for (var i = 0; i < instructions.length; i++) {
        this.write(i, instructions[i]);
    }

    pcb.status = READY;
    return pcb;
};

// store a process from memory to disk
// First look for a loaded process that isn't running..
// Otherwise take out the process that is last on the ready queue
MMU.prototype.rollOut = function () {
    var process = null;
    // try to get a loaded process not running though
    for (var i = 0; i < ResidentList.length; i++) {
        if (ResidentList[i].status == LOADED) {
            process = ResidentList[i];
            break;
        }
    }
    if (!process) {
        // get the last process off the ready queue not already on disk
        for (var i = ReadyQueue.length - 1; i >= 0; i++) {
            if (ReadyQueue[i].status != ONDISK) {
                process = ReadyQueue[i];
                break;
            }
        }
    }

    hostLog("Rolling out PID " + process.pid);

    // save the data in the partition of the process
    var instructions = [];
    _CPU.process = process;
    for (var addr = 0; addr < PARTITION_SIZE; addr++) {
        var instr = this.read(addr);
        instructions.push(instr.toHex());
    }

    // swap files are defined by the format "$WAP#" where # is the PID of the process
    var filename = SWAP + process.pid;
    // create the swap file and the process' instructions to it
    krnCreate(filename);
    krnWrite(filename, instructions.join(''));

    // process is now on disk and has the partition is free   
    var freePartition = process.partition;
    freePartition.avail = true;
    process.partition = DISK_PARTITION;
    process.status = ONDISK;
    return freePartition;
};
