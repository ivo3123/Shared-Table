import UserManager from "./user-manager.js";
import BlockingEvaluator from "./blocking-evaluator.js";

class SharedTable {
    static #DEFAULT_ROWS = 10;
    static #DEFAULT_COLUMNS = 27;
    static #DEFAULT_CELL_VALUE = "";
    static #ERROR_CELL_VALUE = "ERROR";
    #cells = [];
    #userManager = null;
    #blockingEvaluator = null;
    #mainContainer = null;

    #boundApplyBlockingStatement = this.#applyBlockingStatement.bind(this);
    #boundApplySingleCellBlocking = this.#applySingleCellBlocking.bind(this);

    static #defaultTableData() {
        return Array.from({ length: SharedTable.#DEFAULT_ROWS }, () =>
            Array.from({ length: SharedTable.#DEFAULT_COLUMNS }, () => SharedTable.#DEFAULT_CELL_VALUE)
        );
    }

    static #getHeaderLetter(index) {
        let letter = "";
        index += 1;

        while (index > 0) {
            index -= 1;
            letter += String.fromCharCode(65 + index % 26);
            index = Math.floor(index / 26);
        }

        return letter;
    }

    static #parseCellRef(cellRef) {
        const match = cellRef.toUpperCase().match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            return null;
        }

        const [_, colLetters, rowStr] = match;

        let col = 0;
        for (let i = 0; i < colLetters.length; i++) {
            col *= 26;
            col += colLetters.charCodeAt(i) - 64;
        }

