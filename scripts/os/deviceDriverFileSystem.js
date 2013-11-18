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
    console.log('create ' + filename);
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
    console.log('format');
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
            }
        }
    }
    
    // set up the MBR
    console.log('format complete!');
};
