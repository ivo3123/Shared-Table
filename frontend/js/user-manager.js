let socket;
let loggedInUsername = null; // Добави променлива за запазване на логнатия потребител

function connect() {
    socket = new WebSocket("ws://127.0.0.1:8080");
    socket.onopen = function(event) {
        document.getElementById("output").innerHTML += "<span style='color: green;'>Connected to server</span><br>";
        // *** Ето тук е промяната: Изпрати потребителското име след като връзката е отворена ***
        if (loggedInUsername) { // Проверяваме дали имаме логнат потребител
            sendMessage(loggedInUsername); // Изпращаме неговото потребителско име
        }
    };
    socket.onmessage = function(event) {
        // Очакваме JSON от сървъра
        try {
            const messageData = JSON.parse(event.data);
            if (messageData.type === 'user_list') {
                updateUserList(messageData.users); // Актуализирай списъка с потребители
            } else if (messageData.type === 'chat_message') {
                // Ако имаш чат съобщения, покажи ги
                document.getElementById("output").innerHTML += "<span style='color: blue;'>" + messageData.sender + ":</span> " + messageData.message + "<br>";
            } else {
                // Други съобщения, ако има, или необработени JSON обекти
                document.getElementById("output").innerHTML += "<span style='color: blue;'>Message received (JSON):</span> " + event.data + "<br>";
            }
        } catch (e) {
            // Ако не е JSON, покажи като обикновен текст
            document.getElementById("output").innerHTML += "<span style='color: blue;'>Raw message:</span> " + event.data + "<br>";
        }
    };
    socket.onclose = function(event) {
        document.getElementById("output").innerHTML += "<span style='color: red;'>Disconnected from server</span><br>";
        // Изчисти списъка с потребители или покажи, че няма връзка
        updateUserList([]); // Изчистване на списъка при затваряне
    };
}

// Функцията sendMessage вече не е нужна да се извиква веднага след connect()
// Тя ще се извика автоматично в onopen за изпращане на username.
// Ако искаш да изпращаш други съобщения по-късно (напр. от input поле), можеш да я ползваш така:
function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) { // Проверка дали сокетът е отворен
        socket.send(message);
        document.getElementById("output").innerHTML += "<span style='color: purple;'>Message sent:</span> " + message + "<br>";
        // Ако имаш input поле за съобщения, можеш да го изчистиш тук
        // const messageInput = document.getElementById("messageInput");
        // if (messageInput) messageInput.value = "";
    } else {
        document.getElementById("output").innerHTML += "<span style='color: orange;'>Could not send message: WebSocket not open.</span><br>";
    }
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
    } else {
        const li = document.createElement('li');
        li.textContent = 'Няма онлайн потребители.';
        userList.appendChild(li);
    }
}

const form = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const userInfo = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

function showUser(username) {
    userNameSpan.textContent = username;
    userInfo.style.display = 'block';
    form.style.display = 'none';
    loggedInUsername = username; // Запази потребителското име
}

function showForm() {
    userInfo.style.display = 'none';
    form.style.display = 'block';
    loggedInUsername = null; // Изчисти потребителското име при изход
    updateUserList([]); // Изчисти списъка с потребители при изход
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(); // Затвори WebSocket връзката при изход
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
    // Увери се, че пътищата са правилни спрямо структурата на твоя проект
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
            showUser(username); // Показваме потребителското име и го запазваме в loggedInUsername
            connect(); // Инициираме WebSocket връзка. Съобщението ще се изпрати в onopen.
            // НЕ извиквай sendMessage(username) тук директно!
        }
    } catch (error) {
        console.error('Грешка при fetch заявка:', error);
        alert('Възникна грешка при изпълнение на заявката.');
    }
}