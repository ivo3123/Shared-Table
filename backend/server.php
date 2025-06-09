<?php
require_once '../database/db.php';
require_once '../backend/user-handlers.php';

function routeRequest() {
    $uri = $_SERVER['REQUEST_URI'];
    $method = $_SERVER['REQUEST_METHOD'];

    if ($uri === '/login' && $method === 'POST') {
        loginHandler();
    }
    elseif ($uri === '/register' && $method === 'POST') {
        registerHandler();
    }
    else {
        http_response_code(404);
        echo json_encode(['message' => 'Endpoint not found']);
    }
}

routeRequest();

?>