// Simulation of physical main memory
function Memory () {
    this.size = 768;    // 768 bytes (enough for 3 processes)
    this.mem = [];

    for (var i = 0; i < this.size; i++) {
        this.mem[i] = 0;    // initialize all bytes to zero - change this to a memory cell prototype
    }
};