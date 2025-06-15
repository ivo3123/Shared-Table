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
    const userListCircle = document.getElementById('online-users-circles');
    if (!userListCircle) return;
    userListCircle.innerHTML = '';
    users.forEach(async (user) => {
        try {
            const url = '../backend/api/user-image.php';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user }),
            });

            const result = await response.json();
            const picturePath = result.pictureName;
            const username = result.username;

            const div = document.createElement('div');
            div.classList.add('online-user');
            if (picturePath) {
                div.innerHTML = `
                    <img class="online-user-image" src="../${picturePath}">
                    <p>${username}</p>
                `;
            } else {
                firstLetter = username.charAt(0);
                div.innerHTML = `
                    <div class="circle-letters online-user-image">${firstLetter}</div>
                    <p>${username}</p>
                `;
            }
            userListCircle.appendChild(div);
        } catch (error) {
            console.error('Грешка при fetch заявка:', error);
            alert('Възникна грешка при изпълнение на заявката.');
        }
    });
}

const form = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const userInfo = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

const anonymousCheckbox = document.getElementById('anonymous-checkbox');

function showUser(username, usernameOrAnonymous) {
    userNameSpan.textContent = username;
    userInfo.style.display = 'block';
    form.style.display = 'none';
    const mainContainer = document.getElementById('main-container');
    mainContainer.style.display = 'block';
    loggedInUsername = usernameOrAnonymous;
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
        isAnonymousCheckbox = document.getElementById('anonymous-checkbox')
        isAnonymous = isAnonymousCheckbox.checked

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, isAnonymous }),
        });
        const result = await response.json();
        alert(result.message);
        if (action === 'login' && response.ok) {
            showUser(result.username, result.usernameOrAnonymous);
            connect();
        }
    } catch (error) {
        console.error('Грешка при fetch заявка:', error);
        alert('Възникна грешка при изпълнение на заявката.');
    }
}