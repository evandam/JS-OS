function Disk() {

}

// read raw bytes
Disk.prototype.read = function (addr) {
    return localStorage.getItem(addr);
};

// write to address
Disk.prototype.write = function (addr, data) {
    localStorage.setItem(addr, data);
    updateFileSystemDisplay(addr, data);
};