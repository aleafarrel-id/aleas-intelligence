<?php
require_once __DIR__ . '/../connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $stmt = $pdo->query("SELECT * FROM ai_models ORDER BY created_at DESC");
    $models = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $models
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>