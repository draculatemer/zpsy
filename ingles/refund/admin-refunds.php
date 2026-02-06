<?php
// ==========================================
// ÁREA ADMINISTRATIVA - GERENCIAR REEMBOLSOS
// ==========================================
require_once __DIR__ . '/db-config.php';

// Configurações de paginação
$itemsPerPage = 20;
$currentPage = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$offset = ($currentPage - 1) * $itemsPerPage;

// Filtros
$statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
$languageFilter = isset($_GET['language']) ? $_GET['language'] : '';
$searchTerm = isset($_GET['search']) ? trim($_GET['search']) : '';
$dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : '';
$dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : '';

// Construir query com filtros
$whereConditions = [];
$params = [];

if ($statusFilter && $statusFilter !== 'all') {
    $whereConditions[] = "status = :status";
    $params[':status'] = $statusFilter;
}

if ($languageFilter && $languageFilter !== 'all') {
    $whereConditions[] = "language = :language";
    $params[':language'] = $languageFilter;
}

if ($searchTerm) {
    $whereConditions[] = "(full_name LIKE :search OR email LIKE :search OR protocol LIKE :search OR phone LIKE :search)";
    $params[':search'] = "%{$searchTerm}%";
}

if ($dateFrom) {
    $whereConditions[] = "DATE(created_at) >= :date_from";
    $params[':date_from'] = $dateFrom;
}

if ($dateTo) {
    $whereConditions[] = "DATE(created_at) <= :date_to";
    $params[':date_to'] = $dateTo;
}

$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

// Contar total de registros
$conn = getDbConnection();

if (!$conn) {
    die('
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Erro de Conexão</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
            .error-box { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; margin-bottom: 20px; }
            .error-details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
            code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
            ol { line-height: 1.8; }
            .file-path { color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="error-box">
            <h1>❌ Erro de Conexão com Banco de Dados</h1>
            <p>Não foi possível conectar ao banco de dados. Verifique:</p>
            
            <div class="error-details">
                <ol>
                    <li><strong>Arquivo de configuração:</strong><br>
                        <span class="file-path">refund/db-config.php</span>
                    </li>
                    <li><strong>Credenciais corretas:</strong><br>
                        <code>DB_HOST</code>, <code>DB_NAME</code>, <code>DB_USER</code>, <code>DB_PASS</code>
                    </li>
                    <li><strong>Banco de dados existe:</strong><br>
                        Verifique se o banco foi criado e as tabelas existem
                    </li>
                    <li><strong>Permissões do usuário:</strong><br>
                        O usuário MySQL precisa ter permissão para acessar o banco
                    </li>
                </ol>
            </div>
            
            <p><strong>Próximos passos:</strong></p>
            <ol>
                <li>Abra o arquivo <code>refund/db-config.php</code></li>
                <li>Configure as credenciais do banco de dados</li>
                <li>Execute o script SQL para criar as tabelas (se ainda não fez)</li>
                <li>Verifique os logs de erro do PHP para mais detalhes</li>
            </ol>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                💡 Dica: Verifique o arquivo <code>README-DATABASE.md</code> para instruções detalhadas.
            </p>
        </div>
    </body>
    </html>
    ');
}

$countSql = "SELECT COUNT(*) as total FROM refunds $whereClause";
$countStmt = $conn->prepare($countSql);
foreach ($params as $key => $value) {
    $countStmt->bindValue($key, $value);
}
$countStmt->execute();
$totalItems = $countStmt->fetch()['total'];
$totalPages = ceil($totalItems / $itemsPerPage);

// Buscar reembolsos
if (!$conn) {
    die('Erro: Conexão com banco de dados não estabelecida');
}

$sql = "SELECT * FROM refunds $whereClause ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
$stmt = $conn->prepare($sql);

// Bind dos parâmetros de filtro
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value);
}

