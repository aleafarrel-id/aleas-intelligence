<?php

// Set timezone
date_default_timezone_set('Asia/Jakarta'); // Adjust as needed

$host = 'SERVER_LOCATION';
$dbname = 'DATABASE_NAME';
$username = 'USERNAME';
$password = 'PASSWORD';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    
    echo json_encode([
        'error' => 'Database connection failed', 
        'details' => $e->getMessage(),
        'code' => 500
    ]);
    
    exit;
}
?>