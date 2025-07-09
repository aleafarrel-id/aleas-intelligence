<?php
require_once __DIR__ . '/../connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $stmt = $pdo->query("
        SELECT 
            model_name AS id,
            display_name AS name
        FROM ai_models 
        WHERE is_active = TRUE
        ORDER BY display_name ASC
    ");
    
    $models = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'models' => $models
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>