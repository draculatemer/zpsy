-- ==========================================
-- ESTRUTURA DAS TABELAS PARA REEMBOLSOS
-- ==========================================
-- Execute este script no seu banco de dados MySQL/MariaDB
-- IMPORTANTE: Use este script se você não tem permissão para criar banco de dados
-- Ou se já tem um banco de dados e quer apenas criar as tabelas

-- Remova a linha abaixo se você já está dentro do banco correto
-- USE seu_banco_existente;

CREATE TABLE IF NOT EXISTS refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    protocol VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    phone_country VARCHAR(10) DEFAULT NULL,
    phone_code VARCHAR(10) DEFAULT NULL,
    purchase_date DATE NOT NULL,
    reason_category VARCHAR(100) NOT NULL,
    reason_category_text VARCHAR(255) DEFAULT NULL,
    reason TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en' COMMENT 'Idioma do formulário: en (inglês) ou es (espanhol)',
    activecampaign_contact_id INT DEFAULT NULL,
    activecampaign_list_id INT DEFAULT NULL,
    status ENUM('pending', 'processing', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_protocol (protocol),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_language (language),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para logs de erros do ActiveCampaign (opcional)
CREATE TABLE IF NOT EXISTS refund_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_id INT DEFAULT NULL,
    log_type ENUM('info', 'warning', 'error') DEFAULT 'info',
    message TEXT NOT NULL,
    context JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_refund_id (refund_id),
    INDEX idx_log_type (log_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

