<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../connect.php';

try {
    // Get all chat history and order by date_time
    $stmt = $pdo->prepare("
        SELECT user_input, ai_response, memory_id, memory_type
        FROM memory
        ORDER BY date_time ASC
    ");
    $stmt->execute();
    $chat_history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'history' => $chat_history]);

} catch (PDOException $e) {
    error_log("Error fetching chat history: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Gagal mengambil riwayat obrolan: ' . $e->getMessage()
    ]);
    http_response_code(500);
}
?>
