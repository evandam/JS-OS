// Simulation of physical main memory
var Memory = function () {
    this.size = 768;    // 768 bytes (enough for 3 processes)
    this.mem = [];
    this.init = function () {
        this.size = 256;    // start off small for now...
        for (var i = 0; i < this.size; i++) {
            this.mem[i] = 0;    // initialize all bytes to zero
        }
    };
};