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
}

function showForm() {
    userInfo.style.display = 'none';
    form.style.display = 'block';
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
        }
    } catch (error) {
        console.error('Грешка при fetch заявка:', error);
        alert('Възникна грешка при изпълнение на заявката.');
    }
}