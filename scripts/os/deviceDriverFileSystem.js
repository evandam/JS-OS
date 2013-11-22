// Use HTML5 Local storage to simulate a disk drive
/*
Use a single interrupt code to access the file system:
but specify parameters to determine what to do...
ie [CREATE, filename], [FORMAT], [WRITE, filename, data], etc
*/


DeviceDriverFileSystem.prototype = new DeviceDriver;  // "Inherit" from prototype DeviceDriver in deviceDriver.js.

function DeviceDriverFileSystem() {
    this.driverEntry = krnKbdDriverEntry;
    this.nullTerm = '~';
    this.blankChar = '.';   // use this to pad the remaining portion of data
    this.nullAddr = '---';
    this.MBR = new MBR();
}

DeviceDriver.prototype.isFormatted = function () {
    return (this.MBR.getNextDirAddr() && this.MBR.getNextFileAddr() && this.MBR.getUsedBlocks() >= 0);
};

// ls - size only reflects the 3 available data tracks
DeviceDriverFileSystem.prototype.list = function () {
    if (this.isFormatted()) {
        var allocated = this.MBR.getUsedBlocks() * BLOCK_SIZE;
        var total = (TRACKS - 1) * SECTORS * BLOCKS * BLOCK_SIZE;
        var list = [];  // lines to be printed
        list.push(allocated + '/' + total + ' bytes');
        // traverse the first track and list the filenames of each occupied entry
        for (var sector = 0; sector < SECTORS; sector++) {
            for (var block = 0; block < BLOCKS; block++) {
                var tsb = '0' + sector + '' + block;
                var entry = new Entry(tsb);
                // entry is taken
                if (entry.avail === 1) {
                    var filename = entry.data.substring(0, entry.data.indexOf(this.nullTerm));
                    list.push(filename);
                }
            }
        }
        return list;
    }
    else {
        krnTrapError('Filesystem not formatted');
        return [];
    }
};

// return true if file created, false if already exists
DeviceDriverFileSystem.prototype.create = function (filename) {
    if (this.isFormatted()) {
        if (this.getFile(filename)) {
            return false;
        }
        else {
            // get the next available file address from the this.MBR and set it to null
            var fileAddr = this.getNextFileEntryAddr();
            var fileEntry = new Entry(fileAddr);
            fileEntry.avail = 1;
            fileEntry.targetAddr = this.nullAddr;
            fileEntry.writeData(this.nullTerm);
            fileEntry.update();

            // get the next available directry address from the this.MBR and set it to point to the file
            var dirAddr = this.getNextDirEntryAddr();
            var dirEntry = new Entry(dirAddr);
            dirEntry.avail = 1;
            dirEntry.targetAddr = fileAddr;
            dirEntry.writeData(filename.toLowerCase() + this.nullTerm);
            dirEntry.update();

            return true;
        }
    }
    else {
        krnTrapError('Filesystem not formatted');
        return false;
    }
};

// return the data of entry, null if file not found
DeviceDriverFileSystem.prototype.read = function (filename) {
    if (this.isFormatted()) {
        var dirAddr = this.getFile(filename);
        if (dirAddr) {
            var dirEntry = new Entry(dirAddr);
            var fileEntry = new Entry(dirEntry.targetAddr);
            var readData = fileEntry.data;
            // follow chain and print data
            while (fileEntry.targetAddr != this.nullAddr) {
                fileEntry = new Entry(fileEntry.targetAddr);
                readData += fileEntry.data;
            }
            readData = readData.substring(0, readData.indexOf(this.nullTerm));
            return readData;
        }
        else {
            krnTrapError('No such file!');
            return null;
        }
    }
    else {
        krnTrapError('Filesystem not formatted');
        return null;
    }
};

