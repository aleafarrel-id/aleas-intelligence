<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../connect.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validasi input
if (empty($data['user_input']) || empty($data['ai_response']) || !isset($data['token_count']) || empty($data['memory_id'])) {
    echo json_encode(['error' => 'Input pengguna, respons AI, jumlah token, dan ID memori harus disediakan.']);
    http_response_code(400);
    exit();
}

try {
    $user_input = $data['user_input'];
    $ai_response = $data['ai_response'];
    $token_count = (int)$data['token_count'];
    $memory_id = $data['memory_id']; // ID for memory

    // Insert data to the memory table
    $stmt = $pdo->prepare("
        INSERT INTO memory (user_input, ai_response, token_count, memory_id, memory_type)
        VALUES (:user_input, :ai_response, :token_count, :memory_id, 'short')
    ");
    $stmt->execute([
        ':user_input' => $user_input,
        ':ai_response' => $ai_response,
        ':token_count' => $token_count,
        ':memory_id' => $memory_id
    ]);

    echo json_encode(['success' => true, 'message' => 'Memori berhasil disimpan.']);

} catch (PDOException $e) {
    error_log("Error saving memory: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Gagal menyimpan memori: ' . $e->getMessage()
    ]);
    http_response_code(500);
}
?>
