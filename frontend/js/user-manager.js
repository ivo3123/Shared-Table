let socket;
let loggedInUsername = null;

function connect() {
    socket = new WebSocket("ws://127.0.0.1:8080");

    socket.onopen = function(event) {
        if (loggedInUsername) {
            const identificationMessage = JSON.stringify({
                type: 'identify',
                username: loggedInUsername
            });
            socket.send(identificationMessage);
        }
    };

    socket.onmessage = function(event) {
        try {
            const messageData = JSON.parse(event.data);
            if (messageData.type === 'user_list') {
                updateUserList(messageData.users);
            }
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    };

    socket.onclose = function(event) {
        updateUserList([]);
    };

    socket.onerror = function(error) {
        console.error('WebSocket Error:', error);
    };
}

function updateUserList(users) {
    const userList = document.getElementById('online-users');
    if (!userList) return;

    userList.innerHTML = '';
    if (users && users.length > 0) {
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            userList.appendChild(li);
        });
    }
}

const form = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const userInfo = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

const anonymousCheckbox = document.getElementById('anonymous-checkbox');

function showUser(username) {
    userNameSpan.textContent = username;
    userInfo.style.display = 'block';
    form.style.display = 'none';
    const mainContainer = document.getElementById('main-container');
    mainContainer.style.display = 'block';
    loggedInUsername = username;
}

function showForm() {
    userInfo.style.display = 'none';
    form.style.display = 'block';
    const mainContainer = document.getElementById('main-container');
    mainContainer.style.display = 'none';
    loggedInUsername = null;
    updateUserList([]);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
}

logoutBtn.addEventListener('click', () => {
    showForm();
    usernameInput.value = '';
    passwordInput.value = '';
});


document.getElementById('register-btn').addEventListener('click', async () => {
    await submitAuth('register');
});

document.getElementById('login-btn').addEventListener('click', async () => {
    await submitAuth('login');
});


async function submitAuth(action) {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        alert('Моля, попълнете всички полета.');
        return;
    }

    let url = '';
    if (action === 'register') {
        url = '../backend/api/register.php'; 
    } else if (action === 'login') {
        url = '../backend/api/login.php';
    } else {
        alert('Невалидно действие.');
        return;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        alert(result.message);
        if (action === 'login' && response.ok) {
            showUser(username);
            connect();
        }
    } catch (error) {
        console.error('Грешка при fetch заявка:', error);
        alert('Възникна грешка при изпълнение на заявката.');
    }
}