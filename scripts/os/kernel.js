/* ------------
   Kernel.js
   
   Requires globals.js
   
   Routines for the Operating System, NOT the host.
   
   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */


//
// OS Startup and Shutdown Routines   
//
function krnBootstrap()      // Page 8.
{
   hostLog("bootstrap", "host");  // Use hostLog because we ALWAYS want this, even if _Trace is off.

   // Initialize our global queues.
   _KernelInterruptQueue = new Queue();  // A (currently) non-priority queue for interrupt requests (IRQs).
   _KernelBuffers = new Array();         // Buffers... for the kernel.
   _KernelInputQueue = new Queue();      // Where device input lands before being processed out somewhere.
   _Console = new CLIconsole();          // The command line interface / console I/O device.

   // Initialize the CLIconsole.
   _Console.init();

   // Initialize standard input and output to the _Console.
   _StdIn  = _Console;
   _StdOut = _Console;

   // Load the Keyboard Device Driver
   krnTrace("Loading the keyboard device driver.");
   krnKeyboardDriver = new DeviceDriverKeyboard();     // Construct it.  TODO: Should that have a _global-style name?
   krnKeyboardDriver.driverEntry();                    // Call the driverEntry() initialization routine.
   krnTrace(krnKeyboardDriver.status);

   //
   // ... more?
   //

   // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
   krnTrace("Enabling the interrupts.");
   krnEnableInterrupts();

   // Launch the shell.
   krnTrace("Creating and Launching the shell.");
   _OsShell = new Shell();
   _OsShell.init();

   // Finally, initiate testing.
   if (_GLaDOS) {
      _GLaDOS.afterStartup();
   }
}

function krnShutdown()
{
    krnTrace("begin shutdown OS");
    // TODO: Check for running processes.  Alert if there are some, alert and stop.  Else...    
    // ... Disable the Interrupts.
    krnTrace("Disabling the interrupts.");
    krnDisableInterrupts();
    // 
    // Unload the Device Drivers?
    // More?
    //
    krnTrace("end shutdown OS");
}


function krnOnCPUClockPulse() 
{
    /* This gets called from the host hardware sim every time there is a hardware clock pulse.
       This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
       This, on the other hand, is the clock pulse from the hardware (or host) that tells the kernel 
       that it has to look for interrupts and process them if it finds any.                           */

    // Check for an interrupt, are any. Page 560
    if (_KernelInterruptQueue.getSize() > 0)    
    {
        // Process the first interrupt on the interrupt queue.
        // TODO: Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
        var interrupt = _KernelInterruptQueue.dequeue();
        krnInterruptHandler(interrupt.irq, interrupt.params);
    }
    else if (_CPU.isExecuting) // If there are no interrupts then run one CPU cycle if there is anything being processed.
    {
        CURRENT_CYCLE++;
        scheduleCPU();
   
        // cycles will be handled with interrupts if single step is enabled
        if(!_SingleStep)
            _CPU.cycle();
    }    
    else                       // If there are no interrupts and there is nothing being executed then just be idle.
    {
       krnTrace("Idle");
    }
}


// 
// Interrupt Handling
// 
function krnEnableInterrupts()
{
    // Keyboard
    hostEnableKeyboardInterrupt();
    // Put more here.
}

function krnDisableInterrupts()
{
    // Keyboard
    hostDisableKeyboardInterrupt();
    // Put more here.
}

function krnInterruptHandler(irq, params)    // This is the Interrupt Handler Routine.  Pages 8 and 560.
{
    // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on.  Page 766.
    krnTrace("Handling IRQ~" + irq);

    // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
    // TODO: Consider using an Interrupt Vector in the future.
    // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.  
    //       Maybe the hardware simulation will grow to support/require that in the future.
    switch (irq)
    {
        case TIMER_IRQ: 
            krnTimerISR();                   // Kernel built-in routine for timers (not the clock).
            break;
        case KEYBOARD_IRQ: 
            krnKeyboardDriver.isr(params);   // Kernel mode device driver
            _StdIn.handleInput();
            break;
        case LOAD_IRQ:
            krnLoadProcess(params);
            break;
        case RUN_IRQ:
            krnRunProcess(params);
            break;
        case RUNALL_IRQ:
            krnRunAll(params);
            break;
        case SYSCALL_IRQ:
            krnSyscall(params);
            break;
        case END_IRQ:
            krnEndProcess(params);
            break;
        case KILL_IRQ:
            krnEndProcessAbnormally(params);
            break;
        case CONTEXTSWITCH_IRQ:
            contextSwitch();
            break;
        default: 
            krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
    }
}

function krnTimerISR()  // The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver).
{
    // Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
}   



//
// System Calls... that generate software interrupts via tha Application Programming Interface library routines.
//
// Some ideas:
// - ReadConsole
// - WriteConsole
// - CreateProcess
// - ExitProcess
// - WaitForProcessToExit
// - CreateFile
// - OpenFile
// - ReadFile
// - WriteFile
// - CloseFile


//
// OS Utility Routines
//
function krnTrace(msg)
{
   // Check globals to see if trace is set ON.  If so, then (maybe) log the message. 
   if (_Trace)
   {
      if (msg === "Idle")
      {
         // We can't log every idle clock pulse because it would lag the browser very quickly.
         if (_OSclock % 10 == 0)  // Check the CPU_CLOCK_INTERVAL in globals.js for an 
         {                        // idea of the tick rate and adjust this line accordingly.
            hostLog(msg, "OS");
         }         
      }
      else
      {
       hostLog(msg, "OS");
      }
   }
}
   
