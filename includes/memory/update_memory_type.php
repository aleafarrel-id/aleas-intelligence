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

// Input validation
if (empty($data['memory_id']) || empty($data['memory_type'])) {
    echo json_encode(['error' => 'ID memori dan tipe memori harus disediakan.']);
    http_response_code(400);
    exit();
}

try {
    $memory_id = $data['memory_id'];
    $memory_type = $data['memory_type']; // 'core' or 'short'

    // update memory type in memory table
    $stmt = $pdo->prepare("
        UPDATE memory
        SET memory_type = :memory_type
        WHERE memory_id = :memory_id
    ");
    $stmt->execute([
        ':memory_type' => $memory_type,
        ':memory_id' => $memory_id
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Tipe memori berhasil diperbarui.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Memori tidak ditemukan atau tipe memori sudah sama.']);
    }

} catch (PDOException $e) {
    error_log("Error updating memory type: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Gagal memperbarui tipe memori: ' . $e->getMessage()
    ]);
    http_response_code(500);
}
?>
