# 📋 Área Administrativa de Reembolsos

## 🚀 Como Acessar

Acesse o arquivo `admin-refunds.php` no navegador:

```
http://seudominio.com/refund/admin-refunds.php
```

## ✨ Funcionalidades

### 1. **Dashboard com Estatísticas**
- Visualização rápida de reembolsos por status
- Cards coloridos com contadores:
  - 🔴 Pendentes
  - 🔵 Processando
  - 🟢 Aprovados
  - 🟡 Rejeitados
  - ⚫ Concluídos

### 2. **Filtros Avançados**
- **Status**: Filtrar por status específico
- **Busca**: Buscar por nome, email, protocolo ou telefone
- **Data Inicial/Final**: Filtrar por período

### 3. **Tabela Paginada**
- 20 itens por página
- Navegação entre páginas
- Informação de página atual e total

### 4. **Ações Disponíveis**

#### Para Reembolsos Pendentes/Processando:
- ✅ **Aprovar** - Muda status para "approved"
- ❌ **Rejeitar** - Muda status para "rejected"
- 👁️ **Ver** - Visualiza detalhes completos

#### Para Reembolsos Aprovados:
- 💰 **Marcar como Devolvido** - Muda status para "completed"
- 👁️ **Ver** - Visualiza detalhes completos

### 5. **Modal de Detalhes**
- Visualização completa de todos os dados do reembolso
- Informações do ActiveCampaign
- Datas de criação e atualização

## 📊 Estrutura da Tabela

A tabela exibe:
- Protocolo (único)
- Nome completo
- Email
- Telefone
- Data da compra
- Motivo (resumido)
- Status (com badge colorido)
- Data da solicitação
- Botões de ação

## 🔒 Segurança

**IMPORTANTE**: Esta área não tem autenticação. Adicione proteção antes de usar em produção:

### Opção 1: Autenticação Básica (HTTP)
Adicione no início do `admin-refunds.php`:

```php
if (!isset($_SERVER['PHP_AUTH_USER']) || 
    $_SERVER['PHP_AUTH_USER'] !== 'admin' || 
    $_SERVER['PHP_AUTH_PW'] !== 'sua_senha_aqui') {
    header('WWW-Authenticate: Basic realm="Admin Area"');
    header('HTTP/1.0 401 Unauthorized');
    die('Acesso negado');
}
```

### Opção 2: Sistema de Login Completo
Implemente um sistema de sessão com login/logout.

## 🎨 Personalização

### Cores dos Status
Edite as classes CSS no arquivo:
- `.status-pending` - Amarelo
- `.status-processing` - Azul
- `.status-approved` - Verde
- `.status-rejected` - Vermelho
- `.status-completed` - Cinza

### Itens por Página
Altere a variável `$itemsPerPage` no início do arquivo:

```php
$itemsPerPage = 20; // Altere para o número desejado
```

## 📱 Responsividade

A interface é totalmente responsiva e funciona em:
- 💻 Desktop
- 📱 Tablet
- 📱 Mobile

## 🔄 Atualização de Status

O sistema usa AJAX para atualizar status sem recarregar a página. Os logs são salvos automaticamente na tabela `refund_logs`.

## 📝 Logs

Todas as alterações de status são registradas na tabela `refund_logs` com:
- ID do reembolso
- Tipo de log (info, warning, error)
- Mensagem
- Contexto (JSON)
- Data/hora

## 🐛 Troubleshooting

### Erro ao atualizar status
- Verifique se o arquivo `update-refund-status.php` está no mesmo diretório
- Verifique permissões de escrita no banco de dados
- Veja os logs de erro do PHP

### Tabela não aparece
- Verifique se as tabelas `refunds` e `refund_logs` foram criadas
- Verifique a conexão com o banco em `db-config.php`

### Filtros não funcionam
- Verifique se os parâmetros GET estão sendo passados corretamente
- Verifique se o banco de dados está acessível

## 📈 Melhorias Futuras

Possíveis melhorias:
- Exportar para CSV/Excel
- Enviar email ao cliente ao mudar status
- Histórico completo de alterações
- Comentários internos
- Upload de comprovantes
- Relatórios em PDF

