// Use HTML5 Local storage to simulate a disk drive
/*
Use a single interrupt code to access the file system:
but specify parameters to determine what to do...
ie [CREATE, filename], [FORMAT], [WRITE, filename, data], etc
*/

var nullChain = '---';
var MBR = new mbr();
DeviceDriverFileSystem.prototype = new DeviceDriver;  // "Inherit" from prototype DeviceDriver in deviceDriver.js.

function DeviceDriverFileSystem() {
    this.driverEntry = krnKbdDriverEntry;
    this.isr = this.krnFileSystemIO;
}

DeviceDriverFileSystem.prototype.krnFileSystemIO = function (params) {
    switch (params[0]) {
        case CREATE:
            this.create(params[1]); // create filename
            break;
        case READ:
            this.read(params[1]);   // read filename
            break;
        case WRITE:
            this.write(params[1], params[2]);   // need to deal with quotes
            break;
        case DELETE:
            this.delete(params[1]); // remove filename
            break;
        case FORMAT:
            this.format();  // implement quick format?
            break;
        case LIST:
            this.list();    // ls
            break;
        default:
            krnTrapError("Invalid Request for Filesystem!");
            break;
    }
};

// ls
DeviceDriverFileSystem.prototype.list = function () {
    var allocated = MBR.getUsedBlocks();
    var total = (TRACKS - 1) * SECTORS * BLOCKS;
    _StdIn.putText(allocated + '/' + total + ' blocks');
    _StdIn.advanceLine();
    // traverse the first track and list the filenames of each occupied entry
    for (var sector = 0; sector < SECTORS; sector++) {
        for (var block = 0; block < BLOCKS; block++) {
            var tsb = '0' + sector + '' + block;
            var entry = new Entry(tsb);
            // entry is taken
            if (entry.avail === 1) {
                var filename = entry.data;
                _StdIn.putText(filename);
                _StdIn.advanceLine();
            }
        }
    }
    _OsShell.putPrompt();
};

DeviceDriverFileSystem.prototype.create = function (filename) {
    if(this.getFile(filename)) {
        _StdIn.putText('File already exists with same name!');
    }
    else {
        // get the next available file address from the MBR and set it to null
        var fileAddr = this.getNextFileEntryAddr();
        var fileEntry = new Entry(fileAddr);
        fileEntry.avail = 1;
        fileEntry.targetAddr = nullChain;
        fileEntry.writeData('\\');
        fileEntry.update();

        // get the next available directry address from the MBR and set it to point to the file
        var dirAddr = this.getNextDirEntryAddr();
        var dirEntry = new Entry(dirAddr);
        dirEntry.avail = 1;
        dirEntry.targetAddr = fileAddr;
        dirEntry.writeData(filename.toLowerCase() + '\\');
        dirEntry.update();

        _StdIn.putText(filename + ' created at directory entry ' + dirAddr);
    }
    _StdIn.advanceLine();
    _OsShell.putPrompt();
};

DeviceDriverFileSystem.prototype.read = function (filename) {
    var dirAddr = this.getFile(filename);
    if (dirAddr) {
        var dirEntry = new Entry(dirAddr);
        var fileEntry = new Entry(dirEntry.targetAddr);
        var readData = fileEntry.data;
        // follow chain and print data
        while(fileEntry.targetAddr != nullChain) {
            fileEntry = new Entry(fileEntry.targetAddr);
            readData += fileEntry.data;
        }
        readData = readData.substring(0, readData.indexOf('\\'));
        _StdIn.putText(readData);
    }
    else {
        krnTrapError('No such file!');
        _StdIn.putText("No such file named " + filename);
    }
    _StdIn.advanceLine();
    _OsShell.putPrompt();
};

