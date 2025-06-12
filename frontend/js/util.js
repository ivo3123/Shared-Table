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

function getRandomAnimal() {
    const animals = [
        "Dog", "Cat", "Elephant", "Tiger", "Lion",
        "Giraffe", "Zebra", "Panda", "Kangaroo", "Monkey",
        "Dolphin", "Whale", "Shark", "Eagle", "Owl",
        "Bear", "Fox", "Rabbit", "Horse", "Penguin"
    ];

    const randomIndex = Math.floor(Math.random() * animals.length);
    return animals[randomIndex];
}

export { showError, clearError, getRandomAnimal };