# Configuração do Banco de Dados para Reembolsos

## 📋 Instruções de Instalação

### 1. Criar o Banco de Dados

Execute o script SQL fornecido no arquivo `database.sql`:

```bash
mysql -u seu_usuario -p < database.sql
```

Ou execute manualmente no seu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)

### 2. Configurar Credenciais

Edite o arquivo `db-config.php` e altere as seguintes linhas:

```php
define('DB_HOST', 'localhost');        // Seu servidor MySQL
define('DB_NAME', 'xai_monitor');      // Nome do banco (já está correto)
define('DB_USER', 'seu_usuario');      // ALTERE AQUI
define('DB_PASS', 'sua_senha');        // ALTERE AQUI
```

### 3. Permissões do Arquivo

Certifique-se de que o arquivo `db-config.php` tenha as permissões corretas:

```bash
chmod 600 db-config.php  # Apenas o proprietário pode ler/escrever
```

**IMPORTANTE**: Por segurança, considere mover o arquivo `db-config.php` para fora do diretório público (acima da pasta `public_html` ou `www`).

### 4. Estrutura da Tabela

A tabela `refunds` armazena:
- Dados do solicitante (nome, email, telefone)
- Protocolo único de reembolso
- Data da compra
- Motivo do reembolso
- Status do processamento
- IDs do ActiveCampaign
- Timestamps de criação e atualização

### 5. Verificar Funcionamento

Após configurar, teste fazendo uma solicitação de reembolso. Verifique:

1. Se os dados aparecem no ActiveCampaign
2. Se os dados foram salvos no banco de dados:

```sql
SELECT * FROM refunds ORDER BY created_at DESC LIMIT 10;
```

## 🔒 Segurança

- **NUNCA** commite o arquivo `db-config.php` com credenciais reais no Git
- Use variáveis de ambiente em produção
- Mantenha backups regulares do banco de dados
- Use conexões SSL para o banco quando possível

## 📊 Consultas Úteis

### Ver todos os reembolsos pendentes:
```sql
SELECT * FROM refunds WHERE status = 'pending' ORDER BY created_at DESC;
```

### Contar reembolsos por status:
```sql
SELECT status, COUNT(*) as total FROM refunds GROUP BY status;
```

### Ver reembolsos de um email específico:
```sql
SELECT * FROM refunds WHERE email = 'email@exemplo.com' ORDER BY created_at DESC;
```

### Ver logs de erros:
```sql
SELECT * FROM refund_logs WHERE log_type = 'error' ORDER BY created_at DESC LIMIT 20;
```

## 🛠️ Manutenção

### Limpar logs antigos (mais de 90 dias):
```sql
DELETE FROM refund_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Backup da tabela:
```bash
mysqldump -u seu_usuario -p xai_monitor refunds > backup_refunds_$(date +%Y%m%d).sql
```

