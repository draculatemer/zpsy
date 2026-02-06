# 🔧 Instruções para Resolver Erro de Permissão

## ❌ Erro Recebido:
```
#1044 - Acesso negado para o usuário ao banco de dados 'xai_monitor'
```

## ✅ Solução: Usar um Banco de Dados Existente

Como você não tem permissão para criar bancos, vamos usar um banco que já existe.

### Passo 1: Descobrir seu banco de dados existente

No phpMyAdmin, veja na lista à esquerda qual banco você tem acesso. 
Geralmente tem um nome como: `cpses_seu_usuario` ou similar.

### Passo 2: Executar apenas as tabelas

1. No phpMyAdmin, **selecione o banco de dados existente** (clique nele na lista à esquerda)
2. Vá na aba **"SQL"**
3. Copie e cole o conteúdo do arquivo **`database-tables-only.sql`**
4. Clique em **"Executar"**

### Passo 3: Configurar o db-config.php

Edite o arquivo `refund/db-config.php` e altere:

```php
define('DB_NAME', 'nome_do_seu_banco_existente');  // Use o banco que você tem acesso
define('DB_USER', 'cpses_xanfhsg542');              // Seu usuário MySQL
define('DB_PASS', 'sua_senha_mysql');               // Sua senha MySQL
```

### Exemplo:

Se seu banco se chama `cpses_xanfhsg542`, configure assim:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'cpses_xanfhsg542');  // Seu banco existente
define('DB_USER', 'cpses_xanfhsg542');
define('DB_PASS', 'sua_senha_aqui');
```

## 📝 Resumo dos Arquivos

- **`database.sql`** - Versão completa (cria banco + tabelas) - **NÃO USE** se não tem permissão
- **`database-tables-only.sql`** - Versão que cria apenas as tabelas - **USE ESTE** ✅

## ✅ Verificar se Funcionou

Após executar, você deve ver no phpMyAdmin:
- Tabela `refunds` criada
- Tabela `refund_logs` criada

