/*
Prototype for MMU.
This will handle virtual to physical address translation,
and later ensure that each program is within its own memory space,
and also perform context switching.
*/

var MemoryManagementUnit = function () {
    this.PCBs = [];
};