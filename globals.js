/* ------------  
   Globals.js

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)
   
   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

//
// Global CONSTANTS
//
var APP_NAME = "EV-OS";  // 'cause I was at a loss for a better name.
var APP_VERSION = "0.05";   // What did you expect?

var CPU_CLOCK_INTERVAL = 50;   // This is in ms, or milliseconds, so 1000 = 1 second.

var TIMER_IRQ = 0;  // Pages 23 (timer), 9 (interrupts), and 561 (interrupt priority).
                    // NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
var KEYBOARD_IRQ = 1;

var SYSCALL_IRQ = 2;

var SINGLESTEP_IRQ = 3;

var END_IRQ = 4;    // end process normally

var KILL_IRQ = 5;   // end process abnormally

var CONTEXTSWITCH_IRQ = 6;

var FILESYSTEM_IRQ = 7;

// Scheduling Algorithm Constants
var ROUND_ROBIN = 'rr';
var FCFS = 'fcfs';
var PRIORITY = 'priority';

// Queues and lists for CPU scheduling
var ResidentList = [];
var ReadyQueue = [];

var MEMORY_SIZE = 768;

// Fixed Size Memory Allocation
var PARTITION_SIZE = 256;

var PARTITION_1 = {
    base: 0,
    limit: PARTITION_SIZE - 1,
    avail: true
};

var PARTITION_2 = {
    base: PARTITION_1.base + PARTITION_SIZE,
    limit: PARTITION_1.limit + PARTITION_SIZE,
    avail: true
};

var PARTITION_3 = {
    base: PARTITION_2.base + PARTITION_SIZE,
    limit: PARTITION_2.limit + PARTITION_SIZE,
    avail: true
};

// File system sizes
var TRACKS = 4;
var SECTORS = 8;
var BLOCKS = 8;
var BLOCK_SIZE = 64;
// operations to implement in filesystem API (pass in the isr)
var READ = 'read';
var WRITE = 'write';
var CREATE = 'create';
var DELETE = 'delete';
var FORMAT = 'format';
var LIST = 'ls';

//
// Global Variables
//
var _CPU = null;

var scheduler = null;

var _Memory = null;

var _OSclock = 0;       // Page 23.

var _Mode = 0;   // 0 = Kernel Mode, 1 = User Mode.  See page 21.

var _SingleStep = false;    // 

var _Canvas = null;               // Initialized in hostInit().
var _DrawingContext = null;       // Initialized in hostInit().
var _DefaultFontFamily = "sans";  // Ignored, I think. The was just a place-holder in 2008, but the HTML canvas may have use for it.
var _DefaultFontSize = 13;
var _FontHeightMargin = 4;        // Additional space added to font size when advancing a line.

// Default the OS trace to be on.
var _Trace = true;



// OS queues
var _KernelInterruptQueue = null;
var _KernelBuffers = null;
var _KernelInputQueue = null;

// Standard input and output
var _StdIn  = null;
var _StdOut = null;

// UI
var _Console = null;
var _OsShell = null;

// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode = false;

// Global Device Driver Objects - page 12
var krnKeyboardDriver = null;
var krnFileSystemDriver = null;

// For testing...
var _GLaDOS = null;
