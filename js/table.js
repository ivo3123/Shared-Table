document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("editable-table");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    const container = document.getElementById("table-container");
  
    const cols = 26;
    let currentRows = 100;
  
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th"));
    for (let c = 0; c < cols; c++) {
      const th = document.createElement("th");
      th.textContent = String.fromCharCode(65 + c);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
  
    function addRows(startIndex, count) {
      for (let r = startIndex + 1; r <= startIndex + count; r++) {
        const row = document.createElement("tr");
  
        const rowLabel = document.createElement("th");
        rowLabel.textContent = r;
        row.appendChild(rowLabel);
  
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement("td");
          cell.contentEditable = "true";
          cell.dataset.cell = `${String.fromCharCode(65 + c)}${r}`;
          row.appendChild(cell);
        }
  
        tbody.appendChild(row);
      }
    }
  
    addRows(0, currentRows);
  
    container.addEventListener("scroll", () => {
      const scrollBottom = container.scrollTop + container.clientHeight;
      const fullHeight = container.scrollHeight;
  
      if (scrollBottom >= fullHeight - 10) {
        addRows(currentRows, 20);
        currentRows += 20;
      }
    });
  });