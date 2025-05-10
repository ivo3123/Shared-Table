import BlockingEvaluator from "./blocking-evaluator.js";

class SharedTable {
    static #DEFAULT_ROWS = 10;
    static #DEFAULT_COLUMNS = 27;
    static #DEFAULT_CELL_VALUE = "";
    #cells = [];
    #blockingEvaluator = null;
    #tableHtml = null;

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
        this.#blockingEvaluator = new BlockingEvaluator();
    }

    loadTableData() {
        // GET /table
    }

    blockCell(rowIndex, columnIndex) {
        if (rowIndex < 0 || rowIndex >= this.#cells.length || columnIndex < 0 || columnIndex >= this.#cells[0].length) {
            return;
        }
        if (!this.#tableHtml) {
            return;
        }

        const cell = this.#tableHtml.querySelector(`tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex + 2})`);
        cell.contentEditable = "false";
        cell.className = "blocked"; // Add a class to style blocked cells

        // PATCH /table/:rowIndex/:columnIndex
    }

    unblockCell(rowIndex, columnIndex) {
        if (rowIndex < 0 || rowIndex >= this.#cells.length || columnIndex < 0 || columnIndex >= this.#cells[0].length) {
            return;
        }
        if (!this.#tableHtml) {
            return;
        }

        const cell = this.#tableHtml.querySelector(`tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex + 2})`);
        cell.contentEditable = "true";
        cell.className = ""; // Remove the class to restore the cell

        // PATCH /table/:rowIndex/:columnIndex
    }

    applyBlockingStatement() {
        this.#cells.forEach((row, rowIndex) => {
            row.forEach((cell, columnIndex) => {
                if (this.#blockingEvaluator.eval(rowIndex, columnIndex)) {
                    this.blockCell(rowIndex, columnIndex);
                }
                else {
                    this.unblockCell(rowIndex, columnIndex);
                }
            });
        });
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
            cell.textContent = this.#cells[rowIndex][i];

            cell.addEventListener("change", (event) => {
                const cellValue = event.target.textContent;

                // PUT /table/:rowIndex/:columnIndex
            });

            row.appendChild(cell);
        }

        return row;
    }

    render() {
        if (this.#tableHtml) {
            return this.#tableHtml;
        }
        
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        thead.appendChild(this.#renderHeader());
        this.#cells.forEach((_, index) => {
            tbody.appendChild(this.#renderRow(index));
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        this.#tableHtml = table;

        return table;
    }

    adminRender() {
        const blockingEvaluator = this.#blockingEvaluator.render();
        const table = this.render();

        const container = document.createElement("div");
        container.appendChild(blockingEvaluator);
        container.appendChild(table);

        container.addEventListener(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, (event) => {
            this.applyBlockingStatement();
        });

        container.addEventListener("dblclick", (event) => {
            const cell = event.target.closest("td");
            if (!cell) {
                return;
            }

            const rowIndex = cell.parentElement.rowIndex - 1;
            const columnIndex = cell.cellIndex - 1;

            if (rowIndex >= 0 && columnIndex >= 0) {
                if (cell.classList.contains("blocked")) {
                    this.unblockCell(rowIndex, columnIndex);
                }
                else {
                    this.blockCell(rowIndex, columnIndex);
                }
            }
        });

        return container;
    }
}

export default SharedTable;
