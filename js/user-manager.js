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
        //     }
        // };
    }

    #sendHeartbeat() {
        this.#webSocket.send(JSON.stringify({
            type: 'heartbeat',
            username: this.username,
            timestamp: new Date().toISOString()
        }));
    }

    #getCurrentUsers() {
        if (!this.#webSocket) {
            return;
        }

        this.#webSocket.send(JSON.stringify({
            type: 'get-current-users',
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
            type = 'guest-login';
        }
        else if (!this.isAdmin) {
            type = 'user-login';
        }
        else {
            type = 'admin-login';
        }

        this.#webSocket.send(JSON.stringify({
            type: type,
            username: this.username,
            timestamp: new Date().toISOString()
        }));

        setInterval(this.#boundSendHeartbeat, UserManager.#HEARTBEAT_INTERVAL);
    }

    async handleSubmit(event) {
        event.preventDefault(); // Предотвратява презареждането на страницата

        const form = event.target;
        const usernameInput = form.querySelector('#username');
        const passwordInput = form.querySelector('#password');
        const username = usernameInput.value;
        const password = passwordInput.value;
        const isRegister = event.submitter.id === 'register-button';

        clearError(usernameInput);

        const endpoint = isRegister ? '/register' : '/login';
        const url = `/Shared-Table/api.php`;

        //console.log(url);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'register', username, password })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Успешен отговор:', data);
                this.username = data.user.username;
                this.isLoggedIn = true;
                this.isAdmin = data.user.isAdmin;
                this.#id = data.user.id;

                // if (this.#webSocket.readyState === WebSocket.OPEN) {
                //     this.#webSocket.send(JSON.stringify({
                //         type: this.isAdmin ? 'admin-login' : 'user-login',
                //         id: this.#id,
                //         username: this.username,
                //         isAdmin: this.isAdmin,
                //         timestamp: new Date().toISOString()
                //     }));
                // }

                // this.#updateUIOnLogin();
                // this.#dispatchAdminEvents();

            } else {
                console.error('Грешка при отговор:', data);
                showError(usernameInput, data.message || 'Неизвестна грешка при вход/регистрация.');
            }
        } catch (error) {
            console.error('Грешка при fetch заявка:', error);
            showError(usernameInput, 'Възникна мрежова грешка.');
        }
    }

    // handleSubmit(event) {
    //     event.preventDefault();
    //     const username = document.getElementById('username').value.trim();
    //     const password = document.getElementById('password').value.trim();
    //     const clickedButton = event.submitter.id;

    //     if (clickedButton === 'register-button') {
    //         this.handleRegister(username, password);
    //     } else if (clickedButton === 'login-button') {
    //         this.handleLogin(username, password);
    //     }
    // }

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

        container.appendChild(form);

        const currentUsersContainer = this.#renderCurrentUsers();
        container.appendChild(currentUsersContainer);

        this.#sectionContainer = container;

        return container;
    }
}

export default UserManager;