function krnTrapError(msg)
{
    hostLog("OS ERROR - TRAP: " + msg);
    // TODO: Display error on console, perhaps in some sort of colored screen. (Perhaps blue?)
    
}

// Load validated 6502a instructions to memory, assign a PID and PCB.
// Return the PID to be printed by the console
function krnLoadProcess(instructions) {

    var pcb = new PCB();

    // Check which partitions are available for limits
    if (PARTITION_1.avail) {
        pcb.init(PARTITION_1.base, PARTITION_1.limit);
        PARTITION_1.avail = false;
    }
    else if (PARTITION_2.avail) {
        pcb.init(PARTITION_2.base, PARTITION_2.limit);
        PARTITION_2.avail = false;
    }
    else if (PARTITION_3.avail) {
        pcb.init(PARTITION_3.base, PARTITION_3.limit);
        PARTITION_3.avail = false;
    }
    else {
        krnTrapError("Unable to allocate a partition for the process");
        _StdIn.putText("Memory full!");
        _StdIn.advanceLine();
        _OsShell.putPrompt();
        return;
    }

    // bounds checks while loading in the new process
    var oldpcb = _CPU.process;
    _CPU.process = pcb;
    for (var i = 0; i < instructions.length; i++) {
        _CPU.mmu.write(i, instructions[i]);
    }
    _CPU.process = oldpcb;
    
    // add the process to the resident queue now that it is loaded
    ResidentList.push(pcb);

    pcb.status = 'Loaded';

    _StdIn.putText("Process created with PID=" + pcb.pid);
    _StdIn.advanceLine();
    _OsShell.putPrompt();
}

function krnRunProcess(pid) {
    // get the process with the matching PID from the resident list
    var pcb = null;
    for (var i = 0; i < ResidentList.length; i++) {
        if (ResidentList[i].pid == pid) {
            pcb = ResidentList[i];
            ReadyQueue.push(pcb);
            pcb.status = 'Ready';
            // start the cpu if it isn't executing
            // if it is running, the process is just pushed to the back of the queue
            if (!_CPU.isExecuting) {
                contextSwitch();
                _CPU.isExecuting = true;
            }
            updateReadyQueueDisplay();
            break;
        }
    }
    if (pcb == null) {
        _StdIn.putText("Could not find process with PID=" + pid);
        _StdIn.advanceLine();
        _OsShell.putPrompt();
    }
}

// run all processes and let the schedule determine which processes to
// allocate CPU time
function krnRunAll() {
    // add all processes to the ready queue
    for (var i = 0; i < ResidentList.length; i++) {
        ReadyQueue.push(ResidentList[i]);
    }
    updateReadyQueueDisplay();

    // start the first process in the queue
    contextSwitch();
    _CPU.isExecuting = true;
}

// Handle a syscall (FF) from a process by printing to console
function krnSyscall(arg) {
    _StdIn.putText(arg);
}

// If single step is enabled, this interrupt is enqueued to advance the CPU
function singleStep() {
    _CPU.cycle();
}

// process terminated self
// print the ending state of the PCB
// and pop it off the resident list since it no longer needs to be in memory.
function krnEndProcess(pcb) {

    // the process is currently running
    if (pcb.pid === _CPU.process.pid) {
        // set the process to null, so it won't go back on the ready queue
        _CPU.process = null;
        // let round robin start the next process without waiting for quantum to expire
        CURRENT_CYCLE = 0;

        // start the next process if there is one, otherwise stop execution
        if (ReadyQueue.length > 0) {
            contextSwitch();
        }
        else {
            _CPU.isExecuting = false;
        }
    }
    // if its not the active process it must be in the ready queue
    else {
        var index = ReadyQueue.indexOf(pcb);
        if (index > -1)
            ReadyQueue.splice(index, 1);
    }

    // remove the process from the resident list
    var index = ResidentList.indexOf(pcb);
    if (index > -1)
        ResidentList.splice(index, 1);
    
    // free up the partition of memory it occupied
    if (pcb.limit < PARTITION_SIZE)
        PARTITION_1.avail = true;
    else if (pcb.limit < PARTITION_SIZE * 2)
        PARTITION_2.avail = true;
    else
        PARTITION_3.avail = true;

    updateReadyQueueDisplay();

    /*
    _StdIn.advanceLine();
    _StdIn.putText(pcb.toString());
    _StdIn.advanceLine();
    */
}

function krnEndProcessAbnormally(pcb) {
    _StdIn.advanceLine();
    _StdIn.putText("Ended Process Abnormally!");
    krnEndProcess(pcb);
}

// update the CPU state to match the next process' PCB from the ready queue
function contextSwitch() {
    hostLog("Context switching");

    // flip the mode bit - these are kernel mode operations
    _Mode = 0;
   
    if (_CPU.process) {
        // save the current state of the CPU in the PCB
        updatePCB();
        _CPU.process.status = 'Ready';
        // push the process back on the ready queue for the next round
        ReadyQueue.push(_CPU.process);

        updateReadyQueueDisplay();
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
    updateReadyQueueDisplay();
}

function updatePCB () {
    _CPU.process.PC = _CPU.PC;
    _CPU.process.Acc = _CPU.Acc;
    _CPU.process.Xreg = _CPU.Xreg;
    _CPU.process.Yreg = _CPU.Yreg;
    _CPU.process.Zflag = _CPU.Zflag;
};

// Round Robin Scheduling
function scheduleCPU() {
    if (CURRENT_CYCLE >= QUANTUM ) {
        _KernelInterruptQueue.enqueue(new Interrupt(CONTEXTSWITCH_IRQ));
        CURRENT_CYCLE = 0;
    }
}