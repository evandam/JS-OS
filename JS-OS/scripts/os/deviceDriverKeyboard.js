/* ----------------------------------
   DeviceDriverKeyboard.js
   
   Requires deviceDriver.js
   
   The Kernel Keyboard Device Driver.
   ---------------------------------- */

DeviceDriverKeyboard.prototype = new DeviceDriver;  // "Inherit" from prototype DeviceDriver in deviceDriver.js.

function DeviceDriverKeyboard()                     // Add or override specific attributes and method pointers.
{
    // "subclass"-specific attributes.
    // this.buffer = "";    // TODO: Do we need this?
    // Override the base method pointers.
    this.driverEntry = krnKbdDriverEntry;
    this.isr = krnKbdDispatchKeyPress;
    // "Constructor" code.
}

function krnKbdDriverEntry()
{
    // Initialization routine for this, the kernel-mode Keyboard Device Driver.
    this.status = "loaded";
    // More?
}

function krnKbdDispatchKeyPress(params)
{
    // Parse the params.    TODO: Check that they are valid and osTrapError if not.
    var keyCode = params[0];
    var isShifted = params[1];
    krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
    var chr = "";
    // Check to see if we even want to deal with the key that was pressed.
    if ( ((keyCode >= 65) && (keyCode <= 90)) ||   // A..Z
         ((keyCode >= 97) && (keyCode <= 123)) )   // a..z
    {
        // Determine the character we want to display.  
        // Assume it's lowercase...
        chr = String.fromCharCode(keyCode + 32);
        // ... then check the shift key and re-adjust if necessary.
        if (isShifted)
        {
            chr = String.fromCharCode(keyCode);
        }
        // TODO: Check for caps-lock and handle as shifted if so.
        _KernelInputQueue.enqueue(chr);        
    }    
    else if ( ((keyCode >= 48) && (keyCode <= 57)) ||   // digits 
               (keyCode == 32)                     ||   // space
               (keyCode == 13) )                        // enter
    {
        chr = String.fromCharCode(keyCode);
        
        // shifted digit
        if( (keyCode >= 48 && keyCode <= 57) && isShifted) {
        	 chr = String.fromCharCode( shifted_digit[keyCode - 48] );
        }
        
        _KernelInputQueue.enqueue(chr); 
    }
    
    // punctuation actually grouped together in JS KeyCodes and ASCII
    else if( keyCode >= 188 && keyCode <= 191) {
    	// 144 offset from JS -> ASCII, 32 bit offset for shifted characters
    	chr = !isShifted ? String.fromCharCode(keyCode - 144) : String.fromCharCode(keyCode - 128);
    	_KernelInputQueue.enqueue(chr);
    }
    
    // punctuation actually grouped together in JS KeyCodes and ASCII (32 offset)
    else if( keyCode >= 219 && keyCode <= 221) {
    	// 128 offset from JS -> ASCII, 32 bit offset for shifted characters
    	chr = !isShifted ? String.fromCharCode(keyCode - 128) : String.fromCharCode(keyCode - 96);
    	_KernelInputQueue.enqueue(chr);
    }
    
    // misc symbols and punctuation with conversions that need to be hardcoded
    else if (misc_punctuation[keyCode]) {
    	var code = misc_punctuation[keyCode];
    	chr = !isShifted ? String.fromCharCode(code[0]) : String.fromCharCode(code[1]);
    	_KernelInputQueue.enqueue(chr);
    }
    
    // backspace keycode = 8
    // TODO: Handle backspacing
    else if(keyCode === 8) {
    	console.log('backspace');
    }
    
    // error detection
    else {
    	// trap?
    }
}

// Keycodes for shifting a digit 0-9. ex. 1 + shift = '!' (keycode 33)
var shifted_digit = [41, 33, 64, 35, 38, 37, 94, 38, 42, 40];

// misc keycodes - key: js keycode, val: [ascii, ascii for key+shift]
var misc_punctuation = {
		186: [59, 58],
		187: [61, 43],
		222: [39, 34],
		192: [96, 126]
};
