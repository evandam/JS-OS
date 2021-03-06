/* ------------
   Console.js

   Requires globals.js

   The OS Console - stdIn and stdOut by default.
   Note: This is not the Shell.  The Shell is the "command line interface" (CLI) or interpreter for this console.
   ------------ */

function CLIconsole() {
    // Properties
    this.CurrentFont      = _DefaultFontFamily;
    this.CurrentFontSize  = _DefaultFontSize;
    this.CurrentXPosition = 0;
    this.CurrentYPosition = _DefaultFontSize;
    this.buffer = "";
        
    // Track history of recent commands
    this.history = [];
    this.history_index = 0;	// be able to navigate up and down
    
    // Methods
    this.init = function() {
       this.clearScreen();
       this.resetXY();
    };

    this.clearScreen = function() {
       _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
    };

    this.resetXY = function() {
       this.CurrentXPosition = 0;
       this.CurrentYPosition = this.CurrentFontSize;
    };

    this.handleInput = function() {
       while (_KernelInputQueue.getSize() > 0)
       {
           // Get the next character from the kernel input queue.
           var chr = _KernelInputQueue.dequeue();
           // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
           if (chr == String.fromCharCode(13))  //     Enter key
           {
               // The enter key marks the end of a console command, so ...
               // ... tell the shell ...
               _OsShell.handleInput(this.buffer);
               
               // Add the cmd to history 
               this.history.push(this.buffer);
               this.history_index = this.history.length;	// should point to the most recent
               
               // ... and reset our buffer.
               this.buffer = "";
           }
           // Handle backspace
           else if(chr == String.fromCharCode(8)) {
        	   if(this.buffer.length > 0) {
        		   var last = this.buffer[this.buffer.length - 1];	
        	 	   this.buffer = this.buffer.slice(0, -1);	// remove the last character from the buffer
        	 	   // calculate the width of the character
        	 	   var offset = _DrawingContext.measureText(this.CurrentFont, this.CurrentFontSize, last);
        	 	   
        	 	   // have to backspacing a wrapped line...this isn't perfect but gets the job done
        	 	   if(this.CurrentXPosition <= 0) {
        	 		   this.CurrentYPosition -= this.CurrentFontSize + _FontHeightMargin;
        	 		   this.CurrentXPosition = _Canvas.width;
        	 	   }
        	 	   
        	 	   this.erase(offset); 
        	   }
           }
           
           // Arrow keys
           else if(chr == String.fromCharCode(18)) {	// up arrow
        	   if(this.history.length > 0) {
        		   if(this.history_index > 0) {
        			   this.history_index--;	// go back in history, but not negative...
        		   }
        		   
        		   this.clearLine();
        		   this.buffer = this.history[this.history_index];
        		   this.putText(this.buffer);
        	   }
           }
           else if(chr == String.fromCharCode(20)) { 	// down arrow
        	   if(this.history.length > 0) {
        		   if(this.history_index < this.history.length - 1) {
        			   this.history_index++;	// go forward in history, but not into the future...
        		   }
        		   
        		   this.clearLine();
        		   this.buffer = this.history[this.history_index];
        		   this.putText(this.buffer);
        	   }
           }
           
           // TODO: Write a case for Ctrl-C.
           else
           {
               // This is a "normal" character, so ...
               // ... draw it on the screen...
               this.putText(chr);
               // ... and add it to our buffer.
               this.buffer += chr;
           }
       }
    };

    this.putText = function(text) {
       // My first inclination here was to write two functions: putChar() and putString().
       // Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
       // between the two.  So rather than be like PHP and write two (or more) functions that
       // do the same thing, thereby encouraging confusion and decreasing readability, I
       // decided to write one function and use the term "text" to connote string or char.
       if (text !== "")
       {
    	   // Added wrapping to next line - char by char
    	   for(var i in text) {
    		   
    		   var offset = _DrawingContext.measureText(this.CurrentFont, this.CurrentFontSize, text[i]);
    		   // move to next line if character is going to be off the canvas
    		   if(this.CurrentXPosition + offset >= _Canvas.width) {
	        	   this.advanceLine();
	           }
    		   
	           // Draw the text at the current X and Y coordinates.
	           _DrawingContext.drawText(this.CurrentFont, this.CurrentFontSize, this.CurrentXPosition, this.CurrentYPosition, text[i]);
	         // Move the current X position.
	      	 	this.CurrentXPosition = this.CurrentXPosition + offset;
           }
       }
    };

    this.advanceLine = function() {
       this.CurrentXPosition = 0;
       
       if(this.CurrentYPosition < _Canvas.height - _DefaultFontSize - _FontHeightMargin) {
    	   this.CurrentYPosition += _DefaultFontSize + _FontHeightMargin;
       }
       else {
    	   // On the last line... keep the CurrentYPos on this line now but scroll everything up
    	   this.CurrentYPosition = _Canvas.height - _FontHeightMargin;
    	   this.scroll();
       }
    };
    
    // Scrolling implementation
    this.scroll = function() {
    	var lineHeight = this.CurrentFontSize + _FontHeightMargin;
    	// Save state of current canvas, clear it, redraw it one line higher.
    	var img = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);
    	_DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
    	_DrawingContext.putImageData(img, 0, -lineHeight);
    };
    
    // erase the current command (helpful for history)
    this.clearLine = function() {
    	var offset = _DrawingContext.measureText(this.CurrentFont, this.CurrentFontSize, this.buffer);
    	this.erase(offset);
    };
    
    // erase space from canvas and reset x position
    this.erase = function(offset) {
    	this.CurrentXPosition -= offset;
    	_DrawingContext.clearRect(this.CurrentXPosition, this.CurrentYPosition - this.CurrentFontSize, 
    							  offset, this.CurrentFontSize + _FontHeightMargin + 1);	//	A little extra padding for those pesky j, g, and p's...
    };
    
    // Shell command causes kernel to trap an error, CLI makes a blue screen!
    this.screenOfDeath = function(msg) {
    	this.clearScreen();
    	_DrawingContext.fillStyle = "red";
    	_DrawingContext.fillRect(0, 0, _Canvas.width, _Canvas.height);
    	this.resetXY();
    	this.putText(msg);
    	this.advanceLine();
    	this.putText("The OS is shutting down.");
    	this.advanceLine();
    	this.putText("Please try restarting.");
    	hostStatus("Something horrible happened!");
    };
    
}
