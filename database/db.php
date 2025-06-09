<?php

$host = 'localhost';
$db   = 'shared_table_db';
$username = 'root';
$password = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

$pdo = new PDO($dsn, $username, $password);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$createDatabaseQuery = "CREATE DATABASE IF NOT EXISTS my_database";
$pdo->exec($createDatabaseQuery);

$pdo->exec("USE my_database");

$createTableQuery = "
    CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    )";

$pdo->exec($createTableQuery);

?>