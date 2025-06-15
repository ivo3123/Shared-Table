<?php
require_once '../database/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Методът не е позволен.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';
$isAnonymous = $input['isAnonymous'] ?? false;

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(['message' => 'Липсва потребителско име или парола.']);
    exit;
}

$stmt = $pdo->prepare("SELECT password FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['message' => 'Грешно потребителско име или парола.']);
    exit;
}

if ($isAnonymous) {
    $stmt = $pdo->query("SELECT Counter FROM LoginCounter WHERE Id = 1");
    $row = $stmt->fetch();
    $counter = $row ? $row['Counter'] : 0;

    $index = $counter % 3;

    $animals = ["panda", "polar bear", "koala"];

    $pdo->prepare("UPDATE LoginCounter SET Counter = Counter + 1 WHERE Id = 1")->execute();

    $usernameOrAnonymous = "Anonymous " . $animals[$index];

    $username = $username . " (" . $usernameOrAnonymous . ")";
} else {
    $usernameOrAnonymous = $username;
}

echo json_encode(['message' => 'Успешен вход.', 'username' => $username, 'usernameOrAnonymous' => $usernameOrAnonymous]);
?>
