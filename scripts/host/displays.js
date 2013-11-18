
// NOTE: Memory is not initialized yet
function initMemDisplay() {
    var el = $('#divMemory tbody');
    // create a new row for every 8th memory address
    for (var i = 0; i < MEMORY_SIZE; i+=8) {
        el.append("<tr>")
        el.append("<th> 0x" + i.toString(16).toUpperCase() + "</th>");
        // insert 8 columns into the row
        for (var j = 0; j < 8; j++) {
            el.append("<td> 00 </td>");
        }
        el.append("</tr>");
    }
}

// Update the display to reflect changes in memory
function updateMemoryDisplay(addr, val) {
    var tbody = $('#divMemory table tbody');
    var td = tbody.find('td').eq(addr);
    td.html(val);
}

// Update the CPU display with current info
function updateCPUDisplay() {
    $('#CPU_PC').html(_CPU.PC.toString(16).toUpperCase());
    $('#CPU_ACC').html(_CPU.Acc.toString(16).toUpperCase());
    $('#CPU_XReg').html(_CPU.Xreg.toString(16).toUpperCase());
    $('#CPU_YReg').html(_CPU.Yreg.toString(16).toUpperCase());
    $('#CPU_ZFlag').html(_CPU.Zflag.toString(16).toUpperCase());
}

// Update the display for the ready queue
function updateProcessesDisplay() {
    var el = $('#processes tbody');
    el.html("");
    for (var i = 0; i < ResidentList.length; i++) {
        el.append('<tr>');
        el.append('<td>' + ResidentList[i].pid + '</td>');
        el.append('<td>' + ResidentList[i].status + '</td>');
        el.append('<td>' + ResidentList[i].priority + '</td>');
        el.append('<td>' + ResidentList[i].base + '</td>');
        el.append('<td>' + ResidentList[i].limit + '</td>');
        el.append('<td>' + ResidentList[i].PC + '</td>');
        el.append('<td>' + ResidentList[i].Acc + '</td>');
        el.append('<td>' + ResidentList[i].Xreg + '</td>');
        el.append('<td>' + ResidentList[i].Yreg + '</td>');
        el.append('<td>' + ResidentList[i].Zflag + '</td>');
        el.append('</tr>');
    }
}

function initFileSystemDisplay() {
    var el = $('#divFileSystem table tbody');
    for (var t = 0; t < TRACKS; t++) {
        for (var s = 0; s < SECTORS; s++) {
            for (var b = 0; b < BLOCKS; b++) {
                var tsb = t + '' + s + '' + b;
                el.append('<tr><th>' + tsb + '</th><td id="'+ tsb +'">' + localStorage.getItem(tsb) + '</td></tr>');
            }
        }
    }
}

function updateFileSystemDisplay(tsb, data) {
    var el = $('#divFileSystem table tbody');
    el.find('#' + tsb).text(data);
}