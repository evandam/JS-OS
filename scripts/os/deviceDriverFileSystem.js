// Use HTML5 Local storage to simulate a disk drive

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
        default:
            krnTrapError("Invalid Request for Filesystem!");
            break;
    }
};

DeviceDriverFileSystem.prototype.create = function (filename) {
    if(this.getFile(filename)) {
        _StdIn.putText('File already exists with same name!');
    }
    else {
        var dirEntry = this.getNextDirEntry();
        var fileEntry = this.getNextFileEntry();
        var dirData = '1' + fileEntry + filename.toUpperCase() + '\\';       // available byte, address of file data, then the filename (null terminated with a back slash)
        // fill with old data..not just boring zeros
        var oldData = localStorage.getItem(dirEntry);
        dirData += oldData.substring(dirData.length);

        localStorage.setItem(dirEntry, dirData);
        updateFileSystemDisplay(dirEntry, dirData);
        this.updateNextDirEntry();  // update the MBR now that this addr is taken

        var fileData = localStorage.getItem(fileEntry);
        fileData = '1' + fileData.substring(1);  // set to taken
        localStorage.setItem(fileEntry, fileData);
        updateFileSystemDisplay(fileEntry, fileData);
        this.updateNextFileEntry(); // update the MBR to point to next avail file addr
        this.incrementSize();   // another block is taken up, so update that in the mbr too (not sure if this will be used)

        // update MBR display
        updateFileSystemDisplay('000', localStorage.getItem('000'));

        _StdIn.putText(filename + ' created at directory entry ' + dirEntry);
        _StdIn.advanceLine();
        _OsShell.putPrompt();
    }
};

DeviceDriverFileSystem.prototype.read = function (filename) {
    var addr = this.getFile(filename);
    if (addr) {
        var dirEntry = localStorage.getItem(addr);
        var fileEntry = localStorage.getItem(dirEntry.substring(1,4));
        // follow chain and print data
        while(fileEntry.substring(1, 4).match(/\d{3}/)) {
            _StdIn.putText(fileEntry.substring(4)); // data portion
            var nextAddr = fileEntry.substring(1, 4);
            fileEntry = localStorage.getItem(nextAddr);
        }
        _StdIn.putText(fileEntry.substring(4, fileEntry.indexOf('\\')));
    }
    else {
        krnTrapError('No such file!');
        _StdIn.putText("No such file named " + filename);
    }
};

