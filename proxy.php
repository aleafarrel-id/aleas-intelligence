<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/includes/connect.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Input validation
if (empty($data['message']) || empty($data['model'])) {
    echo json_encode(['error' => 'Pesan dan model harus dipilih']);
    http_response_code(400);
    exit();
}

try {
    // Get credentials from DB
    $stmt = $pdo->prepare("
        SELECT model_name, api_key, base_url
        FROM ai_models
        WHERE model_name = :model
        AND is_active = TRUE
    ");
    $stmt->execute([':model' => $data['model']]);
    $modelConfig = $stmt->fetch();

    if (!$modelConfig) {
        echo json_encode(['error' => 'Model tidak tersedia']);
        http_response_code(404);
        exit();
    }

    // Get memory from endpoint by including the file directly
    ob_start(); // Start output buffering
    require_once __DIR__ . '/includes/memory/get_memory.php';
    $memory_response = ob_get_clean(); // Get the output and clean the buffer
    $memory_data = json_decode($memory_response, true);

    $messages = [
        [
            'role' => 'system',
            'content' => 'Anda adalah asisten AI bernama Alea. Berikan jawaban yang paling sesuai dan akurat dengan pertanyaan secara singkat dan jelas tanpa memaparkan alur berpikir internal.'
        ]
    ];

    // Add memory to message
    if ($memory_data['success'] && !empty($memory_data['memory'])) {
        foreach ($memory_data['memory'] as $mem) {
            $messages[] = ['role' => 'user', 'content' => $mem['user_input']];
            $messages[] = ['role' => 'assistant', 'content' => $mem['ai_response']];
        }
    }

    // Add present user message
    $messages[] = ['role' => 'user', 'content' => trim($data['message'])];

    // Prepare the payload
    $payload = [
        'model' => $modelConfig['model_name'],
        'messages' => $messages,
        'stream' => true
    ];

    // Hit API provider with streaming
    $ch = curl_init($modelConfig['base_url']);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $modelConfig['api_key'],
            'Content-Type: application/json',
            'HTTP-Referer: https://yourdomain.com',
            'X-Title: Alea AI'
        ],
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_WRITEFUNCTION => function($curl, $data) {
            // Forward every chunk to client
            echo $data;
            flush();
            return strlen($data);
        },
        CURLOPT_TIMEOUT => 120,
        CURLOPT_FAILONERROR => true
    ]);

    // Request execution
    curl_exec($ch);
    
    if (curl_errno($ch)) {
        $error = json_encode(['error' => 'Koneksi API gagal: ' . curl_error($ch)]);
        echo "data: $error\n\n";
        flush();
    }
    
    curl_close($ch);
    exit();

} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    echo json_encode([
        'error' => 'Terjadi kesalahan',
        'details' => $e->getMessage()
    ]);
    http_response_code(500);
}
?>
