import { showError, clearError, getRandomAnimal } from "./util.js";

class UserManager {
    static ADMIN_LOGIN_EVENT = 'adminLogin';
    static ADMIN_LOGOUT_EVENT = 'adminLogout';
    static #HEARTBEAT_INTERVAL = 5000; // 5 seconds
    #id = null;
    username = null;
    isLoggedIn = false;
    isAdmin = false;
    #webSocket = null;
    #sectionContainer = null;

    #boundSendHeartbeat = this.#sendHeartbeat.bind(this);

    constructor() {
        // this.#webSocket = new WebSocket('ws://backend:8080');
        this.username = 'Anonymous ' + getRandomAnimal();

        // this.#sendJoinToWebSocket();
    }

    #sendHeartbeat() {
        this.#webSocket.send(JSON.stringify({
            type: 'heartbeat',
            username: this.username,
            timestamp: new Date().toISOString()
        }));
    }

    #sendLogoutToWebSocket() {
        if (!this.#webSocket) {
            return;
        }

        this.#webSocket.send(JSON.stringify({
            type: 'logout',
            username: this.username,
            timestamp: new Date().toISOString()
        }));
    }

    #sendJoinToWebSocket() {
        if (!this.#webSocket) {
            return;
        }
        let type = "";

        if (!this.isLoggedIn) {
            type = 'guestLogin';
        }
        else if (!this.isAdmin) {
            type = 'userLogin';
        }
        else {
            type = 'adminLogin';
        }

        this.#webSocket.send(JSON.stringify({
            type: type,
            username: this.username,
            timestamp: new Date().toISOString()
        }));

        setInterval(this.#boundSendHeartbeat, UserManager.#HEARTBEAT_INTERVAL);
    }

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
        this.#id = Math.floor(Math.random() * 1000); // whatever the server returns
        this.username = username;
        this.isLoggedIn = true;
        this.isAdmin = true; // whatever the server returns

        if (this.isAdmin) {
            const event = new Event(UserManager.ADMIN_LOGIN_EVENT, { bubbles: true });
            this.#sectionContainer.dispatchEvent(event);
        }

        this.#sendJoinToWebSocket();

        this.#toggleRendering();

        // 401
        // showError(document.getElementById('user-manager'), 'Invalid username or password.');

        // 500
        // showError(document.getElementById('user-manager'), 'Server error. Please try again later.');
    }

    handleRegister() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        // POST /register

        // 201
        this.#id = Math.floor(Math.random() * 1000); // whatever the server returns
        this.username = username;
        this.isLoggedIn = true;
        this.isAdmin = false;

        this.#sendJoinToWebSocket();

        this.#toggleRendering();

        // 409
        // showError(document.getElementById('user-manager'), 'A user with this username already exists.');

        // 500
        // showError(document.getElementById('user-manager'), 'Server error. Please try again later.');
    }

    handlerLogout() {
        if (this.isAdmin) {
            const event = new Event(UserManager.ADMIN_LOGOUT_EVENT, { bubbles: true });
            this.#sectionContainer.dispatchEvent(event);
        }

        this.username = 'Anonymous ' + getRandomAnimal();
        this.isLoggedIn = false;
        this.isAdmin = false;

        this.#sendLogoutToWebSocket();
        this.#sendJoinToWebSocket();

        this.#toggleRendering();
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
