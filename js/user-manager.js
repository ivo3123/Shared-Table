import { showError, clearError } from "./util.js";

class UserManager {
    static #DEFAULT_USERNAME = 'anonymous';
    static ADMIN_LOGIN_EVENT = 'adminLogin';
    static ADMIN_LOGOUT_EVENT = 'adminLogout';
    username = UserManager.#DEFAULT_USERNAME;
    isLoggedIn = false;
    isAdmin = false;
    #sectionContainer = null;

    constructor() {}

    handleSubmit(event) {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const clickedButton = event.submitter.id;

        if (clickedButton === 'register-button') {
            this.handleRegister(username, password);
        } else if (clickedButton === 'login-button') {
            this.handleLogin(username, password);
        }
    }

    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        // POST /login

        // 200
        this.username = username;
        this.isLoggedIn = true;
        this.isAdmin = true; // whatever the server returns

        if (this.isAdmin) {
            const event = new Event(UserManager.ADMIN_LOGIN_EVENT, { bubbles: true });
            this.#sectionContainer.dispatchEvent(event);
        }

        this.#toggleRendering();

        // 401
        // showError(document.getElementById('loginForm'), 'Invalid username or password.');

        // 500
        // showError(document.getElementById('loginForm'), 'Server error. Please try again later.');
    }

    handleRegister() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        // POST /register

        // 201
        this.username = username;
        this.isLoggedIn = true;
        this.isAdmin = false;

        this.#toggleRendering();

        // 409
        // showError(document.getElementById('loginForm'), 'A user with this username already exists.');

        // 500
        // showError(document.getElementById('loginForm'), 'Server error. Please try again later.');
    }

    handlerLogout() {
        if (this.isAdmin) {
            const event = new Event(UserManager.ADMIN_LOGOUT_EVENT, { bubbles: true });
            this.#sectionContainer.dispatchEvent(event);
        }

        this.username = UserManager.#DEFAULT_USERNAME;
        this.isLoggedIn = false;
        this.isAdmin = false;

        this.#toggleRendering();

        //logic with anonymous monkey
    }

    #toggleRendering() {
        this.#sectionContainer.innerHTML = '';

        if (!this.isLoggedIn) {
            this.#sectionContainer.appendChild(this.render());
            return;
        }

        const userMessage = document.createElement('span');
        userMessage.textContent = `Logged in as ${this.username}`;

        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';

        logoutButton.addEventListener('click', () => this.handlerLogout());

        this.#sectionContainer.appendChild(userMessage);
        this.#sectionContainer.appendChild(logoutButton);
    }

    render() {
        const container = document.createElement('section');
        container.id = 'user-manager';
        const form = document.createElement('form');
        
        form.addEventListener('submit', (event) => this.handleSubmit(event));

        const usernameField = document.createElement('input');
        usernameField.type = 'text';
        usernameField.id = 'username';
        usernameField.placeholder = 'Username';
        usernameField.required = true;

        const passwordField = document.createElement('input');
        passwordField.type = 'password';
        passwordField.id = 'password';
        passwordField.placeholder = 'Password';
        passwordField.required = true;

        const registerButton = document.createElement('button');
        registerButton.type = 'submit';
        registerButton.id = 'register-button';
        registerButton.textContent = 'Register';

        const loginButton = document.createElement('button');
        loginButton.type = 'submit';
        loginButton.id = 'login-button';
        loginButton.textContent = 'Login';

        form.appendChild(usernameField);
        form.appendChild(passwordField);
        form.appendChild(registerButton);
        form.appendChild(loginButton);

        container.appendChild(form);
        this.#sectionContainer = container;

        return container;
    }
}

export default UserManager;