// Bind dos parâmetros de paginação
$stmt->bindValue(':limit', $itemsPerPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$refunds = $stmt->fetchAll();

// Estatísticas
$statsSql = "SELECT 
    status, 
    COUNT(*) as count 
FROM refunds 
GROUP BY status";
$statsStmt = $conn->query($statsSql);
$stats = [];
while ($row = $statsStmt->fetch()) {
    $stats[$row['status']] = $row['count'];
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar Reembolsos - Admin</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #1a1a1a;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-card.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .stat-card.processing { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .stat-card.approved { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        .stat-card.rejected { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
        .stat-card.completed { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }
        
        .stat-card .number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-card .label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .filters {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .filters h2 {
            margin-bottom: 20px;
            color: #1a1a1a;
            font-size: 20px;
        }
        
        .filter-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .filter-group {
            display: flex;
            flex-direction: column;
        }
        
        .filter-group label {
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .filter-group input,
        .filter-group select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .filter-group input:focus,
        .filter-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn-filter {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.3s;
        }
        
        .btn-filter:hover {
            background: #5568d3;
        }
        
        .btn-clear {
            background: #e0e0e0;
            color: #666;
        }
        
        .btn-clear:hover {
            background: #d0d0d0;
        }
        
        .table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background: #f8f9fa;
        }
        
        th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 15px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
        }
        
        tbody tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-pending { background: #fff3cd; color: #856404; }
        .status-processing { background: #cfe2ff; color: #084298; }
        .status-approved { background: #d1e7dd; color: #0f5132; }
        .status-rejected { background: #f8d7da; color: #842029; }
        .status-completed { background: #d0d0d0; color: #1a1a1a; }
        
        .action-buttons {
            display: flex;
            gap: 8px;
        }
        
        .btn-action {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s;
        }
        
        .btn-approve {
            background: #28a745;
            color: white;
        }
        
        .btn-approve:hover {
            background: #218838;
        }
        
        .btn-reject {
            background: #dc3545;
            color: white;
        }
        
        .btn-reject:hover {
            background: #c82333;
        }
        
        .btn-complete {
            background: #17a2b8;
            color: white;
        }
        
        .btn-complete:hover {
            background: #138496;
        }
        
        .btn-view {
            background: #6c757d;
            color: white;
        }
        
        .btn-view:hover {
            background: #5a6268;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 30px;
            background: white;
            border-top: 1px solid #e9ecef;
        }
        
        .pagination button {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .pagination button:hover:not(:disabled) {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .pagination .current {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .pagination-info {
            margin: 0 15px;
            color: #666;
            font-size: 14px;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            margin-bottom: 20px;
        }
        
        .modal-header h2 {
            color: #1a1a1a;
            margin-bottom: 10px;
        }
        
        .modal-body {
            margin-bottom: 20px;
        }
        
        .detail-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .detail-label {
            font-weight: 600;
            color: #666;
            width: 150px;
            flex-shrink: 0;
        }
        
        .detail-value {
            color: #1a1a1a;
            flex: 1;
        }
        
        .modal-footer {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .alert {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: #d1e7dd;
            color: #0f5132;
            border: 1px solid #badbcc;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #842029;
            border: 1px solid #f5c2c7;
        }
        
        @media (max-width: 768px) {
            .filter-row {
                grid-template-columns: 1fr;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
            
            .action-buttons {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Gerenciar Reembolsos</h1>
            <p style="color: #666; margin-top: 5px;">Total de solicitações: <strong><?php echo $totalItems; ?></strong></p>
            
            <div class="stats">
                <div class="stat-card pending">
                    <div class="number"><?php echo $stats['pending'] ?? 0; ?></div>
                    <div class="label">Pendentes</div>
                </div>
                <div class="stat-card processing">
                    <div class="number"><?php echo $stats['processing'] ?? 0; ?></div>
                    <div class="label">Processando</div>
                </div>
                <div class="stat-card approved">
                    <div class="number"><?php echo $stats['approved'] ?? 0; ?></div>
                    <div class="label">Aprovados</div>
                </div>
                <div class="stat-card rejected">
                    <div class="number"><?php echo $stats['rejected'] ?? 0; ?></div>
                    <div class="label">Rejeitados</div>
                </div>
                <div class="stat-card completed">
                    <div class="number"><?php echo $stats['completed'] ?? 0; ?></div>
                    <div class="label">Concluídos</div>
                </div>
            </div>
        </div>
        
        <div class="filters">
            <h2>🔍 Filtros e Busca</h2>
            <form method="GET" action="">
                <div class="filter-row">
                    <div class="filter-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="all" <?php echo $statusFilter === 'all' || !$statusFilter ? 'selected' : ''; ?>>Todos</option>
                            <option value="pending" <?php echo $statusFilter === 'pending' ? 'selected' : ''; ?>>Pendente</option>
                            <option value="processing" <?php echo $statusFilter === 'processing' ? 'selected' : ''; ?>>Processando</option>
                            <option value="approved" <?php echo $statusFilter === 'approved' ? 'selected' : ''; ?>>Aprovado</option>
                            <option value="rejected" <?php echo $statusFilter === 'rejected' ? 'selected' : ''; ?>>Rejeitado</option>
                            <option value="completed" <?php echo $statusFilter === 'completed' ? 'selected' : ''; ?>>Concluído</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Buscar (Nome, Email, Protocolo, Telefone)</label>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>" placeholder="Digite para buscar...">
                    </div>
                    
                    <div class="filter-group">
                        <label>Data Inicial</label>
                        <input type="date" name="date_from" value="<?php echo htmlspecialchars($dateFrom); ?>">
                    </div>
                    
                    <div class="filter-group">
                        <label>Data Final</label>
                        <input type="date" name="date_to" value="<?php echo htmlspecialchars($dateTo); ?>">
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn-filter">Aplicar Filtros</button>
                    <a href="admin-refunds.php" class="btn-filter btn-clear" style="text-decoration: none; display: inline-block;">Limpar</a>
                </div>
            </form>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Protocolo</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Idioma</th>
                        <th>Data Compra</th>
                        <th>Motivo</th>
                        <th>Status</th>
                        <th>Data Solicitação</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($refunds)): ?>
                        <tr>
                            <td colspan="10" style="text-align: center; padding: 40px; color: #666;">
                                Nenhum reembolso encontrado
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($refunds as $refund): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($refund['protocol']); ?></strong></td>
                                <td><?php echo htmlspecialchars($refund['full_name']); ?></td>
                                <td><?php echo htmlspecialchars($refund['email']); ?></td>
                                <td><?php echo htmlspecialchars($refund['phone']); ?></td>
                                <td>
                                    <?php 
                                    $lang = $refund['language'] ?? 'en';
                                    $langLabels = ['en' => '🇬🇧 Inglês', 'es' => '🇪🇸 Espanhol'];
                                    echo $langLabels[$lang] ?? '🇬🇧 Inglês';
                                    ?>
                                </td>
                                <td><?php echo date('d/m/Y', strtotime($refund['purchase_date'])); ?></td>
                                <td><?php echo htmlspecialchars(substr($refund['reason_category_text'] ?? $refund['reason_category'], 0, 30)) . '...'; ?></td>
                                <td>
                                    <span class="status-badge status-<?php echo $refund['status']; ?>">
                                        <?php 
                                        $statusLabels = [
                                            'pending' => 'Pendente',
                                            'processing' => 'Processando',
                                            'approved' => 'Aprovado',
                                            'rejected' => 'Rejeitado',
                                            'completed' => 'Concluído'
                                        ];
                                        echo $statusLabels[$refund['status']] ?? $refund['status'];
                                        ?>
                                    </span>
                                </td>
                                <td><?php echo date('d/m/Y H:i', strtotime($refund['created_at'])); ?></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-action btn-view" onclick="viewRefund(<?php echo htmlspecialchars(json_encode($refund)); ?>)">
                                            Ver
                                        </button>
                                        <?php if ($refund['status'] === 'pending' || $refund['status'] === 'processing'): ?>
                                            <button class="btn-action btn-approve" onclick="updateStatus('<?php echo $refund['protocol']; ?>', 'approved')">
                                                Aprovar
                                            </button>
                                            <button class="btn-action btn-reject" onclick="updateStatus('<?php echo $refund['protocol']; ?>', 'rejected')">
                                                Rejeitar
                                            </button>
                                        <?php endif; ?>
                                        <?php if ($refund['status'] === 'approved'): ?>
                                            <button class="btn-action btn-complete" onclick="updateStatus('<?php echo $refund['protocol']; ?>', 'completed')">
                                                Marcar como Devolvido
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
            
            <?php if ($totalPages > 1): ?>
                <div class="pagination">
                    <button onclick="goToPage(<?php echo $currentPage - 1; ?>)" <?php echo $currentPage <= 1 ? 'disabled' : ''; ?>>
                        Anterior
                    </button>
                    
                    <?php
                    $startPage = max(1, $currentPage - 2);
                    $endPage = min($totalPages, $currentPage + 2);
                    
                    if ($startPage > 1): ?>
                        <button onclick="goToPage(1)">1</button>
                        <?php if ($startPage > 2): ?>
                            <span>...</span>
                        <?php endif; ?>
                    <?php endif; ?>
                    
                    <?php for ($i = $startPage; $i <= $endPage; $i++): ?>
                        <button 
                            onclick="goToPage(<?php echo $i; ?>)"
                            class="<?php echo $i === $currentPage ? 'current' : ''; ?>"
                        >
                            <?php echo $i; ?>
                        </button>
                    <?php endfor; ?>
                    
                    <?php if ($endPage < $totalPages): ?>
                        <?php if ($endPage < $totalPages - 1): ?>
                            <span>...</span>
                        <?php endif; ?>
                        <button onclick="goToPage(<?php echo $totalPages; ?>)"><?php echo $totalPages; ?></button>
                    <?php endif; ?>
                    
                    <button onclick="goToPage(<?php echo $currentPage + 1; ?>)" <?php echo $currentPage >= $totalPages ? 'disabled' : ''; ?>>
                        Próxima
                    </button>
                    
                    <span class="pagination-info">
                        Página <?php echo $currentPage; ?> de <?php echo $totalPages; ?>
                    </span>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Modal para visualizar detalhes -->
    <div id="viewModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Detalhes do Reembolso</h2>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- Conteúdo será preenchido via JavaScript -->
            </div>
            <div class="modal-footer">
                <button class="btn-filter btn-clear" onclick="closeModal()">Fechar</button>
            </div>
        </div>
    </div>
    
    <script>
        function goToPage(page) {
            const url = new URL(window.location.href);
            url.searchParams.set('page', page);
            window.location.href = url.toString();
        }
        
        function viewRefund(refund) {
            const modal = document.getElementById('viewModal');
            const modalBody = document.getElementById('modalBody');
            
            const statusLabels = {
                'pending': 'Pendente',
                'processing': 'Processando',
                'approved': 'Aprovado',
                'rejected': 'Rejeitado',
                'completed': 'Concluído'
            };
            
            modalBody.innerHTML = `
                <div class="detail-row">
                    <div class="detail-label">Protocolo:</div>
                    <div class="detail-value"><strong>${refund.protocol}</strong></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Nome Completo:</div>
                    <div class="detail-value">${refund.full_name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${refund.email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Telefone:</div>
                    <div class="detail-value">${refund.phone}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Idioma do Formulário:</div>
                    <div class="detail-value">
                        ${refund.language === 'en' ? '🇬🇧 Inglês' : refund.language === 'es' ? '🇪🇸 Espanhol' : '🇬🇧 Inglês'}
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Data da Compra:</div>
                    <div class="detail-value">${new Date(refund.purchase_date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Categoria do Motivo:</div>
                    <div class="detail-value">${refund.reason_category_text || refund.reason_category}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Motivo Detalhado:</div>
                    <div class="detail-value">${refund.reason}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">
                        <span class="status-badge status-${refund.status}">
                            ${statusLabels[refund.status] || refund.status}
                        </span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">ID ActiveCampaign:</div>
                    <div class="detail-value">${refund.activecampaign_contact_id || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Data de Criação:</div>
                    <div class="detail-value">${new Date(refund.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Última Atualização:</div>
                    <div class="detail-value">${new Date(refund.updated_at).toLocaleString('pt-BR')}</div>
                </div>
            `;
            
            modal.classList.add('active');
        }
        
        function closeModal() {
            document.getElementById('viewModal').classList.remove('active');
        }
        
        function updateStatus(protocol, newStatus) {
            if (!confirm(`Tem certeza que deseja alterar o status para "${newStatus}"?`)) {
                return;
            }
            
            fetch('update-refund-status.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    protocol: protocol,
                    status: newStatus
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Status atualizado com sucesso!');
                    location.reload();
                } else {
                    alert('Erro ao atualizar status: ' + (data.error || 'Erro desconhecido'));
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao atualizar status');
            });
        }
        
        // Fechar modal ao clicar fora
        document.getElementById('viewModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    </script>
</body>
</html>

