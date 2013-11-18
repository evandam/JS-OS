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
    var dirEntry = this.getNextDirEntry();
    var fileEntry = this.getNextFileEntry();
    var dirData = '1' + fileEntry + filename.toUpperCase();       // available byte, address of file data, then the filename
    var remainingBytes = BLOCK_SIZE - dirData.length;
    for (var i = 0; i < remainingBytes; i++)    // pad with 0s
        dirData += '0';
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
    
};

DeviceDriverFileSystem.prototype.read = function (filename) {
    console.log('read ' + filename)
};

DeviceDriverFileSystem.prototype.write = function (filename, data) {
    console.log('write to ' + filename + ' : ' + data);
};

DeviceDriverFileSystem.prototype.delete = function (filename) {
    console.log('delete ' + filename);
};

DeviceDriverFileSystem.prototype.format = function () {
    var formattedVal = '0---';  // available and location of data/next link (same for directory and file data)
    var dataBytes = BLOCK_SIZE - formattedVal.length;
    for (var i = 0; i < dataBytes; i++) {
        formattedVal += '0';
    }

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
DeviceDriverFileSystem.prototype.getAllocateSize = function () {
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
    console.log(addr + ' = next file addr');
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
}
