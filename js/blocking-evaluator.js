class BlockingEvaluator {
    static #DEFAULT_BLOCKING_FUNCTION = (row, col) => false;
    static BLOCKING_STATEMENT_CHANGE_EVENT = 'blockingStatementChange';
    #blockingFunction = null;

    static #showError(inputElement, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;

        inputElement.insertAdjacentElement('afterend', errorDiv);
    }

    static #clearError(inputElement) {
        const errorDiv = inputElement.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error')) {
            errorDiv.remove();
        }
    }

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
            BlockingEvaluator.#showError(input, 'Invalid blocking statement');
        }
    }

    #renderBlockingStatementHtml() {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field';

        const label = document.createElement('label');
        const strong = document.createElement('strong');
        strong.textContent = 'Enter blocking statement (row, col):';
        label.appendChild(strong);
        fieldDiv.appendChild(label);

        fieldDiv.appendChild(document.createElement('br'));

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'blocking_statement';
        input.style.width = '100%';
        input.placeholder = 'row % 2 === 0 && col % 2 === 0';
        fieldDiv.appendChild(input);

        input.addEventListener('change', (event) => {
            BlockingEvaluator.#clearError(input);
            const blockingStatement = event.target.value;

            this.#setBlockingFunction(blockingStatement);
            const newEvent = new Event(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, { bubbles: true });
            input.dispatchEvent(newEvent);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return;
            }
            BlockingEvaluator.#clearError(input);
            const blockingStatement = event.target.value;

            this.#setBlockingFunction(blockingStatement);
            const newEvent = new Event(BlockingEvaluator.BLOCKING_STATEMENT_CHANGE_EVENT, { bubbles: true });
            input.dispatchEvent(newEvent);
        });

        return fieldDiv;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'blocking-evaluator';

        const blockingStatementHtml = this.#renderBlockingStatementHtml();
        container.appendChild(blockingStatementHtml);

        return container;
    }
}

export default BlockingEvaluator;