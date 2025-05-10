import SharedTable from "./shared-table.js";

let sharedTable = new SharedTable();

document.getElementById("main-container").appendChild(sharedTable.adminRender());
