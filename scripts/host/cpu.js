/* ------------  
   CPU.js

   Requires global.js.
   
   Routines for the host CPU simulation, NOT for the OS itself.  
   In this manner, it's A LITTLE BIT like a hypervisor,
   in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
   that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
   JavaScript in both the host and client environments.

   This code references page bytebers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

var pid = 0;    // CHANGE THIS TO GET PID OF RUNNING PROCESS!!!!!

function Cpu() {
    this.PC    = 0;     // Program Counter
    this.Acc   = 0;     // Accumulator
    this.Xreg  = 0;     // X register
    this.Yreg  = 0;     // Y register
    this.Zflag = 0;     // Z-ero flag (Think of it as "isZero".)
    this.isExecuting = false;
    
    this.init = function() {
        this.PC    = 0;
        this.Acc   = 0;
        this.Xreg  = 0;
        this.Yreg  = 0;
        this.Zflag = 0;      
        this.isExecuting = false;
        this.mmu = new MMU();
    };
    
    this.cycle = function() {
        krnTrace("CPU cycle");

        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.
        
        // Fetch the next instruction, increment PC
        var instr = this.mmu.read(pid, this.PC++).toHex();
        // Decode the instruction and execute it.
        // Stop execution and trap an error if unrecognized instruction
        this.decode(instr);

        updateCPUDisplay();
    };

    // interpret a 6502a instruction and call the corresponding function
    this.decode = function (instr) {
        switch (instr) {
            case 'A9':
                this.LDA_C();
                break;
            case 'AD':
                this.LDA_M();
                break;
            case '8D':
                this.STA();
                break;
            case '6D':
                this.ADC();
                break;
            case 'A2':
                this.LDX_C();
                break;
            case 'AE':
                this.LDX_M();
                break;
            case 'A0':
                this.LDY_C();
                break;
            case 'AC':
                this.LDY_M();
                break;
            case 'EA':  //no op, just add PC and move to next instr
                this.PC++;
                break;
            case '00':
                this.BRK(); 
                break;
            case 'EC':
                this.CPX();
                break;
            case 'D0':
                this.BNE();
                break;
            case 'EE':
                this.INC();
                break;
            case 'FF':
                this.SYS(); 
                break;
            default:
                this.isExecuting = false;
                krnTrapError("Invalid 6502a instruction: " + instr);
        }
    };

    // Get the memory address pointed to by the PC and parse it from hex to dec
    // Advance the PC, too
    this.getAddress = function (pid) {
        var addr = this.mmu.read(pid, this.PC++).toHex();
        addr = this.mmu.read(pid, this.PC++).toHex() + addr; // it seems like order shoud be other way around
        addr = parseInt(addr, 16);  // need to convert from hex to decimal
        return addr;
    };

    // Gets the integer (base 10) pointed to by current PC
    this.getByte = function (pid) {
        var addr = this.getAddress(pid);
        return this.mmu.read(pid, addr).toDecimal();
    };

    // A9 - load accumulator with a constant
    this.LDA_C = function () {
        // the constant is in the next memory address
        var c = this.mmu.read(pid, this.PC++).toDecimal();   // post-increment the Program Counter for the next instruction
        this.Acc = c;       // Acc stores a DECIMAL INTEGER
    };

    // AD - load accumulator from memory
    this.LDA_M = function () {
        var addr = this.getAddress(pid);
        this.Acc = this.mmu.read(pid, addr).toDecimal();
    };

    // 8D - store accumulator in memory
    this.STA = function () {
        var addr = this.getAddress(pid);
        this.mmu.write(pid, addr, this.Acc);
        updateMemoryDisplay();  // writing to memory, so the display should be updated
    };

    // 6D - Add with carry (add conents of an address to contents of accumulator. results kept in Acc
    this.ADC = function () {
        this.Acc += this.getByte();  
    };

    // A2 - Load XReg with constant
    this.LDX_C = function () {
        var c = this.mmu.read(pid, this.PC++).toDecimal();
        this.Xreg = c;
    };

    // AE - Load XReg from memory
    this.LDX_M = function () {
        this.Xreg = this.getByte();
    };

    // A0 - Load YReg with constant
    this.LDY_C = function () {
        var c = this.mmu.read(pid, this.PC++).toDecimal();
        this.Yreg = c;
    };

    // AC - Load YReg from memory
    this.LDY_M = function () {
        this.Yreg = this.getByte();
    };

    // 00 - break (system call)
    this.BRK = function () {
        // stop execution
        this.isExecuting = false;
    }

    // EC - Compare byte in mem to XReg - sets ZFlag if equal
    this.CPX = function () {
        var byte = this.getByte();
        if (byte === this.Xreg)
            this.Zflag = 1;
        else
            this.Zflag = 0;
    };

    //D0 - Branch X bytes if Zflag == 0
    this.BNE = function () {
        if (this.Zflag === 0) {
            var distance = this.mmu.read(pid, this.PC++).toDecimal();
            this.PC += distance;
            // wrap-around to branch backwards
            if (this.PC >= 256)
                this.PC -= 256;
        }
        else
            this.PC += 2;    // skip branch params
    };

    // EE - Increment value of a byte
    this.INC = function () {
        // save target addr since writing back to it
        var targetAddr = this.mmu.read(pid, this.PC).toHex();
        targetAddr = this.mmu.read(pid, this.PC + 1).toHex() + targetAddr;
        var byte = this.getByte();
        byte++;
        // write incremented byte back to address
        this.mmu.write(pid, parseInt(targetAddr, 16), byte);  // write back to memory
    };

    // FF - Syscall
    this.SYS = function () {
        // print integer stored in YReg
        var arg = '';
        if (this.Xreg === 1) {
            arg = this.Yreg.toString();
        }
        // print 00-terminated string stored at address in YReg
        else if (this.Xreg === 2) {
            // need to parse out ascii and go until 00 reached
            var startAddr = this.Yreg;
            arg = this.mmu.read(pid, startAddr).toDecimal();
        }
        _KernelInterruptQueue.enqueue( new Interrupt(SYSCALL_IRQ,arg) );
    };
}
