/* ------------  
   CPU.js

   Requires global.js.
   
   Routines for the host CPU simulation, NOT for the OS itself.  
   In this manner, it's A LITTLE BIT like a hypervisor,
   in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
   that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
   JavaScript in both the host and client environments.

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

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
        
        // CPU can fetch, decode, and execute once per cycle
        var instr = _Memory.mem[this.PC];   // intermediary through MMU?
        this.decode(instr);

        updateCPUDisplay();
        updateMemoryDisplay();
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
            case 'EA':  //no op
                break;
            case '00':
                this.BRK(); // sys-call?
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
                this.SYS(); // 01 in X = print int in y, 02 in X = print 00-term string in address at Y
                break;
            default:
                krnTrapError("Invalid 6502a instruction: " + instr);
        }
    };
}
