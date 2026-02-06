-- ==========================================
-- ADICIONAR CAMPO LANGUAGE NA TABELA REFUNDS
-- ==========================================
-- Execute este script se a tabela já existe e você precisa adicionar o campo

ALTER TABLE refunds 
ADD COLUMN language VARCHAR(10) DEFAULT 'en' 
COMMENT 'Idioma do formulário: en (inglês) ou es (espanhol)' 
AFTER reason;

-- Adicionar índice para melhor performance em filtros
ALTER TABLE refunds 
ADD INDEX idx_language (language);

