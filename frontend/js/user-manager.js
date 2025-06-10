let socket;
let loggedInUsername = null; // Променлива за запазване на логнатия потребител

function connect() {
    socket = new WebSocket("ws://127.0.0.1:8080");

    socket.onopen = function(event) {
        // document.getElementById("output").innerHTML += "<span style='color: green;'>Connected to server</span><br>";
        // Изпращаме JSON обект за идентификация
        if (loggedInUsername) {
            const identificationMessage = JSON.stringify({
                type: 'identify',
                username: loggedInUsername
            });
            socket.send(identificationMessage);
        }
    };

    socket.onmessage = function(event) {
        // Очакваме JSON от сървъра, който да е 'user_list' или 'system_message'
        try {
            const messageData = JSON.parse(event.data);
            if (messageData.type === 'user_list') {
                updateUserList(messageData.users); // Актуализирай списъка с потребители
            } else if (messageData.type === 'system_message') {
                // Показване на системни съобщения (напр. "X се присъедини/напусна")
                // document.getElementById("output").innerHTML += "<span style='color: gray; font-style: italic;'>" + messageData.message + "</span><br>";
            } else {
                // За други неочаквани JSON съобщения (не би трябвало да има при тази логика)
                // document.getElementById("output").innerHTML += "<span style='color: purple;'>Received unexpected JSON:</span> " + event.data + "<br>";
            }
        } catch (e) {
            // Ако съобщението не е JSON (не би трябвало да има такива от сървъра вече)
            // document.getElementById("output").innerHTML += "<span style='color: red;'>Raw message (error parsing JSON):</span> " + event.data + "<br>";
        }
    };

    socket.onclose = function(event) {
        //document.getElementById("output").innerHTML += "<span style='color: red;'>Disconnected from server</span><br>";
        updateUserList([]); // Изчистване на списъка с потребители при затваряне
    };

    socket.onerror = function(error) {
        console.error('WebSocket Error:', error);
        //document.getElementById("output").innerHTML += "<span style='color: darkred;'>WebSocket Error: " + error.message + "</span><br>";
    };
}

// Функцията sendMessage вече не е нужна, тъй като няма чат съобщения.
// Ако в бъдеще решите да добавите чат, ще я имплементирате отново тук.
// function sendMessage(message) { /* ... */ }


function updateUserList(users) {
    const userList = document.getElementById('online-users');
    if (!userList) return;

    userList.innerHTML = ''; // Изчисти текущия списък
    if (users && users.length > 0) {
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            userList.appendChild(li);
        });
    } else {
        // const li = document.createElement('li');
        // li.textContent = 'Няма онлайн потребители.';
        // userList.appendChild(li);
    }
}

const form = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const userInfo = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

// Променлива за референция към елемента за изход
const outputDiv = document.getElementById('output');


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
    // Изчисти output div-а при изход
    if (outputDiv) {
        outputDiv.innerHTML = '';
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
    // Предполагам, че 'backend/api/' е коректният път спрямо index2.html
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
            connect(); // Инициираме WebSocket връзка. Съобщението с username ще се изпрати в onopen.
        }
    } catch (error) {
        console.error('Грешка при fetch заявка:', error);
        alert('Възникна грешка при изпълнение на заявката.');
    }
}