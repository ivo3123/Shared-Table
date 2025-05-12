function showError(inputElement, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;

    inputElement.insertAdjacentElement('afterend', errorDiv);
}

function clearError(inputElement) {
    const errorDiv = inputElement.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error')) {
        errorDiv.remove();
    }
}

export { showError, clearError };