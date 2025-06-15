<?php
require_once '../database/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Методът не е позволен.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$username = $data['user'] ?? '';

if (!$username) {
    http_response_code(400);
    echo json_encode(["error" => "Missing username"]);
    exit;
}

$stmt = $pdo->prepare("SELECT Id FROM Users WHERE Username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user) {
    $prefix = 'Anonymous ';
    $animal = substr($username, strlen($prefix));

    $animals = [
        "panda" => 1,
        "polar bear" => 2,
        "koala" => 3
    ];

    echo json_encode([
        "username" => $username,
        "pictureName" => 'backend/static/avatars/' . $animals[$animal] . '.png'
    ]);
    exit;
}

$stmt = $pdo->prepare("SELECT UploadPictureName FROM UsersUploads WHERE UserId = ? ORDER BY CreateDate DESC LIMIT 1");
$stmt->execute([$user['Id']]);
$picture = $stmt->fetch();

$path = $picture ? "backend/static/uploads/" . $picture['UploadPictureName'] : null;

echo json_encode([
    "username" => $username,
    "pictureName" => $path
]);
?>