        return {
            row: parseInt(rowStr, 10) - 1,
            col: col - 1
        };
    }

    static #parseRange(rangeStr) {
        const [startRef, endRef] = rangeStr.split(':');
        const start = SharedTable.#parseCellRef(startRef);
        const end = SharedTable.#parseCellRef(endRef);

        const cells = [];
        for (let r = start.row; r <= end.row; r++) {
            for (let c = start.col; c <= end.col; c++) {
                cells.push({ row: r, col: c });
            }
        }
        return cells;
    }

    static #parseArguments(argsStr) {
        const args = argsStr.split(',').map(s => s.trim());
        const cells = [];

        args.forEach(arg => {
            const rangeMatch = arg.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
            if (rangeMatch) {
                cells.push(...SharedTable.#parseRange(rangeMatch[0]));
            } else {
                const cell = SharedTable.#parseCellRef(arg);
                if (cell) {
                    cells.push(cell);
                }
            }
        });
        
        return cells;
    }

    constructor() {
        this.#cells = SharedTable.#defaultTableData();
        this.#userManager = new UserManager();
        this.#blockingEvaluator = new BlockingEvaluator();
    }

    loadTableData() {
        // GET /table
    }

    eval(expression) {
        if (expression.match(/^[A-Za-z]+\((.*?)\)$/)) {
            const functionName = expression.match(/^([A-Za-z]+)\((.*?)\)$/)[1].toUpperCase();
            const innerExpression = expression.match(/^([A-Za-z]+)\((.*?)\)$/)[2].trim();

            switch (functionName) {
                case 'SUM':
                    return this.evalSum(innerExpression);
                case 'AVG':
                    return this.evalAverage(innerExpression);
                case 'MIN':
                    return this.evalMin(innerExpression);
                case 'MAX':
                    return this.evalMax(innerExpression);
                default:
                    throw new Error(`Unknown function: ${functionName}`);
            }
        } else {
            return this.evalArithmeticExpression(expression);
        }
    }

    evalArithmeticExpression(expression) {
        try {
            const sanitizedExpression = expression.replace(/([A-Z]+\d+)/g, (match) => {
                const { row, col } = SharedTable.#parseCellRef(match);
                if (row < 0 || row >= this.#cells.length || col < 0 || col >= this.#cells[0].length) {
                    throw new Error("Invalid cell reference");
                }
                return this.#cells[row][col];
            });
            
            let result = eval(sanitizedExpression);

            return result !== undefined && result !== null ? result : SharedTable.#ERROR_CELL_VALUE;
        }
        catch (error) {

            return SharedTable.#ERROR_CELL_VALUE;
        }
    }

    evalSum(argsStr) {
        const cells = SharedTable.#parseArguments(argsStr);
        return cells.reduce((sum, { row, col }) => {
            const val = parseFloat(this.#cells[row][col]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    }

    evalAverage(argsStr) {
        const cells = SharedTable.#parseArguments(argsStr);
        const values = cells.map(({ row, col }) => parseFloat(this.#cells[row][col])).filter(v => !isNaN(v));
        return values.length ? values.reduce((a, b) => a + b) / values.length : 0;
    }

    evalMin(argsStr) {
        const cells = SharedTable.#parseArguments(argsStr);
        const values = cells.map(({ row, col }) => parseFloat(this.#cells[row][col])).filter(v => !isNaN(v));
        return values.length ? Math.min(...values) : 0;
    }

    evalMax(argsStr) {
        const cells = SharedTable.#parseArguments(argsStr);
        const values = cells.map(({ row, col }) => parseFloat(this.#cells[row][col])).filter(v => !isNaN(v));
        return values.length ? Math.max(...values) : 0;
    }

    #blockCell(rowIndex, columnIndex) {
        if (rowIndex < 0 || rowIndex >= this.#cells.length || columnIndex < 0 || columnIndex >= this.#cells[0].length) {
            return;
        }
        if (!this.#mainContainer) {
            return;
        }

        const cell = this.#mainContainer.querySelector(`tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex + 2})`);
        cell.contentEditable = "false";
        cell.className = "blocked"; // Add a class to style blocked cells

        // PATCH /table/:rowIndex/:columnIndex
    }

    #unblockCell(rowIndex, columnIndex) {
        if (rowIndex < 0 || rowIndex >= this.#cells.length || columnIndex < 0 || columnIndex >= this.#cells[0].length) {
            return;
        }
        if (!this.#mainContainer) {
            return;
        }

        const cell = this.#mainContainer.querySelector(`tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex + 2})`);
        cell.contentEditable = "true";
        cell.className = ""; // Remove the class to restore the cell

        // PATCH /table/:rowIndex/:columnIndex
    }

    #applyBlockingStatement() {
        this.#cells.forEach((row, rowIndex) => {
            row.forEach((cell, columnIndex) => {
                if (this.#blockingEvaluator.eval(rowIndex, columnIndex)) {
                    this.#blockCell(rowIndex, columnIndex);
                }
                else {
                    this.#unblockCell(rowIndex, columnIndex);
                }
            });
        });
    }

    #applySingleCellBlocking(event) {
        if (!event.shiftKey) {
            return;
        }

        const cell = event.target.closest("td");
        if (!cell) {
            return;
        }

        const rowIndex = cell.parentElement.rowIndex - 1;
        const columnIndex = cell.cellIndex - 1;

        if (rowIndex >= 0 && columnIndex >= 0) {
            if (cell.classList.contains("blocked")) {
                this.#unblockCell(rowIndex, columnIndex);
            }
            else {
                this.#blockCell(rowIndex, columnIndex);
            }
        }
    }

    #renderHeader() {
        const headerRow = document.createElement("tr");

        headerRow.appendChild(document.createElement("th"));
        for (let i = 0; i < this.#cells[0].length; ++i) {
            const th = document.createElement("th");
            th.textContent = SharedTable.#getHeaderLetter(i);
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

            cell.addEventListener("blur", (event) => {
                let cellValue = event.target.textContent;

                if (cellValue.length > 0 && cellValue[0] === "=") {
                    const expression = cellValue.slice(1);
                    const result = this.eval(expression);
                    cellValue = result;
                }

                this.#cells[rowIndex][i] = cellValue;
                event.target.textContent = cellValue;

                // PUT /table/:rowIndex/:columnIndex
            });

            cell.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    cell.blur();
                }
            });

            row.appendChild(cell);
        }

        return row;
    }

    #renderBlockingEvaluator() {
        const blockingEvaluatorContainer = document.getElementById("blocking-evaluator-container");
        this.#blockingEvaluator.render(blockingEvaluatorContainer)

        this.#mainContainer.addEventListener(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, this.#boundApplyBlockingStatement);
        this.#mainContainer.addEventListener("click", this.#boundApplySingleCellBlocking);
    }

    #clearBlockingEvaluator() {
        const blockingEvaluatorContainer = document.getElementById("blocking-evaluator-container");
        blockingEvaluatorContainer.innerHTML = "";

        this.#mainContainer.removeEventListener(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, this.#boundApplyBlockingStatement);
        this.#mainContainer.removeEventListener("click", this.#boundApplySingleCellBlocking);
    }

    render() {
        if (this.#mainContainer) {
            return this.#mainContainer;
        }
        
        const mainContainer = document.createElement("section");
        mainContainer.id = "main-container";

        const userManager = this.#userManager.render();
        const blockingEvaluatorContainer = document.createElement("section");
        blockingEvaluatorContainer.id = "blocking-evaluator-container";

        mainContainer.addEventListener(UserManager.ADMIN_LOGIN_EVENT, (event) => {
            this.#renderBlockingEvaluator();
        });
        mainContainer.addEventListener(UserManager.ADMIN_LOGOUT_EVENT, (event) => {
            this.#clearBlockingEvaluator();
        });
        if (this.#userManager.isAdmin) {
            this.#renderBlockingEvaluator();
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

        mainContainer.appendChild(userManager);
        mainContainer.appendChild(blockingEvaluatorContainer);
        mainContainer.appendChild(table);

        this.#mainContainer = mainContainer;

        return mainContainer;
    }
}

export default SharedTable;