DeviceDriverFileSystem.prototype.write = function (filename, data) {
    data += '\\';   // null-terminate
    var dirAddr = this.getFile(filename);
    if (dirAddr) {
        var dirEntry = new Entry(dirAddr);
        var blocksRequired = Math.ceil(data.length / dirEntry.data.length);
        // blocks this data uses must be <= total data blocks - allocated blocks
        if (blocksRequired <= (BLOCKS * SECTORS * (TRACKS - 1) - MBR.getUsedBlocks())) {          
            var fileEntry = new Entry(dirEntry.targetAddr);
            // once this exceeds the dataSpace in a block we need to go to the next one
            var curPos = 0; var curData = '';
            for (var char = 0; char < data.length; char++) {
                // still data left to write
                if (data.charAt(char) != '\\') {
                    curData += data.charAt(char);
                    curPos++;
                    // reached the end of the block
                    if (curPos === fileEntry.data.length) {
                        // link to the next available entry
                        // try to follow chain, if not get the next available entry
                        if (fileEntry.targetAddr == nullChain) {
                            fileEntry.targetAddr = this.getNextFileEntryAddr();
                        }
                        fileEntry.avail = 1;
                        fileEntry.writeData(curData);
                        fileEntry.update();

                        // begin writing to new block next iteration
                        fileEntry = new Entry(fileEntry.targetAddr);                        
                        curPos = 0;
                        curData = '';
                    }
                }
                // hit the terminator, just flush the rest of the data to the current block
                else {
                    curData += '\\';
                    fileEntry.avail = 1;
                    fileEntry.targetAddr = nullChain;
                    fileEntry.writeData(curData);
                    fileEntry.update();
                    _StdIn.putText("Wrote to " + filename + "!");
                    return;
                }
            }
        }
        else {
            krnTrapError('Insufficient disk space to write!');
            _StdIn.putText('Insufficient disk space to write the data!');
        }
    }
    else {
        krnTrapError('No such file!');
        _StdIn.putText("No such file named " + filename);
    }
    _StdIn.advanceLine();
    _OsShell.putPrompt();
};

DeviceDriverFileSystem.prototype.delete = function (filename) {
    var addr = this.getFile(filename);
    if (addr) {
        // make dir entry available 
        var dirEntry = new Entry(addr);
        dirEntry.avail = 0;
        dirEntry.update();

        var fileEntry = new Entry(dirEntry.targetAddr);
        fileEntry.avail = 0;
        fileEntry.update();
        MBR.addUsedBlocks(-1);   // freeing up a block, so update MBR here
        // follow chain and mark available if necessary
        while (fileEntry.targetAddr != nullChain) {
            fileEntry = new Entry(fileEntry.targetAddr);
            fileEntry.avail = 0;
            fileEntry.update();
            MBR.addUsedBlocks(-1);   // freeing up a block, so update MBR here
        }
        _StdIn.putText('Deleted ' + filename + '!');
    }
    else {
        krnTrapError('No such file!');
        _StdIn.putText("No such file named " + filename);
    }
    _StdIn.advanceLine();
    _OsShell.putPrompt();
};

DeviceDriverFileSystem.prototype.format = function () {
    for (var track = 0; track < TRACKS; track++) {
        for (var sector = 0; sector < SECTORS; sector++) {
            for (var block = 0; block < BLOCKS; block++) {
                var tsb = track + '' + sector + '' + block;
                if (tsb != '000') {
                    var entry = new Entry(tsb);
                    entry.avail = 0;
                    entry.targetAddr = nullChain;
                    data = '\\';
                    while ((entry.avail + '' + entry.targetAddr + '' + data).length < BLOCK_SIZE) {
                        data += '0';
                    }
                    entry.writeData(data);
                    entry.update();
                }
            }
        }
    }
    // set up the MBR
    // first 3 bytes are the next available directory entry (001)
    // the next 3 are the next available file entry (100)
    // the remaining bytes can be used to track the total size or something
    MBR.setNextDirAddr('001');
    MBR.setNextFileAddr('100');
    MBR.resetUsedBlocks();

    _StdIn.putText('format complete!');
    _StdIn.advanceLine();
    _OsShell.putPrompt();
    // not sure what would cause an error just yet...
};

// bytes [0:3] in MBR = available dir entry
DeviceDriverFileSystem.prototype.getNextDirEntryAddr = function () {
    var startAddr = MBR.getNextDirAddr();
    // now update the next addr pointer
    var addr = startAddr;
    var entry = new Entry(addr);
    // probing for next entry that is not taken (first byte=available)
    // it pains me to use a do-while loop but otherwise the addr is never incremented
    do {
        // increment the block
        addr = addr[0] + addr[1] + (parseInt(addr[2]) + 1);
        // check the one's place for overflow
        if (parseInt(addr[2]) === BLOCKS) {
            addr = addr[0] + (parseInt(addr[1]) + 1) + '0';
            // wrap around to block 001 once limit reached
            if (parseInt(addr[1]) === SECTORS) {
                addr = '001';
            }
        }
        if (addr == startAddr) {
            krnTrapError('NO AVAILABLE DIRECTORY ENTRIES!');
            return nullChain;
        }
        entry = new Entry(addr);
    } while (entry.avail === 1);
    MBR.setNextDirAddr(addr);

    return startAddr;
};

