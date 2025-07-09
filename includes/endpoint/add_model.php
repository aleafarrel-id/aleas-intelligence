<?php
require_once __DIR__ . '/../connect.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'ok']);
        exit(0);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        throw new Exception('Invalid JSON input: ' . json_last_error_msg(), 400);
    }

    // Validation
    $required = ['displayName', 'providerName', 'modelName', 'apiKey'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field $field is required", 400);
        }
    }

    try {
        // Check if this an update or an insert
        if (!empty($input['id'])) {
            // Update model yang sudah ada
            $stmt = $pdo->prepare("UPDATE ai_models SET 
                display_name = ?, 
                provider = ?, 
                model_name = ?, 
                api_key = ?, 
                base_url = ?, 
                is_active = ?,
                updated_at = NOW()
                WHERE id = ?");
            
            $success = $stmt->execute([
                $input['displayName'],
                $input['providerName'],
                $input['modelName'],
                $input['apiKey'],
                $input['baseUrl'] ?? '',
                isset($input['isActive']) && $input['isActive'] ? 1 : 0,
                $input['id']
            ]);
            
            if (!$success) {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error (update): " . json_encode($errorInfo));
                throw new Exception('Failed to update database: ' . $errorInfo[2], 500);
            }
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('Model not found or no changes made', 404);
            }
            
            $modelId = $input['id'];
        } else {
            // Insert new ai model
            $stmt = $pdo->prepare("INSERT INTO ai_models 
                (display_name, provider, model_name, api_key, base_url, is_active) 
                VALUES (?, ?, ?, ?, ?, ?)");
            
            $success = $stmt->execute([
                $input['displayName'],
                $input['providerName'],
                $input['modelName'],
                $input['apiKey'],
                $input['baseUrl'] ?? '',
                isset($input['isActive']) && $input['isActive'] ? 1 : 0
            ]);

            if (!$success) {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error (insert): " . json_encode($errorInfo));
                throw new Exception('Failed to save to database: ' . $errorInfo[2], 500);
            }
            
            $modelId = $pdo->lastInsertId();
        }
    } catch (PDOException $e) {
        error_log("PDO Exception: " . $e->getMessage());
        throw new Exception('Database error: ' . $e->getMessage(), 500);
    }

    $response = [
        'success' => true,
        'id' => $modelId,
        'message' => !empty($input['id']) ? 'Model updated successfully' : 'Model added successfully'
    ];
    
    header('Content-Type: application/json');
    echo json_encode($response);

} catch (Exception $e) {    
    $statusCode = $e->getCode();
    if (!is_int($statusCode) || $statusCode < 100 || $statusCode > 599) {
        $statusCode = 500;
    }
    
    http_response_code($statusCode);
    
    $response = [
        'error' => $e->getMessage(),
        'code' => $statusCode
    ];
    
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    
    echo json_encode($response);
    exit;
}
?>