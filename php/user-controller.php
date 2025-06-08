<?php

class UserController {
    private $pdo;

    public function __construct() {
        global $pdo;
        $this->pdo = $pdo;
    }

    public function register($data) {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(["message" => "Потребителско име и парола са задължителни."]);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT Id FROM Users WHERE Username = ?");
        $stmt->execute([$username]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        error_log(print_r($stmt, true));
        error_log(print_r($result, true));

        if ($result !== false) {
            http_response_code(409);
            echo json_encode(["message" => "Потребителското име вече съществува."]);
            return;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $isAdmin = 0;

        try {
            $stmt = $this->pdo->prepare("INSERT INTO users (Username, Password, IsAdmin) VALUES (?, ?, ?)");
            $stmt->execute([$username, $hashedPassword, $isAdmin]);

            $userId = $this->pdo->lastInsertId();

            http_response_code(201);
            echo json_encode([
                "message" => "Регистрацията успешна.",
                "user" => [
                    "id" => $userId,
                    "username" => $username,
                    "isAdmin" => (bool)$isAdmin
                ]
            ]);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Грешка при регистрация: " . $e->getMessage()]);
        }
    }

    public function login($data) {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(["message" => "Потребителско име и парола са задължителни."]);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT Id, Username, Password, IsAdmin FROM Users WHERE Username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(["message" => "Грешно потребителско име или парола."]);
            return;
        }

        http_response_code(200);
        echo json_encode([
            "message" => "Входът успешен.",
            "user" => [
                "id" => $user['id'],
                "username" => $user['username'],
                "isAdmin" => (bool)$user['isAdmin']
            ]
        ]);
    }
}
?>