// bytes [3:6] in MBR = available file entry
DeviceDriverFileSystem.prototype.getNextFileEntryAddr = function () {
    var startAddr = MBR.getNextFileAddr();
    // now update to the next addr
    var addr = startAddr;
    var entry = new Entry(addr);
    // probing for next entry that is not taken (first byte=available)
    // it pains me to use a do-while loop but otherwise the addr is never incremented
    do {
        // increment the block
        addr = addr[0] + addr[1] + (parseInt(addr[2]) + 1);
        // check the one's place for overflow (blocks)
        if (parseInt(addr[2]) === BLOCKS) {
            addr = addr[0] + (parseInt(addr[1]) + 1) + '0';
            // check ten's for overflow (sectors)
            if (parseInt(addr[1]) === SECTORS) {
                addr = (parseInt(addr[0]) + 1) + '0' + '0';
                // finally check hundreds for overflow (tracks) and wrap around
                if (parseInt(addr[0]) === TRACKS) {
                    addr = '100';
                }
            }
        }
        if (addr == startAddr) {
            krnTrapError('NO AVAILABLE DIRECTORY ENTRIES!');
            return nullChain;
        }
        entry = new Entry(addr);
    } while (entry.avail === 1);
    MBR.setNextFileAddr(addr);
    MBR.addUsedBlocks(1);   // a new block was allocated so update the total size taken on disk
    return startAddr;
};

// search for the file name and return the directory entry
DeviceDriverFileSystem.prototype.getFile = function (filename) {
    for (var sector = 0; sector < SECTORS; sector++) {
        for (var block = 0; block < BLOCKS; block++) {
            var tsb = '0' + sector + '' + block;
            var dirEntry = new Entry(tsb);
            // only check taken entries
            if (dirEntry.avail === 1) {
                var fileName = '';
                // add each char until null terminated
                for (var char = 0; char < MAX_FILENAME; char++) {
                    if (dirEntry.data.charAt(char) != '\\')
                        fileName += dirEntry.data.charAt(char);
                    else
                        break;
                }
                if (fileName == filename.toLowerCase())
                    return tsb;
            }
        }
    }
    return null;
};

// prototype for a file system entry
function Entry(addr) {
    var entry = _Disk.read(addr);
    this.addr = addr;
    this.avail = parseInt(entry.charAt(0)); // 0 for available, 1 for taken
    this.targetAddr = entry.substring(1, 4);
    this.data = entry.substring(4);
}

Entry.prototype = new Object();

// write the entry back into disk
Entry.prototype.update = function () {
    var str = this.avail + '' + this.targetAddr + this.data;
    _Disk.write(this.addr, str);
};

// overwrite old data but keep any not overwritten
// data should be terminated with a back slash (\)
Entry.prototype.writeData = function (data) {
    this.data = data + this.data.substring(data.length);
};

function mbr() {
    this.getNextDirAddr = function () {
        return _Disk.read('000').substring(0, 3);
    };
    this.getNextFileAddr = function () {
        return _Disk.read('000').substring(3, 6);
    };
    this.getUsedBlocks = function () {
        return parseInt(_Disk.read('000').substring(6));
    };
    this.setNextDirAddr = function (addr) {
        var mbrData = _Disk.read('000');
        _Disk.write('000', addr + mbrData.substring(3));
    };
    this.setNextFileAddr = function (addr) {
        var mbrData = _Disk.read('000');
        _Disk.write('000', mbrData.substring(0, 3) + addr + mbrData.substring(6));
    };
    this.addUsedBlocks = function (i) {
        var mbrData = _Disk.read('000');
        var size = this.getUsedBlocks() + i;
        _Disk.write('000', mbrData.substring(0, 6) + size);
    };
    this.resetUsedBlocks = function () {
        var mbrData = _Disk.read('000');
        _Disk.write('000', mbrData.substring(0, 6) + '0');
    };
}