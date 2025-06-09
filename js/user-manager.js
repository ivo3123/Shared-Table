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
    #currentUsers = [ 'pomba', 'bemba', 'tumba' ];
    #currentAdmins = [ 'admin' ];
    #sectionContainer = null;

    #boundSendHeartbeat = this.#sendHeartbeat.bind(this);

    constructor() {
        this.username = 'Anonymous ' + getRandomAnimal();
         
        // this.#webSocket = new WebSocket('ws://backend:8080');
        // this.#sendJoinToWebSocket();

        // this.#webSocket.onmessage = (event) => {
        //     const message = JSON.parse(event.data);
        //     console.log('Received:', message);

        //     if (message.type === 'update-users') {
        //         this.#currentUsers = message.users;
        //         this.#currentAdmins = message.admins;
        //         update rendering
        //     }
        // };
        setInterval(this.#boundSendHeartbeat, UserManager.#HEARTBEAT_INTERVAL);
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

        this.#toggleRendering();
    }

    #toggleRendering() {
        this.#sectionContainer.innerHTML = '';

        if (!this.isLoggedIn) {
            this.#sectionContainer.appendChild(this.#renderForm());
            this.#sectionContainer.appendChild(this.#renderCurrentUsers());
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

    #renderForm() {
        const form = document.createElement('form');
        form.id = 'user-manager-form';

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

        return form;
    }

    #renderCurrentUsers() {
        const currentUsersContainer = document.createElement('div');
        currentUsersContainer.id = 'current-user-list';

        this.#currentUsers.forEach((user) => {
            const userItem = document.createElement('li');
            userItem.className = 'current-user';
            userItem.textContent = user[0];
            currentUsersContainer.appendChild(userItem);
        });

        return currentUsersContainer;
    }

    render() {
        const container = document.createElement('section');
        container.id = 'user-manager';

        container.appendChild(this.#renderForm());
        container.appendChild(this.#renderCurrentUsers());

        this.#sectionContainer = container;

        return container;
    }
}

export default UserManager;
