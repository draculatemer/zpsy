<?php
// ==========================================
// SCRIPT DE TESTE DE CONEXÃO COM BANCO
// ==========================================
// Use este arquivo para testar se a conexão está funcionando

require_once __DIR__ . '/db-config.php';

echo "<h1>🔍 Teste de Conexão com Banco de Dados</h1>";
echo "<hr>";

// Verificar se constantes estão definidas
echo "<h2>1. Verificando Configurações</h2>";
echo "<ul>";
echo "<li>DB_HOST: " . (defined('DB_HOST') ? DB_HOST : '<span style="color:red;">NÃO DEFINIDO</span>') . "</li>";
echo "<li>DB_NAME: " . (defined('DB_NAME') ? DB_NAME : '<span style="color:red;">NÃO DEFINIDO</span>') . "</li>";
echo "<li>DB_USER: " . (defined('DB_USER') ? DB_USER : '<span style="color:red;">NÃO DEFINIDO</span>') . "</li>";
echo "<li>DB_PASS: " . (defined('DB_PASS') ? (strlen(DB_PASS) > 0 ? '***' . substr(DB_PASS, -2) : '<span style="color:red;">VAZIO</span>') : '<span style="color:red;">NÃO DEFINIDO</span>') . "</li>";
echo "</ul>";

// Tentar conectar
echo "<h2>2. Testando Conexão</h2>";
$conn = getDbConnection();

if ($conn) {
    echo "<p style='color:green; font-weight:bold;'>✅ Conexão estabelecida com sucesso!</p>";
    
    // Verificar se as tabelas existem
    echo "<h2>3. Verificando Tabelas</h2>";
    
    try {
        $tables = ['refunds', 'refund_logs'];
        foreach ($tables as $table) {
            $stmt = $conn->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() > 0) {
                echo "<p style='color:green;'>✅ Tabela '$table' existe</p>";
                
                // Contar registros
                $countStmt = $conn->query("SELECT COUNT(*) as total FROM $table");
                $count = $countStmt->fetch()['total'];
                echo "<p style='margin-left:20px; color:#666;'>Registros: $count</p>";
            } else {
                echo "<p style='color:red;'>❌ Tabela '$table' NÃO existe</p>";
                echo "<p style='margin-left:20px; color:#666;'>Execute o script SQL para criar as tabelas</p>";
            }
        }
    } catch (PDOException $e) {
        echo "<p style='color:red;'>❌ Erro ao verificar tabelas: " . $e->getMessage() . "</p>";
    }
    
} else {
    echo "<p style='color:red; font-weight:bold;'>❌ Falha na conexão!</p>";
    echo "<p>Verifique:</p>";
    echo "<ul>";
    echo "<li>As credenciais no arquivo <code>db-config.php</code></li>";
    echo "<li>Se o banco de dados existe</li>";
    echo "<li>Se o usuário MySQL tem permissões</li>";
    echo "<li>Os logs de erro do PHP</li>";
    echo "</ul>";
}

echo "<hr>";
echo "<p><a href='admin-refunds.php'>← Voltar para Admin</a></p>";
?>

