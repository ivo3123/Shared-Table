<?php
require_once '../database/db.php';

function loginHandler() {
    $username = isset($_POST['username']) ? $_POST['username'] : null;
    $password = isset($_POST['password']) ? $_POST['password'] : null;

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(['message' => 'Missing username or password']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT password FROM users WHERE username = ?");

    try {
        $stmt->execute([$username]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
    $user = $stmt->fetch();

    if (!$user || !password_verify(password_hash($username), $user['password'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Invalid username or password']);
        exit;
    }

    http_response_code(200);
}

function registerHandler() {
    $username = isset($_POST['username']) ? $_POST['username'] : null;
    $password = isset($_POST['password']) ? $_POST['password'] : null;

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(['message' => 'Missing username or password']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    
    try {
        $stmt->execute([$username]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
        exit;
    }

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['message' => 'Username already exists']);
        exit;
    }

    $hashedPassword = password_hash($password);
    $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    
    try {
        $stmt->execute([$username, $hashedPassword]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
    }

    http_response_code(201);
}
?>