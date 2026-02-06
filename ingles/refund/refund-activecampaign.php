<?php
// refund-activecampaign.php

// =============================
// CONFIGURAÇÕES DO ACTIVECAMPAIGN
// =============================
$AC_API_URL = 'https://matheus0597.api-us1.com/api/3'; // EX: https://meuusuario.api-us1.com/api/3
$AC_API_KEY = '1732527f801a7d9079e1a8ec0dda63e52003a8ea02b7c594ce05d4d76595b72ada955c72';                          // Coloque sua API key aqui
$AC_LIST_ID = 39;  

// =============================
// INCLUIR CONFIGURAÇÃO DO BANCO DE DADOS
// =============================
require_once __DIR__ . '/db-config.php';

header('Content-Type: application/json; charset=utf-8');

// Função de log
function writeLog($file, $content) {
    $log = "[" . date('Y-m-d H:i:s') . "] " . $content . PHP_EOL;
    file_put_contents($file, $log, FILE_APPEND);
}

// Aceita somente POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    writeLog("ac-error.log", "Método inválido: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Lê o JSON enviado
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

// Loga o conteúdo recebido do JS
writeLog("ac-success.log", "Recebido do front-end: " . $raw);

if (!$data || empty($data['email'])) {
    http_response_code(400);
    writeLog("ac-error.log", "Dados inválidos ou email ausente: " . $raw);
    echo json_encode(['error' => 'Invalid data or missing email']);
    exit;
}

// Sanitiza dados
$fullName = trim($data['fullName'] ?? '');
$email    = trim($data['email'] ?? '');
$phone    = trim($data['phone'] ?? '');
$protocol = trim($data['protocol'] ?? '');
$purchaseDate = $data['purchaseDate'] ?? '';
$reasonCategory = $data['reasonCategory'] ?? '';
$reasonCategoryText = $data['reasonCategoryText'] ?? '';
$reason = trim($data['reason'] ?? '');
$phoneCountry = $data['phoneCountry'] ?? null;
$phoneCode = $data['phoneCode'] ?? null;
$language = isset($data['language']) ? strtolower(trim($data['language'])) : 'en'; // Idioma: 'en' ou 'es'

// Validar idioma (apenas 'en' ou 'es')
if (!in_array($language, ['en', 'es'])) {
    $language = 'en'; // Default para inglês
}

$nameParts = preg_split('/\s+/', $fullName, -1, PREG_SPLIT_NO_EMPTY);
$firstName = $nameParts[0] ?? '';
$lastName  = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

// Preparar dados para salvar no banco
$dbData = [
    'protocol' => $protocol,
    'fullName' => $fullName,
    'email' => $email,
    'phone' => $phone,
    'phoneCountry' => $phoneCountry,
    'phoneCode' => $phoneCode,
    'purchaseDate' => $purchaseDate,
    'reasonCategory' => $reasonCategory,
    'reasonCategoryText' => $reasonCategoryText,
    'reason' => $reason,
    'language' => $language
];

// =============================
// Função de requisição
// =============================
function acRequest(string $method, string $endpoint, ?array $body, string $apiUrl, string $apiKey): array
{
    $ch = curl_init($apiUrl . $endpoint);

    $headers = [
        'Api-Token: ' . $apiKey,
        'Content-Type: application/json'
    ];

    $options = [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 30,
    ];

    if ($body !== null) {
        $options[CURLOPT_POSTFIELDS] = json_encode($body);
    }

    curl_setopt_array($ch, $options);

    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Log da resposta bruta
    writeLog("ac-success.log", "Resposta API ($endpoint): " . $resp);

    if ($err) {
        writeLog("ac-error.log", "Erro cURL ($endpoint): " . $err);
        return ['error' => $err, 'httpCode' => $code];
    }

    $json = json_decode($resp, true);

    // Caso resposta não seja JSON
    if ($json === null) {
        writeLog("ac-error.log", "Resposta não JSON ($endpoint): " . $resp);
        return ['raw' => $resp, 'httpCode' => $code];
    }

    $json['httpCode'] = $code;
    return $json;
}

// =============================
// 1) Criar / Atualizar contato
// =============================
$contactBody = [
    'contact' => [
        'email'     => $email,
        'firstName' => $firstName,
        'lastName'  => $lastName,
        'phone'     => $phone
    ]
];

$contactResp = acRequest('POST', '/contact/sync', $contactBody, $AC_API_URL, $AC_API_KEY);

if (!isset($contactResp['contact']['id'])) {
    http_response_code(500);
    writeLog("ac-error.log", "Erro contact/sync: " . json_encode($contactResp));
    echo json_encode([
        'error' => 'Failed to sync contact',
        'details' => $contactResp
    ]);
    exit;
}

$contactId = (int)$contactResp['contact']['id'];

// =============================
// 2) Adicionar à lista
// =============================
$listBody = [
    'contactList' => [
        'list'    => $AC_LIST_ID,
        'contact' => $contactId,
        'status'  => 1
    ]
];

$listResp = acRequest('POST', '/contactLists', $listBody, $AC_API_URL, $AC_API_KEY);

writeLog("ac-success.log", "Contato ".$contactId." enviado para lista ".$AC_LIST_ID);

// =============================
// SALVAR NO BANCO DE DADOS
// =============================
$dbData['acContactId'] = $contactId;
$dbData['acListId'] = $AC_LIST_ID;

$dbResult = saveRefundToDatabase($dbData);

if (!$dbResult['success']) {
    // Log do erro mas não interrompe o processo
    writeLog("ac-error.log", "Erro ao salvar no banco: " . ($dbResult['error'] ?? 'Erro desconhecido'));
    
    // Opcional: salvar log no banco se possível
    if (isset($dbResult['refundId'])) {
        saveRefundLog($dbResult['refundId'], 'error', 'Erro ao salvar dados iniciais', $dbResult);
    }
} else {
    writeLog("ac-success.log", "Reembolso salvo no banco com ID: " . $dbResult['refundId']);
    
    // Atualizar status para processing após envio bem-sucedido ao AC
    if (isset($dbResult['refundId'])) {
        updateRefundStatus($protocol, 'processing', $contactId, $AC_LIST_ID);
        saveRefundLog($dbResult['refundId'], 'info', 'Reembolso enviado para ActiveCampaign com sucesso', [
            'contactId' => $contactId,
            'listId' => $AC_LIST_ID
        ]);
    }
}

// =============================
// RESPOSTA FINAL PARA O FRONT
// =============================
$response = [
    'ok' => true,
    'contactId' => $contactId,
    'protocol'  => $protocol,
    'acContact' => $contactResp,
    'acList'    => $listResp
];

// Adicionar informação do banco se disponível
if (isset($dbResult['refundId'])) {
    $response['dbRefundId'] = $dbResult['refundId'];
    $response['dbSaved'] = true;
} else {
    $response['dbSaved'] = false;
    $response['dbError'] = $dbResult['error'] ?? 'Erro desconhecido';
}

echo json_encode($response);
