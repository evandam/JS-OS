
// NOTE: Memory is not initialized yet
var initMemDisplay = function () {
    var el = $('#divMemory table tbody');

    // create a new row for every 8th memory address
    for (var i = 0; i < _Memory.size; i+=8) {
        el.append("<tr>")
        el.append("<th> 0x" + i.toString(16).toUpperCase() + "</th>");
        // insert 8 columns into the row
        for (var j = 0; j < 8; j++) {
            el.append("<td> </td>");
        }
        el.append("</tr>");
    }
};

// Update the display to reflect changes in memory
var updateMemoryDisplay = function () {
    var el = $('#divMemory table tbody');
    el.html(""); 
    for (var i = 0; i < _Memory.size; i++) {
        // first column in the row
        if (i % 8 == 0) {
            el.append("<tr>");
            el.append("<th> 0x" + i.toString(16).toUpperCase() + " </th>");
        }

        el.append("<td>" + _Memory.mem[i].toHex() + "</td>");

        // last column
        if (i % 8 == 7) {
            el.append("</tr>");
        }
    }
};

// Update the CPU display with current info
var updateCPUDisplay = function () {
    $('#CPU_PC').html(_CPU.PC);
    $('#CPU_ACC').html(_CPU.Acc);
    $('#CPU_XReg').html(_CPU.Xreg);
    $('#CPU_YReg').html(_CPU.Yreg);
    $('#CPU_ZFlag').html(_CPU.Zflag);
};