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
    // Get 3 last chat (short memory)
    $stmt_short = $pdo->prepare("
        SELECT user_input, ai_response
        FROM memory
        WHERE memory_type = 'short'
        ORDER BY date_time DESC
        LIMIT 3
    ");
    $stmt_short->execute();
    $short_memory = $stmt_short->fetchAll(PDO::FETCH_ASSOC);

    // Get all memory with 'core' type
    $stmt_core = $pdo->prepare("
        SELECT user_input, ai_response
        FROM memory
        WHERE memory_type = 'core'
        ORDER BY date_time ASC
    ");
    $stmt_core->execute();
    $core_memory = $stmt_core->fetchAll(PDO::FETCH_ASSOC);

    // Merge core and short memory. core must be the priority.
    $combined_memory = array_merge($core_memory, array_reverse($short_memory)); // Reverse short_memory so the latest at last

    echo json_encode(['success' => true, 'memory' => $combined_memory]);

} catch (PDOException $e) {
    error_log("Error fetching memory: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Gagal mengambil memori: ' . $e->getMessage()
    ]);
    http_response_code(500);
}
?>
