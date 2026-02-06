<?php
// ==========================================
// API PARA ATUALIZAR STATUS DO REEMBOLSO
// ==========================================
require_once __DIR__ . '/db-config.php';

header('Content-Type: application/json; charset=utf-8');

// Aceita somente POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Lê o JSON enviado
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || empty($data['protocol']) || empty($data['status'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Protocol and status are required']);
    exit;
}

$protocol = trim($data['protocol']);
$newStatus = trim($data['status']);

// Validar status
$validStatuses = ['pending', 'processing', 'approved', 'rejected', 'completed'];
if (!in_array($newStatus, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid status']);
    exit;
}

// Atualizar status
$result = updateRefundStatus($protocol, $newStatus);

if ($result) {
    // Buscar o ID do reembolso para salvar log
    $conn = getDbConnection();
    $sql = "SELECT id FROM refunds WHERE protocol = :protocol";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':protocol' => $protocol]);
    $refund = $stmt->fetch();
    
    if ($refund) {
        saveRefundLog($refund['id'], 'info', "Status alterado para: {$newStatus}", [
            'protocol' => $protocol,
            'old_status' => null, // Poderia buscar o status anterior se necessário
            'new_status' => $newStatus
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Status atualizado com sucesso',
        'protocol' => $protocol,
        'status' => $newStatus
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao atualizar status no banco de dados'
    ]);
}

