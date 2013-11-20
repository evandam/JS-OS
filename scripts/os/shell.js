/* ------------
   Shell.js
   
   The OS Shell - The "command line interface" (CLI) for the console.
   ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

function Shell() {
    // Properties
    this.promptStr   = ">";
    this.commandList = [];
    this.curses      = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
    this.apologies   = "[sorry]";
    // Methods
    this.init        = shellInit;
    this.putPrompt   = shellPutPrompt;
    this.handleInput = shellHandleInput;
    this.execute     = shellExecute;
}

function shellInit() {
    var sc = null;
    //
    // Load the command list.

    // ver
    sc = new ShellCommand();
    sc.command = "ver";
    sc.description = "- Displays the current version data.";
    sc.func = shellVer;
    this.commandList.push(sc);
    
    // help
    sc = new ShellCommand();
    sc.command = "help";
    sc.description = "- This is the help command. Seek help.";
    sc.func = shellHelp;
    this.commandList.push(sc);
    
    // shutdown
    sc = new ShellCommand();
    sc.command = "shutdown";
    sc.description = "- Shuts down the virtual OS but leaves the underlying hardware simulation running.";
    sc.func = shellShutdown;
    this.commandList.push(sc);

    // cls
    sc = new ShellCommand();
    sc.command = "cls";
    sc.description = "- Clears the screen and resets the cursor position.";
    sc.func = shellCls;
    this.commandList.push(sc);

    // man <topic>
    sc = new ShellCommand();
    sc.command = "man";
    sc.description = "<topic> - Displays the MANual page for <topic>.";
    sc.func = shellMan;
    this.commandList.push(sc);
    
    // trace <on | off>
    sc = new ShellCommand();
    sc.command = "trace";
    sc.description = "<on | off> - Turns the OS trace on or off.";
    sc.func = shellTrace;
    this.commandList.push(sc);

    // rot13 <string>
    sc = new ShellCommand();
    sc.command = "rot13";
    sc.description = "<string> - Does rot13 obfuscation on <string>.";
    sc.func = shellRot13;
    this.commandList.push(sc);

    // prompt <string>
    sc = new ShellCommand();
    sc.command = "prompt";
    sc.description = "<string> - Sets the prompt.";
    sc.func = shellPrompt;
    this.commandList.push(sc);
    
    // date
    sc = new ShellCommand();
    sc.command = "date";
    sc.description = " - Displays the current date and time.";
    sc.func = function() {
    	date = new Date();
    	_StdIn.putText(date.toLocaleDateString() + " " + date.toLocaleTimeString());
    };
    this.commandList.push(sc);
    
    // whereami
    sc = new ShellCommand();
    sc.command = "whereami";
    sc.description = " - Displays the user's current location.";
    sc.func = function() {
    	_StdIn.putText("In a poorly lit room in front of a laptop.");
    };
    this.commandList.push(sc);
    
    // color
    sc = new ShellCommand();
    sc.command = "color";
    sc.description = " [<String>] - Set the background color. Add a color, or exclude for default.";
    sc.func = function(args) {
    	if(args.length > 0) {
    		$(_Canvas).css('background', args[0]);
    		_StdIn.putText("Background set to " + args[0]);
    	}
    	else {
    		$(_Canvas).css('background', '#DFDBC3');
    		_StdIn.putText("Background restored to default.");
    	}
    };
    this.commandList.push(sc);
    
    // load
    // TODO: Expand to store code in memory starting at mem[0]. Assign a PCB and PID, return PID to console
    sc = new ShellCommand();
    sc.command = "load";
    sc.description = "[<int>] - Validate text area and load instructions into memory. Optional param for priority.";
    sc.func = function(args) {
    	var input = document.getElementById("taProgramInput").value.trim();
    	var valid = true;
    	if(input) {
    		var re = /^[0-9A-Fa-f]{2}$/;	// Matches 2 hex digits
    		var lines = input.split("\n");
    		var instructions = [];
    		// break input down line-by-line and word-by-word (space-separated)
    		for(line in lines) {
    			var words = lines[line].split(' ');
    			for(var i = 0; valid && i < words.length; i++) {
    				
    				if(!re.exec(words[i])) {
    					// gives a little bit of debugging with which set was invalid...
    					_StdIn.putText("Error! " + words[i] + " is an invalid instruction.");
    					valid = false;
    				}
    				else {
    				    instructions.push(words[i]);
    				}
    			}
    		}
    		if (valid) {
    		    if (args[0])
    		        krnLoadProcess(instructions, parseInt(args[0]));
    		    else
    		        krnLoadProcess(instructions, null);
    		}
    	}
    	else {
    		_StdIn.putText("The textbox is empty!");
    	}
    };
    this.commandList.push(sc);
    

    // Run <pid>
    sc = new ShellCommand();
    sc.command = "run";
    sc.description = "<pid> - Run a process.";
    sc.func = function (args) {
        krnRunProcess(args);
    };
    this.commandList.push(sc);

    // Runall
    sc = new ShellCommand();
    sc.command = "runall";
    sc.description = " - Run all loaded processes.";
    sc.func = function (args) {
        krnRunAll();
    };
    this.commandList.push(sc);

    // status <string>
    sc = new ShellCommand();
    sc.command = "status";
    sc.description = "<string> - Sets the status in the task bar.";
    sc.func = function(args) {
    	if(args.length === 0) {
    		_StdIn.putText("Usage: Status <string> set a custom status.");
    	} 
    	else {
    		str = args.join(' ');	// multiple args converted into one string. Maybe detect quotes?
    		hostStatus(str);
    		_StdIn.putText("Status set to '" + str + "'");
    	}
    };
    this.commandList.push(sc);
    
    // BSoD
    sc = new ShellCommand();
    sc.command = "bsod";
    sc.description = " - Force the kernel to trap an error.";
    sc.func = function() {
    	krnTrapError("Forced BSoD (technically an RSoD).");
    	_Console.screenOfDeath("Screen of death!");
        krnShutdown();
    };
    this.commandList.push(sc);
    
    // Restart - command to refresh page (convenience)
    sc = new ShellCommand();
    sc.command = "restart";
    sc.description = " - Restart the OS (refresh page)";
    sc.func = function() {
    	location.reload(true);
    };
    this.commandList.push(sc);


    // list all active processes
    sc = new ShellCommand();
    sc.command = "processes";
    sc.description = " - View the PIDs of all active processes.";
    sc.func = function () {
        for (var i = 0; i < ResidentList.length; i++) {
            _StdIn.putText(ResidentList[i].pid + '');
            _StdIn.advanceLine();
        }
    };
    this.commandList.push(sc);

    // KILL
    sc = new ShellCommand();
    sc.command = "kill";
    sc.description = "<PID> - Kill a process.";
    sc.func = function (args) {
        var pcb = getPCB(parseInt(args[0]));
        if (pcb) {
            krnEndProcess(pcb);
            _StdIn.putText('Killing process ' + pcb.pid);
        }
    };
    this.commandList.push(sc);

    // Quantum
    sc = new ShellCommand();
    sc.command = "quantum";
    sc.description = "<int> - Set the Round Robin quantum.";
    sc.func = function (args) {
        scheduler.quantum = args[0];
        _StdIn.putText('Quantum set to ' + scheduler.quantum + ' cyles.');
    };
    this.commandList.push(sc);

    // Scheduler
    sc = new ShellCommand();
    sc.command = "setschedule";
    sc.description = "<string> - Set the CPU scheduling algorithm.";
    sc.func = function (args) {
        switch (args[0]) {
            case ROUND_ROBIN:
                scheduler.algorithm = ROUND_ROBIN;
                _StdIn.putText('Scheduler set to round robin.');
                break;
            case FCFS:
                scheduler.algorithm = FCFS;
                _StdIn.putText('Scheduler set to first-come-first-serve');
                break;
            case PRIORITY:
                scheduler.algorithm = PRIORITY;
                _StdIn.putText('Scheduler set to to priority');
                break;
            default:
                _StdIn.putText('Invalid schedule! Choose between rr, fcfs, and priority');
                break;
        }
    };
    this.commandList.push(sc);

    // Scheduler
    sc = new ShellCommand();
    sc.command = "getschedule";
    sc.description = "Get the CPU scheduling algorithm.";
    sc.func = function () {
        _StdIn.putText(scheduler.algorithm);
    };
    this.commandList.push(sc);

    // Create file
    sc = new ShellCommand();
    sc.command = "create";
    sc.description = "<filename> - Create a file, return success or failure.";
    sc.func = function (args) {
        var filename = args[0];
        if (filename.match(/^[\d|\w]+$/))
            _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [CREATE, filename]));
        else
            _StdIn.putText(filename + ' is an invalid filename. No special characters!');
    };
    this.commandList.push(sc);

    // Read file
    sc = new ShellCommand();
    sc.command = "read";
    sc.description = "<filename> - read a file and display contents.";
    sc.func = function (args) {
        var filename = args[0];
        _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [READ, filename]));
    };
    this.commandList.push(sc);

    // write file
    sc = new ShellCommand();
    sc.command = "write";
    sc.description = '<filename> "data"- write data in quotes to the filename.';
    sc.func = function (args) {
        var filename = args[0];
        if (filename.match(/^[\d|\w]+$/))  {
            var data = args.join('').match(/"(.*?)"/)[1];
            _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [WRITE, filename, data]));
        }
        else
            _StdIn.putText(filename + ' is an invalid filename. No special characters!');
    };
    this.commandList.push(sc);

    // delete file
    sc = new ShellCommand();
    sc.command = "delete";
    sc.description = "<filename> - Delete a file, return success or failure.";
    sc.func = function (args) {
        var filename = args[0];
        if (filename.match(/^[\d|\w]+$/))
            _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [DELETE, filename]));
        else
            _StdIn.putText(filename + ' is an invalid filename. No special characters!');
    };
    this.commandList.push(sc);

    // format file system
    sc = new ShellCommand();
    sc.command = "format";
    sc.description = "Initialize all tracks, sectors, and blocks. Return success or failure.";
    sc.func = function () {
        _StdIn.putText("Formatting file system...");
        _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [FORMAT]));
    };
    this.commandList.push(sc);

    // list files
    sc = new ShellCommand();
    sc.command = "ls";
    sc.description = "List files stored on disk.";
    sc.func = function () {
        _KernelInterruptQueue.enqueue(new Interrupt(FILESYSTEM_IRQ, [LIST]));
    };
    this.commandList.push(sc);

    // Display the initial prompt.
    this.putPrompt();   
}

function shellPutPrompt()
{
    _StdIn.putText(this.promptStr);
}

function shellHandleInput(buffer)
{
    krnTrace("Shell Command~" + buffer);
    // 
    // Parse the input...
    //
    var userCommand = new UserCommand();
    userCommand = shellParseInput(buffer);
    // ... and assign the command and args to local variables.
    var cmd = userCommand.command;
    var args = userCommand.args;
    //
    // Determine the command and execute it.
    //
    // JavaScript may not support associative arrays in all browsers so we have to
    // iterate over the command list in attempt to find a match.  TODO: Is there a better way? Probably.
    var index = 0;
    var found = false;
    while (!found && index < this.commandList.length)
    {
        if (this.commandList[index].command === cmd)
        {
            found = true;
            var fn = this.commandList[index].func;
        }
        else
        {
            ++index;
        }
    }
    if (found)
    {
        this.execute(fn, args);
    }
    else
    {
        // It's not found, so check for curses and apologies before declaring the command invalid.
        if (this.curses.indexOf("[" + rot13(cmd) + "]") >= 0)      // Check for curses.
        {
            this.execute(shellCurse);
        }
        else if (this.apologies.indexOf("[" + cmd + "]") >= 0)      // Check for apologies.
        {
            this.execute(shellApology);
        }
        else    // It's just a bad command.
        {
            this.execute(shellInvalidCommand);
        }
    }
}

function shellParseInput(buffer)
{
    var retVal = new UserCommand();

    // 1. Remove leading and trailing spaces.
    buffer = trim(buffer);

    // 2. Lower-case it.
    buffer = buffer.toLowerCase();

    // 3. Separate on spaces so we can determine the command and command-line args, if any.
    var tempList = buffer.split(" ");

    // 4. Take the first (zeroth) element and use that as the command.
    var cmd = tempList.shift();  // Yes, you can do that to an array in JavaScript.  See the Queue class.
    // 4.1 Remove any left-over spaces.
    cmd = trim(cmd);
    // 4.2 Record it in the return value.
    retVal.command = cmd;

    // 5. Now create the args array from what's left.
    for (var i in tempList)
    {
        var arg = trim(tempList[i]);
        if (arg != "")
        {
            retVal.args[retVal.args.length] = tempList[i];
        }
    }
    return retVal;
}

function shellExecute(fn, args)
{
    // We just got a command, so advance the line...
    _StdIn.advanceLine();
    // ... call the command function passing in the args...
    fn(args);
    // Check to see if we need to advance the line again
    if (_StdIn.CurrentXPosition > 0)
    {
        _StdIn.advanceLine();
    }
    // ... and finally write the prompt again.
    this.putPrompt();
}


//
// The rest of these functions ARE NOT part of the Shell "class" (prototype, more accurately), 
// as they are not denoted in the constructor.  The idea is that you cannot execute them from
// elsewhere as shell.xxx .  In a better world, and a more perfect JavaScript, we'd be
// able to make then private.  (Actually, we can. have a look at Crockford's stuff and Resig's JavaScript Ninja cook.)
//

//
// An "interior" or "private" class (prototype) used only inside Shell() (we hope).
//
function ShellCommand()     
{
    // Properties
    this.command = "";
    this.description = "";
    this.func = "";
}

//
// Another "interior" or "private" class (prototype) used only inside Shell() (we hope).
//
function UserCommand()
{
    // Properties
    this.command = "";
    this.args = [];
}


//
// Shell Command Functions.  Again, not part of Shell() class per se', just called from there.
//
function shellInvalidCommand()
{
    _StdIn.putText("Invalid Command. ");
    if (_SarcasticMode)
    {
        _StdIn.putText("Duh. Go back to your Speak & Spell.");
    }
    else
    {
        _StdIn.putText("Type 'help' for, well... help.");
    }
}

function shellCurse()
{
    _StdIn.putText("Oh, so that's how it's going to be, eh? Fine.");
    _StdIn.advanceLine();
    _StdIn.putText("Bitch.");
    _SarcasticMode = true;
}

function shellApology()
{
   if (_SarcasticMode) {
      _StdIn.putText("Okay. I forgive you. This time.");
      _SarcasticMode = false;
   } else {
      _StdIn.putText("For what?");
   }
}

function shellVer(args)
{
    _StdIn.putText(APP_NAME + " version " + APP_VERSION);    
}

function shellHelp(args)
{
    _StdIn.putText("Commands:");
    for (var i in _OsShell.commandList)
    {
        _StdIn.advanceLine();
        _StdIn.putText("  " + _OsShell.commandList[i].command + " " + _OsShell.commandList[i].description);
    }    
}

function shellShutdown(args)
{
     _StdIn.putText("Shutting down...");
     // Call Kernel shutdown routine.
    krnShutdown();   
    // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
}

function shellCls(args)
{
    _StdIn.clearScreen();
    _StdIn.resetXY();
}

function shellMan(args)
{
    if (args.length > 0)
    {
        var topic = args[0];
        switch (topic)
        {
            case "help": 
                _StdIn.putText("Help displays a list of (hopefully) valid commands.");
                break;
            default:
                _StdIn.putText("No manual entry for " + args[0] + ".");
        }        
    }
    else
    {
        _StdIn.putText("Usage: man <topic>  Please supply a topic.");
    }
}

function shellTrace(args)
{
    if (args.length > 0)
    {
        var setting = args[0];
        switch (setting)
        {
            case "on": 
                if (_Trace && _SarcasticMode)
                {
                    _StdIn.putText("Trace is already on, dumbass.");
                }
                else
                {
                    _Trace = true;
                    _StdIn.putText("Trace ON");
                }
                
                break;
            case "off": 
                _Trace = false;
                _StdIn.putText("Trace OFF");                
                break;                
            default:
                _StdIn.putText("Invalid argument.  Usage: trace <on | off>.");
        }        
    }
    else
    {
        _StdIn.putText("Usage: trace <on | off>");
    }
}

function shellRot13(args)
{
    if (args.length > 0)
    {
        _StdIn.putText(args[0] + " = '" + rot13(args[0]) +"'");     // Requires Utils.js for rot13() function.
    }
    else
    {
        _StdIn.putText("Usage: rot13 <string>  Please supply a string.");
    }
}

function shellPrompt(args)
{
    if (args.length > 0)
    {
        _OsShell.promptStr = args[0];
    }
    else
    {
        _StdIn.putText("Usage: prompt <string>  Please supply a string.");
    }
}
