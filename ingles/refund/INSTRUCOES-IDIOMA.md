# 🌍 Sistema de Identificação de Idiomas

## ✅ Implementação Completa

O sistema agora identifica e salva o idioma do formulário usado (inglês ou espanhol).

## 📋 O que foi feito

### 1. **Banco de Dados**
- ✅ Campo `language` adicionado na tabela `refunds`
- ✅ Valores: `'en'` (inglês) ou `'es'` (espanhol)
- ✅ Default: `'en'` (inglês)
- ✅ Índice criado para melhor performance

### 2. **Backend (PHP)**
- ✅ `refund-activecampaign.php` recebe e valida o idioma
- ✅ `db-config.php` salva o idioma no banco
- ✅ Validação: apenas 'en' ou 'es' são aceitos

### 3. **Frontend (JavaScript)**
- ✅ `script.js` detecta automaticamente o idioma da página
- ✅ Envia o idioma junto com os dados do formulário

### 4. **Área Admin**
- ✅ Coluna "Idioma" na tabela
- ✅ Filtro por idioma
- ✅ Exibição com bandeiras (🇬🇧 Inglês / 🇪🇸 Espanhol)
- ✅ Modal de detalhes mostra o idioma

## 🔧 Como Funciona

### Detecção Automática

O JavaScript detecta o idioma através do atributo `lang` da tag `<html>`:

```html
<!-- Formulário em Inglês -->
<html lang="en-US">
<!-- ou -->
<html lang="en">

<!-- Formulário em Espanhol -->
<html lang="es-ES">
<!-- ou -->
<html lang="es">
```

### Se não houver atributo `lang`:
- **Default**: Inglês (`'en'`)

## 📝 Scripts SQL

### Para tabelas novas:
Use `database-tables-only.sql` (já inclui o campo `language`)

### Para tabelas existentes:
Execute `add-language-column.sql` para adicionar o campo:

```sql
ALTER TABLE refunds 
ADD COLUMN language VARCHAR(10) DEFAULT 'en' 
COMMENT 'Idioma do formulário: en (inglês) ou es (espanhol)' 
AFTER reason;
```

## 🎯 Como Usar

### 1. Certifique-se que o HTML tem o atributo `lang`:

**Formulário Inglês:**
```html
<html lang="en">
```

**Formulário Espanhol:**
```html
<html lang="es">
```

### 2. O JavaScript detecta automaticamente

Não precisa fazer nada! O script detecta e envia automaticamente.

### 3. Ver no Admin

Na área administrativa (`admin-refunds.php`):
- Veja a coluna "Idioma" na tabela
- Use o filtro "Idioma" para filtrar
- Veja o idioma no modal de detalhes

## 🔍 Verificar no Banco

```sql
-- Ver todos os reembolsos com idioma
SELECT protocol, full_name, language, created_at 
FROM refunds 
ORDER BY created_at DESC;

-- Contar por idioma
SELECT language, COUNT(*) as total 
FROM refunds 
GROUP BY language;

-- Filtrar apenas inglês
SELECT * FROM refunds WHERE language = 'en';

-- Filtrar apenas espanhol
SELECT * FROM refunds WHERE language = 'es';
```

## ⚠️ Importante

- Se o formulário não tiver `lang`, será salvo como `'en'` (inglês)
- Apenas `'en'` e `'es'` são aceitos
- Valores inválidos são convertidos para `'en'`

## 🐛 Troubleshooting

### Idioma não está sendo salvo?
1. Verifique se o HTML tem `<html lang="en">` ou `<html lang="es">`
2. Abra o console do navegador e veja se `language` está sendo enviado
3. Verifique os logs do PHP

### Ver no console do navegador:
```javascript
// O formData deve incluir:
{
  language: "en" // ou "es"
  // ... outros campos
}
```

