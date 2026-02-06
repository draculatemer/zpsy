<?php
// ==========================================
// EXEMPLO DE CONFIGURAÇÃO DO BANCO DE DADOS
// ==========================================
// Copie este arquivo para db-config.php e preencha com suas credenciais reais

// Configurações do banco de dados
define('DB_HOST', 'localhost');
define('DB_NAME', 'xaimonitor_xai_monitor');
define('DB_USER', 'xaimonitor_xai_monitor_user');      // ALTERE AQUI
define('DB_PASS', 'marvek160398');
define('DB_CHARSET', 'utf8mb4');

// ==========================================
// FUNÇÃO DE CONEXÃO COM O BANCO
// ==========================================
function getDbConnection() {
    static $conn = null;
    
    if ($conn === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            $conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Erro de conexão com banco de dados: " . $e->getMessage());
            return null;
        }
    }
    
    return $conn;
}

// ==========================================
// FUNÇÃO PARA SALVAR REEMBOLSO NO BANCO
// ==========================================
function saveRefundToDatabase($data) {
    $conn = getDbConnection();
    
    if (!$conn) {
        return [
            'success' => false,
            'error' => 'Erro ao conectar com o banco de dados'
        ];
    }
    
    try {
        $sql = "INSERT INTO refunds (
            protocol, 
            full_name, 
            email, 
            phone, 
            phone_country, 
            phone_code,
            purchase_date, 
            reason_category, 
            reason_category_text, 
            reason,
            activecampaign_contact_id,
            activecampaign_list_id,
            status
        ) VALUES (
            :protocol,
            :full_name,
            :email,
            :phone,
            :phone_country,
            :phone_code,
            :purchase_date,
            :reason_category,
            :reason_category_text,
            :reason,
            :ac_contact_id,
            :ac_list_id,
            'pending'
        )";
        
        $stmt = $conn->prepare($sql);
        
        $stmt->execute([
            ':protocol' => $data['protocol'] ?? '',
            ':full_name' => $data['fullName'] ?? '',
            ':email' => $data['email'] ?? '',
            ':phone' => $data['phone'] ?? '',
            ':phone_country' => $data['phoneCountry'] ?? null,
            ':phone_code' => $data['phoneCode'] ?? null,
            ':purchase_date' => $data['purchaseDate'] ?? date('Y-m-d'),
            ':reason_category' => $data['reasonCategory'] ?? '',
            ':reason_category_text' => $data['reasonCategoryText'] ?? null,
            ':reason' => $data['reason'] ?? '',
            ':ac_contact_id' => $data['acContactId'] ?? null,
            ':ac_list_id' => $data['acListId'] ?? null
        ]);
        
        $refundId = $conn->lastInsertId();
        
        return [
            'success' => true,
            'refundId' => $refundId
        ];
        
    } catch (PDOException $e) {
        error_log("Erro ao salvar reembolso no banco: " . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Erro ao salvar dados no banco de dados',
            'details' => $e->getMessage()
        ];
    }
}

// ==========================================
// FUNÇÃO PARA ATUALIZAR STATUS DO REEMBOLSO
// ==========================================
function updateRefundStatus($protocol, $status, $acContactId = null, $acListId = null) {
    $conn = getDbConnection();
    
    if (!$conn) {
        return false;
    }
    
    try {
        $sql = "UPDATE refunds SET 
            status = :status,
            activecampaign_contact_id = COALESCE(:ac_contact_id, activecampaign_contact_id),
            activecampaign_list_id = COALESCE(:ac_list_id, activecampaign_list_id),
            updated_at = NOW()
        WHERE protocol = :protocol";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':status' => $status,
            ':ac_contact_id' => $acContactId,
            ':ac_list_id' => $acListId,
            ':protocol' => $protocol
        ]);
        
        return $stmt->rowCount() > 0;
        
    } catch (PDOException $e) {
        error_log("Erro ao atualizar status do reembolso: " . $e->getMessage());
        return false;
    }
}

// ==========================================
// FUNÇÃO PARA SALVAR LOG
// ==========================================
function saveRefundLog($refundId, $logType, $message, $context = null) {
    $conn = getDbConnection();
    
    if (!$conn) {
        return false;
    }
    
    try {
        $sql = "INSERT INTO refund_logs (refund_id, log_type, message, context) 
                VALUES (:refund_id, :log_type, :message, :context)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':refund_id' => $refundId,
            ':log_type' => $logType,
            ':message' => $message,
            ':context' => $context ? json_encode($context) : null
        ]);
        
        return true;
        
    } catch (PDOException $e) {
        error_log("Erro ao salvar log: " . $e->getMessage());
        return false;
    }
}

