<?php
require_once __DIR__ . '/../connect.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    // Handle GET request (get model by ID)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['id'])) {
            throw new Exception('Missing model ID', 400);
        }

        $id = filter_var($_GET['id'], FILTER_SANITIZE_NUMBER_INT);
        $stmt = $pdo->prepare("SELECT * FROM ai_models WHERE id = ?");
        $stmt->execute([$id]);
        $model = $stmt->fetch();

        if (!$model) {
            throw new Exception('Model not found', 404);
        }

        echo json_encode($model);
    }
    // Handle PUT request (update model)
    elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Invalid JSON input', 400);
        }

        if (empty($input['id'])) {
            throw new Exception('Model ID is required', 400);
        }

        $id = $input['id'];
        $required = ['displayName', 'providerName', 'modelName', 'apiKey'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                throw new Exception("Field $field is required", 400);
            }
        }

        $stmt = $pdo->prepare("UPDATE ai_models SET 
            display_name = :displayName, 
            provider = :providerName, 
            model_name = :modelName, 
            api_key = :apiKey, 
            base_url = :baseUrl, 
            is_active = :isActive,
            updated_at = NOW()
            WHERE id = :id");

        $success = $stmt->execute([
            'displayName' => $input['displayName'],
            'providerName' => $input['providerName'],
            'modelName' => $input['modelName'],
            'apiKey' => $input['apiKey'],
            'baseUrl' => $input['baseUrl'] ?? '',
            'isActive' => isset($input['isActive']) ? (int)$input['isActive'] : 0,
            'id' => $id
        ]);

        if (!$success) {
            throw new Exception('Failed to update model', 500);
        }

        if ($stmt->rowCount() === 0) {
            throw new Exception('Model not found or no changes made', 404);
        }

        echo json_encode(['success' => true, 'id' => $id]);
    } else {
        throw new Exception('Method not allowed', 405);
    }
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'error' => $e->getMessage(),
        'code' => $statusCode
    ]);
}