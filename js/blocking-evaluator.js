import { showError, clearError } from "./util.js";

class BlockingEvaluator {
    static #DEFAULT_BLOCKING_FUNCTION = (row, col) => false;
    static BLOCKING_STATEMENT_CHANGE_EVENT = 'blockingStatementChange';
    #blockingFunction = null;

    constructor() {
        this.#blockingFunction = BlockingEvaluator.#DEFAULT_BLOCKING_FUNCTION;
    }

    eval(row, col) {
        return this.#blockingFunction(row, col);
    }

    #setBlockingFunction(blockingStatementString) {
        try {
            const blockingFunction = new Function('row', 'col', `return ${blockingStatementString}`);
            this.#blockingFunction = blockingFunction;
        }
        catch (error) {
            showError(input, 'Invalid blocking statement');
        }
    }

    render(blockingEvaluatorContainer) {
        const label = document.createElement('label');
        const strong = document.createElement('strong');
        strong.textContent = 'Enter blocking statement (row, col):';
        label.appendChild(strong);
        blockingEvaluatorContainer.appendChild(label);

        blockingEvaluatorContainer.appendChild(document.createElement('br'));

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'blocking_statement';
        input.style.width = '100%';
        input.placeholder = 'row % 2 === 0 && col % 2 === 0';
        blockingEvaluatorContainer.appendChild(input);

        input.addEventListener('change', (event) => {
            const blockingStatement = event.target.value;
            if (!blockingStatement) {
                return;
            }
            clearError(input);

            this.#setBlockingFunction(blockingStatement);
            const newEvent = new Event(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, { bubbles: true });
            input.dispatchEvent(newEvent);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return;
            }
            const blockingStatement = event.target.value;
            clearError(input);

            this.#setBlockingFunction(blockingStatement);
            const newEvent = new Event(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, { bubbles: true });
            input.dispatchEvent(newEvent);
        });
    }
}

export default BlockingEvaluator;