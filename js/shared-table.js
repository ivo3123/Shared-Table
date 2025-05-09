class SharedTable {
    static #DEFAULT_ROWS = 10;
    static #DEFAULT_COLUMNS = 27;
    static #DEFAULT_CELL_VALUE = "";
    #cells = [];
    #element = null;

    static defaultTableData() {
        return Array.from({ length: SharedTable.#DEFAULT_ROWS }, () =>
            Array.from({ length: SharedTable.#DEFAULT_COLUMNS }, () => SharedTable.#DEFAULT_CELL_VALUE)
        );
    }

    static getHeaderLetter(index) {
        let letter = "";
        index += 1;

        while (index > 0) {
            index -= 1;
            letter += String.fromCharCode(65 + index % 26);
            index = Math.floor(index / 26);
        }

        return letter;
    }

    constructor() {
        this.#cells = SharedTable.defaultTableData();
    }

    loadTableData() {
        // GET /table
    }

    blockCell(rowIndex, columnIndex) {
        const cell = this.#cells[rowIndex][columnIndex];
        if (cell) {
            cell.contentEditable = "false";
            cell.classList.add("blocked"); // Add a class to style blocked cells

            // PATCH /table/:rowIndex/:columnIndex
        }
    }

    #renderHeader() {
        const headerRow = document.createElement("tr");

        headerRow.appendChild(document.createElement("th"));
        for (let i = 0; i < this.#cells[0].length; ++i) {
            const th = document.createElement("th");
            th.textContent = SharedTable.getHeaderLetter(i);
            headerRow.appendChild(th);
        }

        return headerRow;
    }

    #renderRow(rowIndex) {
        const row = document.createElement("tr");

        const rowLabel = document.createElement("th");
        rowLabel.textContent = rowIndex + 1;
        row.appendChild(rowLabel);

        for (let i = 0; i < this.#cells[rowIndex].length; ++i) {
            const cell = document.createElement("td");
            cell.contentEditable = "true";
            cell.dataset.rowIndex = rowIndex;
            cell.dataset.columnIndex = i;
            cell.textContent = this.#cells[rowIndex][i];

            cell.addEventListener("blur", (event) => {
                const cellValue = event.target.textContent;
                const rowIndex = event.target.dataset.rowIndex;
                const columnIndex = event.target.dataset.columnIndex;

                // PUT /table/:rowIndex/:columnIndex
            });

            row.appendChild(cell);
        }

        return row;
    }

    render() {
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        thead.appendChild(this.#renderHeader());
        this.#cells.forEach((_, index) => {
            tbody.appendChild(this.#renderRow(index));
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        this.#element = table;

        return table;
    }
}

export default SharedTable;
