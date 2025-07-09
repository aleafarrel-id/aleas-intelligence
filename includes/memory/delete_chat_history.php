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

try {
    // Check if there are any records in the memory table
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM memory");
    $checkStmt->execute();
    $rowCount = $checkStmt->fetchColumn();

    if ($rowCount > 0) {
        // Delete all data from memory table
        $stmt = $pdo->prepare("DELETE FROM memory");
        $stmt->execute();
        echo json_encode(['success' => true, 'message' => 'Riwayat obrolan berhasil dihapus.']);
    } else {
        echo json_encode(['success' => true, 'message' => 'Tidak ada riwayat obrolan untuk dihapus.']);
    }

} catch (PDOException $e) {
    error_log("Error deleting chat history: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Gagal menghapus riwayat obrolan: ' . $e->getMessage()
    ]);
    http_response_code(500);
}
?>