DeviceDriverFileSystem.prototype.write = function (filename, data) {
    data += '\\';   // null-terminate
    var addr = this.getFile(filename);
    if (addr) {
        var dir = localStorage.getItem(addr).substring(1, 4);
        var dataSpace = BLOCK_SIZE - 4; // 1 available bit, 3 addr
        var blocksRequired = Math.ceil(data.length / dataSpace);
        // blocks this data uses must be <= total data blocks - allocated blocks
        if (blocksRequired <= (BLOCKS * SECTORS * (TRACKS - 1) - this.getAllocatedBlocks())) {
            // once this exceeds the dataSpace in a block we need to go to the next one
            var curPos = 0; var curData = '';
            // write one char at a time
            for (var char = 0; char < data.length; char++) {
                if (data.charAt(char) != '\\') {
                    curData += data.charAt(char);
                    curPos++;
                    // reached the end of the block
                    if (curPos >= dataSpace) {
                        // link to the next available entry
                        this.updateNextFileEntry();
                        var entryInfo = '1' + this.getNextFileEntry() + curData;                        
                        localStorage.setItem(dir, entryInfo);
                        updateFileSystemDisplay(dir, entryInfo);  
                        dir = this.getNextFileEntry();
                        this.incrementSize();   // taking up another block so update MBR
                        curPos = 0;
                        curData = '';
                    }
                }
                else {
                    // hit the terminator, just flush the rest of the data to the current block
                    var entryInfo = '1---' + curData + '\\';
                    // fill the remaining bytes with the old data, seems like fun
                    var oldData = localStorage.getItem(dir);
                    entryInfo += oldData.substring(entryInfo.length);

                    localStorage.setItem(dir, entryInfo);
                    updateFileSystemDisplay(dir, entryInfo);
                    _StdIn.putText("Wrote to " + filename + "!");
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
};

DeviceDriverFileSystem.prototype.delete = function (filename) {
    var addr = this.getFile(filename);
    if (addr) {
        // make dir entry available 
        var dirEntry = localStorage.getItem(addr);
        localStorage.setItem(addr, '0' + dirEntry.substring(1));
        updateFileSystemDisplay(addr, '0' + dirEntry.substring(1));

        var fileEntry = localStorage.getItem(dirEntry.substring(1, 4));

        // follow chain and mark available if necessary
        var nextAddr = dirEntry.substring(1, 4);
        while (fileEntry.substring(1, 4).match(/\d{3}/)) {
            // mark available
            newData = '0' + fileEntry.substring(1);
            localStorage.setItem(nextAddr, newData)
            updateFileSystemDisplay(nextAddr, newData);

            this.decrementSize();   // freeing up a block, so update MBR here

            nextAddr = fileEntry.substring(1, 4);
            fileEntry = localStorage.getItem(nextAddr);
        }

        // mark the unchained entry as available
        var newData = '0' + fileEntry.substring(1);
        localStorage.setItem(nextAddr, newData);
        updateFileSystemDisplay(nextAddr, newData);
        this.decrementSize();   // freeing up a block, so update MBR here

        _StdIn.putText('Deleted ' + filename + '!');
    }
    else {
        krnTrapError('No such file!');
        _StdIn.putText("No such file named " + filename);
    }
};

DeviceDriverFileSystem.prototype.format = function () {
    var formattedVal = '0---\\';  // available and location of data/next link (same for directory and file data)
    while (formattedVal.length < BLOCK_SIZE)
        formattedVal += '0';

    for (var track = 0; track < TRACKS; track++) {
        for (var sector = 0; sector < SECTORS; sector++) {
            for (var block = 0; block < BLOCKS; block++) {
                var tsb = track + '' + sector + '' + block;
                localStorage.setItem(tsb, formattedVal);
                updateFileSystemDisplay(tsb, formattedVal);
            }
        }
    }
    // set up the MBR
    // first 3 bytes are the next available directory entry (001)
    // the next 3 are the next available file entry (100)
    // the remaining bytes can be used to track the total size or something
    var mbrData = '0011000';     
    localStorage.setItem('000', mbrData);

    updateFileSystemDisplay('000', mbrData);

    _StdIn.putText('format complete!');
    _StdIn.advanceLine();
    _OsShell.putPrompt();
    // not sure what would cause an error just yet...
};

// bytes [0:3] in MBR = available dir entry
DeviceDriverFileSystem.prototype.getNextDirEntry = function () {
    return localStorage.getItem('000').substring(0, 3);
};

// bytes [3:6] in MBR = available file entry
DeviceDriverFileSystem.prototype.getNextFileEntry = function () {
    return localStorage.getItem('000').substring(3, 6);
};

// bytes [6:9] in MBR = number of blocks taken (why not)
DeviceDriverFileSystem.prototype.getAllocatedBlocks = function () {
    return parseInt(localStorage.getItem('000').substring(6,9));
};

// Get the next available directory entry and update the MBR with it
// Will usually be the next addr, but may not be if wrapping around
DeviceDriverFileSystem.prototype.updateNextDirEntry = function () {
    var addr = this.getNextDirEntry();
    var startAddr = addr;
    // probing for next entry that is not taken (first byte=available)
    while (localStorage.getItem(addr)[0] != '0') {
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
            return;
        }
    }
    var mbrData = localStorage.getItem('000');
    mbrData = addr + mbrData.substring(3);
    localStorage.setItem('000', mbrData);
};

DeviceDriverFileSystem.prototype.updateNextFileEntry = function () {
    var addr = this.getNextFileEntry();
    var startAddr = addr;
    // probing for next entry that is not taken (first byte=available)
    while (localStorage.getItem(addr)[0] != '0') {
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
            return;
        }
    }
    var mbrData = localStorage.getItem('000');
    mbrData = mbrData.substring(0,3) + addr + mbrData.substring(6);
    localStorage.setItem('000', mbrData);
};

// Can use the remaining bytes [6:] of the MBR to track the number of blocks taken
// Useful for eventually checking if theres sufficient space to create/write
// And possibly query it in the 'ls' command
DeviceDriverFileSystem.prototype.incrementSize = function () {
    var mbrData = localStorage.getItem('000');
    var size = parseInt(mbrData.substring(6));
    size++;
    localStorage.setItem('000', mbrData.substring(0, 6) + size);
};

DeviceDriverFileSystem.prototype.decrementSize = function () {
    var mbrData = localStorage.getItem('000');
    var size = parseInt(mbrData.substring(6));
    size--;
    localStorage.setItem('000', mbrData.substring(0, 6) + size);
}

// search for the file name and return the directory entry
DeviceDriverFileSystem.prototype.getFile = function (filename) {
    for (var sector = 0; sector < SECTORS; sector++) {
        for (var block = 0; block < BLOCKS; block++) {
            var tsb = '0' + sector + '' + block;
            var dirData = localStorage.getItem(tsb);
            var fileName = '';
            // add each char until null terminated
            for (var char = 4; char < BLOCK_SIZE; char++) {
                if (dirData.charAt(char) != '\\')
                    fileName += dirData.charAt(char);
                else
                    break;
            }
            if (fileName == filename.toUpperCase())
                return tsb;
        }
    }
    return null;
};
