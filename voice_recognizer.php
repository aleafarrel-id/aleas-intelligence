<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $tempDir = __DIR__ . '/tmp_audio';
    $whisperPath = '/var/www/whisper-env/bin/whisper'; // Adjust path to Whisper AI
    $model = 'base'; // Adjust model used for transcripting audio

    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Audio upload error.');
    }

    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }

    $filename = 'recording_' . time() . '_' . bin2hex(random_bytes(4)) . '.webm';
    $audioPath = $tempDir . '/' . $filename;

    if (!move_uploaded_file($_FILES['audio']['tmp_name'], $audioPath)) {
        throw new Exception('Failed to save audio file.');
    }

    $baseName = pathinfo($audioPath, PATHINFO_FILENAME);
    $outputFile = $tempDir . '/' . $baseName . '.txt';

    $command = escapeshellcmd("$whisperPath $audioPath") . " " .
               "--model $model " .
               "--language Indonesian " .
               "--initial_prompt \"Bahasa Indonesia\" " .
               "--temperature 0.2 " .
               "--output_dir $tempDir " .
               "--output_format txt 2>&1";

    if (connection_aborted()) {
        throw new Exception('Client aborted the request.');
    }

    exec($command, $output, $returnCode);

    chmod($outputFile, 0666);

    if ($returnCode !== 0) {
        throw new Exception('Whisper execution failed: ' . implode("\n", $output));
    }

    $maxWait = 30;
    $waited = 0;
    $transcript = '';

    while ($waited < $maxWait) {
        if (file_exists($outputFile) && filesize($outputFile) > 0) {
            sleep(1);
            $transcript = file_get_contents($outputFile);
            break;
        }
        sleep(1);
        $waited++;
    }

    if (empty(trim($transcript))) {
        throw new Exception('Transcription failed or file is empty.');
    }

    @unlink($audioPath);
    @unlink($outputFile);

    echo json_encode([
        'success' => true,
        'transcript' => trim($transcript)
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);

    if (isset($audioPath) && file_exists($audioPath)) @unlink($audioPath);
    if (isset($outputFile) && file_exists($outputFile)) @unlink($outputFile);
}
