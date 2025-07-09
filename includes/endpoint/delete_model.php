<?php
require_once __DIR__ . '/../connect.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        throw new Exception('Method not allowed', 405);
    }

    if (isset($_GET['id'])) {
        $id = filter_var($_GET['id'], FILTER_SANITIZE_NUMBER_INT);
        // Delete model by id
        $stmt = $pdo->prepare("DELETE FROM ai_models WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Model not found', 404);
        }
    } else {
        // Check if there are any records in the ai_models table
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM ai_models");
        $checkStmt->execute();
        $rowCount = $checkStmt->fetchColumn();

        if ($rowCount > 0) {
            // Delete all available model from database
            $stmt = $pdo->prepare("DELETE FROM ai_models");
            $stmt->execute();
            echo json_encode(['success' => true, 'message' => 'Seluruh model AI berhasil dihapus.']);
        } else {
            echo json_encode(['success' => true, 'message' => 'Tidak ada model AI untuk dihapus.']);
        }
    }


} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'error' => $e->getMessage(),
        'code' => $statusCode
    ]);
}