// return success
DeviceDriverFileSystem.prototype.write = function (filename, data) {
    if (this.isFormatted()) {
        data += this.nullTerm;   // null-terminate
        var dirAddr = this.getFile(filename);
        if (dirAddr) {
            var dirEntry = new Entry(dirAddr);
            var blocksRequired = Math.ceil(data.length / dirEntry.data.length);
            // blocks this data uses must be <= total data blocks - allocated blocks
            if (blocksRequired <= (BLOCKS * SECTORS * (TRACKS - 1) - this.MBR.getUsedBlocks())) {
                var fileEntry = new Entry(dirEntry.targetAddr);
                // once this exceeds the dataSpace in a block we need to go to the next one
                var curPos = 0; var curData = '';
                for (var char = 0; char < data.length; char++) {
                    // still data left to write
                    if (data.charAt(char) != this.nullTerm) {
                        curData += data.charAt(char);
                        curPos++;
                        // reached the end of the block
                        if (curPos === fileEntry.data.length) {
                            // link to the next available entry
                            // try to follow chain, if not get the next available entry
                            if (fileEntry.targetAddr == this.nullAddr) {
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
                        curData += this.nullTerm;
                        fileEntry.avail = 1;

                        // follow chain and mark available if necessary
                        if (fileEntry.targetAddr != this.nullAddr) {
                            var nextEntry = new Entry(fileEntry.targetAddr);
                            while (nextEntry.avail === 1) {
                                nextEntry.avail = 0;
                                nextEntry.update();
                                this.MBR.addUsedBlocks(-1);   // freeing up a block, so update this.MBR here
                                if (nextEntry.targetAddr == this.nullAddr)
                                    break;
                                else
                                    nextEntry = new Entry(nextEntry.targetAddr);
                            }
                        }

                        fileEntry.targetAddr = this.nullAddr;
                        fileEntry.writeData(curData);
                        fileEntry.update();
                        return true;
                    }
                }
            }
            else {
                krnTrapError('Insufficient disk space to write!');
                return false;
            }
        }
        else {
            krnTrapError('No such file!');
            return false;
        }
    }
    else {
        krnTrapError('Filesystem not formatted');
        return false;
    }
};

// return success
DeviceDriverFileSystem.prototype.delete = function (filename) {
    if (this.isFormatted()) {
        var addr = this.getFile(filename);
        if (addr) {
            // make dir entry available 
            var dirEntry = new Entry(addr);
            dirEntry.avail = 0;
            dirEntry.update();

            var fileEntry = new Entry(dirEntry.targetAddr);
            fileEntry.avail = 0;
            fileEntry.update();
            this.MBR.addUsedBlocks(-1);   // freeing up a block, so update this.MBR here
            // follow chain and mark available if necessary
            while (fileEntry.targetAddr != this.nullAddr) {
                fileEntry = new Entry(fileEntry.targetAddr);
                fileEntry.avail = 0;
                fileEntry.update();
                this.MBR.addUsedBlocks(-1);   // freeing up a block, so update this.MBR here
            }
            return true;
        }
        else {
            krnTrapError('No such file!');
            return false;
        }
    }
    else {
        krnTrapError('Filesystem not formatted');
        return false;
    }
};

// return success
DeviceDriverFileSystem.prototype.format = function () {
    for (var track = 0; track < TRACKS; track++) {
        for (var sector = 0; sector < SECTORS; sector++) {
            for (var block = 0; block < BLOCKS; block++) {
                var tsb = track + '' + sector + '' + block;
                if (tsb != '000') {
                    var entry = new Entry(tsb);
                    entry.avail = 0;
                    entry.targetAddr = this.nullAddr;
                    data = this.nullTerm;
                    while ((entry.avail + '' + entry.targetAddr + '' + data).length < BLOCK_SIZE) {
                        data += this.blankChar;
                    }
                    entry.writeData(data);
                    entry.update();
                }
            }
        }
    }
    // set up the this.MBR
    // first 3 bytes are the next available directory entry (001)
    // the next 3 are the next available file entry (100)
    // the remaining bytes can be used to track the total size or something
    this.MBR.setNextDirAddr('001');
    this.MBR.setNextFileAddr('100');
    this.MBR.resetUsedBlocks();

    return true;
    // not sure what would cause an error just yet...
};

// bytes [0:3] in this.MBR = available dir entry
DeviceDriverFileSystem.prototype.getNextDirEntryAddr = function () {
    var startAddr = this.MBR.getNextDirAddr();
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
            return this.nullAddr;
        }
        entry = new Entry(addr);
    } while (entry.avail === 1);
    this.MBR.setNextDirAddr(addr);

    return startAddr;
};

// bytes [3:6] in this.MBR = available file entry
DeviceDriverFileSystem.prototype.getNextFileEntryAddr = function () {
    var startAddr = this.MBR.getNextFileAddr();
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
            return this.nullAddr;
        }
        entry = new Entry(addr);
    } while (entry.avail === 1);
    this.MBR.setNextFileAddr(addr);
    this.MBR.addUsedBlocks(1);   // a new block was allocated so update the total size taken on disk
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
                    if (dirEntry.data.charAt(char) != this.nullTerm)
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
    this.addr = addr;
    this.avail = -1;
    this.data = DeviceDriverFileSystem.nullTerm;
    this.targetAddr = DeviceDriverFileSystem.nullAddr;

    var entry = _Disk.read(addr);
    if (entry) {
        this.avail = parseInt(entry.charAt(0)); // 0 for available, 1 for taken
        this.targetAddr = entry.substring(1, 4);
        this.data = entry.substring(4);
    }
}

// write the entry back into disk
Entry.prototype.update = function () {
    var str = this.avail + '' + this.targetAddr + this.data;
    _Disk.write(this.addr, str);
};

// overwrite old data but keep any not overwritten
// data should be terminated with a back slash (\)
Entry.prototype.writeData = function (data) {
    if(this.data)
        this.data = data + this.data.substring(data.length);
    else 
        this.data = data;
};

function MBR() {
    this.getNextDirAddr = function () {
        var entry = _Disk.read('000');
        if (entry)
            return entry.substring(0, 3);
        else
            return null;
    };
    this.getNextFileAddr = function () {
        var entry = _Disk.read('000');
        if (entry)
            return entry.substring(3, 6);
        else
            return null;
    };
    this.getUsedBlocks = function () {
        var entry = _Disk.read('000');
        if (entry)
            return parseInt(entry.substring(6));
        else
            return null;
    };
    this.setNextDirAddr = function (addr) {
        var MBRData = _Disk.read('000');
        if (MBRData)
            _Disk.write('000', addr + MBRData.substring(3));
        else
            _Disk.write('000', addr);
    };
    this.setNextFileAddr = function (addr) {
        var MBRData = _Disk.read('000');
        _Disk.write('000', MBRData.substring(0, 3) + addr + MBRData.substring(6));

    };
    this.addUsedBlocks = function (i) {
        var MBRData = _Disk.read('000');
        var size = this.getUsedBlocks() + i;
        if (size < 0)
            size = 0;
        _Disk.write('000', MBRData.substring(0, 6) + size);
    };
    this.resetUsedBlocks = function () {
        var MBRData = _Disk.read('000');
        _Disk.write('000', MBRData.substring(0, 6) + '0');
    };
}