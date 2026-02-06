// ========================================
// DOM ELEMENTS
// ========================================
const refundForm = document.getElementById('refundForm');
const formContainer = document.getElementById('formContainer');
const successContainer = document.getElementById('successContainer');
const themeToggle = document.getElementById('themeToggle');
const progressBar = document.getElementById('progressBar');

// ========================================
// CONSTANTS AND SETTINGS
// ========================================
const STORAGE_KEY = 'refundFormData';
const RATE_LIMIT_KEY = 'refundSubmissions';
const MAX_SUBMISSIONS_PER_DAY = 10; // Increased from 3 to 10
const GUARANTEE_DAYS = 30;

// ========================================
// THEME TOGGLE (Modo Claro/Escuro)
// ========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('.theme-icon');
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// ========================================
// VARIÁVEL GLOBAL PARA PAÍS SELECIONADO
// ========================================
let selectedCountry = {
    code: '+1',
    flag: '🇺🇸',
    country: 'US',
    format: '(XXX) XXX-XXXX'
};

// ========================================
// AUTO-SAVE (Salvamento Automático)
// ========================================
function saveFormData() {
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        phoneCountry: selectedCountry.country,
        phoneCode: selectedCountry.code,
        phoneFlag: selectedCountry.flag,
        purchaseDate: document.getElementById('purchaseDate').value,
        reasonCategory: document.getElementById('reasonCategory').value,
        reason: document.getElementById('reason').value,
        timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
}

function loadFormData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            // Carregar dados apenas se forem recentes (menos de 24h)
            const dayInMs = 24 * 60 * 60 * 1000;
            if (Date.now() - data.timestamp < dayInMs) {
                document.getElementById('fullName').value = data.fullName || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('purchaseDate').value = data.purchaseDate || '';
                document.getElementById('reasonCategory').value = data.reasonCategory || '';
                document.getElementById('reason').value = data.reason || '';
                
                // Restaurar país selecionado
                if (data.phoneCountry && data.phoneCode && data.phoneFlag) {
                    selectedCountry = {
                        country: data.phoneCountry,
                        code: data.phoneCode,
                        flag: data.phoneFlag,
                        format: selectedCountry.format
                    };
                    countrySelected.querySelector('.flag').textContent = data.phoneFlag;
                    countrySelected.querySelector('.country-code').textContent = data.phoneCode;
                    updatePhonePlaceholder();
                }
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.error('Erro ao carregar dados salvos:', e);
        }
    }
}

// Auto-save a cada 2 segundos quando o usuário digita
let autoSaveTimeout;
document.querySelectorAll('#refundForm input, #refundForm textarea').forEach(field => {
    field.addEventListener('input', () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(saveFormData, 2000);
    });
});

// ========================================
// RATE LIMITING (Anti-Spam)
// ========================================
function checkRateLimit() {
    const submissions = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
    const today = new Date().toDateString();
    const todaySubmissions = submissions.filter(sub => sub === today);
    
    if (todaySubmissions.length >= MAX_SUBMISSIONS_PER_DAY) {
        console.log('💡 To clear the limit during tests, run in console: localStorage.removeItem("refundSubmissions")');
        return false;
    }
    return true;
}

function recordSubmission() {
    const submissions = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
    const today = new Date().toDateString();
    submissions.push(today);
    
    // Manter apenas últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const filtered = submissions.filter(sub => new Date(sub) > sevenDaysAgo);
    
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(filtered));
}

// ========================================
// GERAÇÃO DE PROTOCOLO
// ========================================
function generateProtocol() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RMB-${timestamp}-${random}`;
}

// ========================================
// PROGRESS BAR
// ========================================
function updateProgressBar(step) {
    const steps = progressBar.querySelectorAll('.progress-step');
    steps.forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });
}

// ========================================
// SELETOR DE PAÍS E FORMATAÇÃO DE TELEFONE
// ========================================
const phoneInput = document.getElementById('phone');
const countrySelector = document.getElementById('countrySelector');
const countrySelected = document.getElementById('countrySelected');
const countryDropdown = document.getElementById('countryDropdown');
const countrySearch = document.getElementById('countrySearch');
const countryOptions = document.querySelectorAll('.country-option');

// Toggle dropdown
countrySelected.addEventListener('click', (e) => {
    e.stopPropagation();
    countrySelector.classList.toggle('open');
    countryDropdown.classList.toggle('open');
    if (countryDropdown.classList.contains('open')) {
        countrySearch.focus();
    }
});

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    if (!countrySelector.contains(e.target)) {
        countrySelector.classList.remove('open');
        countryDropdown.classList.remove('open');
    }
});

// Buscar país
countrySearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    let hasVisibleCountries = false;
    
    countryOptions.forEach(option => {
        const countryName = option.querySelector('.country-name').textContent.toLowerCase();
        const countryCode = option.dataset.code.toLowerCase();
        if (countryName.includes(searchTerm) || countryCode.includes(searchTerm)) {
            option.classList.remove('hidden');
            hasVisibleCountries = true;
        } else {
            option.classList.add('hidden');
        }
    });
    
    // Mostrar/ocultar mensagem de "nenhum país encontrado"
    const noCountriesMsg = document.getElementById('noCountries');
    if (noCountriesMsg) {
        noCountriesMsg.style.display = hasVisibleCountries ? 'none' : 'block';
    }
});

// Selecionar país
countryOptions.forEach(option => {
    option.addEventListener('click', () => {
        selectedCountry = {
            code: option.dataset.code,
            flag: option.dataset.flag,
            country: option.dataset.country,
            format: option.dataset.format
        };
        
        // Atualizar botão selecionado
        countrySelected.querySelector('.flag').textContent = selectedCountry.flag;
        countrySelected.querySelector('.country-code').textContent = selectedCountry.code;
        
        // Fechar dropdown
        countrySelector.classList.remove('open');
        countryDropdown.classList.remove('open');
        
        // Limpar busca
        countrySearch.value = '';
        countryOptions.forEach(opt => opt.classList.remove('hidden'));
        const noCountriesMsg = document.getElementById('noCountries');
        if (noCountriesMsg) noCountriesMsg.style.display = 'none';
        
        // Limpar e focar no input de telefone
        phoneInput.value = '';
        phoneInput.focus();
        
        // Atualizar placeholder
        updatePhonePlaceholder();
    });
});

// Atualizar placeholder do telefone
function updatePhonePlaceholder() {
    const placeholders = {
        'BR': '(11) 99999-9999',
        'US': '(555) 123-4567',
        'PT': '91 234 5678',
        'GB': '7400 123456',
        'CA': '(555) 123-4567',
        'AR': '11 1234-5678',
        'MX': '55 1234 5678',
        'ES': '612 34 56 78',
        'FR': '6 12 34 56 78',
        'DE': '151 12345678',
        'IT': '312 345 6789',
        'AU': '412 345 678',
        'CL': '9 1234 5678',
        'CO': '300 1234567',
        'PE': '912 345 678',
        'VE': '412 1234567',
        'EC': '98 123 4567',
        'UY': '94 123 456',
        'PY': '981 123456',
        'BO': '7 123 4567',
        'JP': '90 1234 5678',
        'CN': '138 0000 0000',
        'IN': '98765 43210',
        'KR': '10 1234 5678',
        'RU': '912 345 6789',
        'ZA': '82 123 4567',
        'NL': '6 12345678',
        'BE': '470 12 34 56',
        'CH': '78 123 45 67',
        'AT': '664 123456',
        'SE': '70 123 45 67',
        'NO': '406 12 345',
        'DK': '20 12 34 56',
        'FI': '40 1234567',
        'PL': '512 345 678',
        'GR': '690 1234567',
        'IE': '85 123 4567',
        'NZ': '21 123 4567',
        'SG': '8123 4567',
        'MY': '12 345 6789',
        'TH': '81 234 5678',
        'PH': '917 123 4567',
        'ID': '812 3456 7890',
        'VN': '90 123 45 67',
        'AE': '50 123 4567',
        'SA': '50 123 4567',
        'IL': '50 123 4567',
        'TR': '532 123 4567',
        'EG': '100 123 4567',
        'NG': '802 123 4567',
        'KE': '712 345678'
    };
    phoneInput.placeholder = placeholders[selectedCountry.country] || '123 456 789';
}

// Formatação do telefone baseada no país
phoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Formatação específica por país
    if (selectedCountry.country === 'BR') {
        // Brasil: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (value.length <= 11) {
            if (value.length <= 2) {
                value = value.replace(/(\d{0,2})/, '($1');
            } else if (value.length <= 6) {
                value = value.replace(/(\d{2})(\d{0,4})/, '($1) $2');
            } else if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
            }
        }
    } else if (selectedCountry.country === 'US' || selectedCountry.country === 'CA') {
        // EUA/Canadá: (XXX) XXX-XXXX
        if (value.length <= 10) {
            if (value.length <= 3) {
                value = value.replace(/(\d{0,3})/, '($1');
            } else if (value.length <= 6) {
                value = value.replace(/(\d{3})(\d{0,3})/, '($1) $2');
            } else {
                value = value.replace(/(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3');
            }
        }
    } else if (selectedCountry.country === 'PT') {
        // Portugal: XX XXX XXXX
        if (value.length <= 9) {
            if (value.length <= 2) {
                value = value;
            } else if (value.length <= 5) {
                value = value.replace(/(\d{2})(\d{0,3})/, '$1 $2');
            } else {
                value = value.replace(/(\d{2})(\d{3})(\d{0,4})/, '$1 $2 $3');
            }
        }
    } else {
        // Formatação genérica para outros países
        if (value.length > 3 && value.length <= 7) {
            value = value.replace(/(\d{3})(\d{0,4})/, '$1 $2');
        } else if (value.length > 7) {
            value = value.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3');
        }
    }
    
    e.target.value = value;
});

// Inicializar placeholder
updatePhonePlaceholder();

// ========================================
// VALIDAÇÃO DO FORMULÁRIO
// ========================================
function validateForm() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const purchaseDate = document.getElementById('purchaseDate').value;
    const reasonCategory = document.getElementById('reasonCategory').value;
    const reason = document.getElementById('reason').value.trim();
    const privacyConsent = document.getElementById('privacyConsent').checked;
    const honeypot = document.getElementById('website').value;
    
    // Anti-spam: Honeypot field
    if (honeypot) {
        console.warn('Bot detectado - campo honeypot preenchido');
        return false;
    }
    
    // Rate limiting
    if (!checkRateLimit()) {
        alert('Você atingiu o limite de solicitações diárias. Por favor, tente novamente amanhã.');
        return false;
    }
    
    // Validar nome completo (pelo menos 2 palavras)
    if (fullName.split(' ').filter(word => word.length > 0).length < 2) {
        showError('fullName', 'Please enter your full name');
        return false;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('email', 'Please enter a valid email');
        return false;
    }
    
    // Validar telefone baseado no país
    const phoneDigits = phone.replace(/\D/g, '');
    const minDigits = selectedCountry.country === 'BR' ? 10 : 
                      selectedCountry.country === 'US' || selectedCountry.country === 'CA' ? 10 :
                      8; // mínimo genérico
    
    if (phoneDigits.length < minDigits) {
        showError('phone', `Please enter a valid phone number for ${selectedCountry.country}`);
        return false;
    }
    
    // Validar data
    if (!purchaseDate) {
        showError('purchaseDate', 'Please select the purchase date');
        return false;
    }
    
    // Validar data não é futura
    const selectedDate = new Date(purchaseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        showError('purchaseDate', 'Purchase date cannot be in the future');
        return false;
    }
    
    // Validar motivo predefinido
    if (!reasonCategory) {
        showError('reasonCategory', 'Please select a reason for the refund');
        return false;
    }
    
    // Validar garantia de 30 dias
    const daysDifference = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
    if (daysDifference > GUARANTEE_DAYS) {
        const confirmOutOfGuarantee = confirm(
            `The purchase date is outside the ${GUARANTEE_DAYS}-day guarantee period.\n\n` +
            `Your request will be analyzed, but approval is not guaranteed.\n\n` +
            `Do you want to continue anyway?`
        );
        if (!confirmOutOfGuarantee) {
            showError('purchaseDate', `Guarantee valid only for purchases within the last ${GUARANTEE_DAYS} days`);
            return false;
        }
    }
    
    // Validar motivo (mínimo 20 caracteres)
    if (reason.length < 20) {
        showError('reason', 'Please describe the reason in more detail (minimum 20 characters)');
        return false;
    }
    
    // Validar checkbox de privacidade
    if (!privacyConsent) {
        alert('Please accept the privacy terms to continue');
        return false;
    }
    
    return true;
}

// ========================================
// EXIBIR ERRO
// ========================================
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    
    // Remover erro anterior se existir
    const existingError = field.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Adicionar classe de erro
    field.style.borderColor = '#ef4444';
    
    // Criar e adicionar mensagem de erro
    const errorDiv = document.createElement('small');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#ef4444';
    errorDiv.style.display = 'block';
    errorDiv.style.marginTop = '6px';
    errorDiv.style.fontSize = '12px';
    errorDiv.textContent = message;
    
    // Inserir após o input ou após o input-with-icon
    const parent = field.parentElement;
    if (parent.classList.contains('input-with-icon')) {
        parent.parentElement.appendChild(errorDiv);
    } else {
        parent.appendChild(errorDiv);
    }
    
    // Focar no campo com erro
    field.focus();
    
    // Remover erro ao começar a digitar
    field.addEventListener('input', function() {
        field.style.borderColor = '';
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, { once: true });
}

// ========================================
// CONFETTI ANIMATION
// ========================================
function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b']
        });
        
        // Segunda explosão
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }, 200);
    }
}

// ========================================
// VALIDAÇÃO DE EMAIL EM TEMPO REAL
// ========================================
const emailInput = document.getElementById('email');
const emailValidationIcon = document.getElementById('emailValidationIcon');
const emailSuggestion = document.getElementById('emailSuggestion');

// Domínios comuns e suas variações
const commonDomains = {
    'gmail': ['gmail.com', 'googlemail.com'],
    'hotmail': ['hotmail.com', 'outlook.com', 'live.com'],
    'yahoo': ['yahoo.com', 'yahoo.com.br'],
    'outlook': ['outlook.com', 'hotmail.com'],
    'icloud': ['icloud.com', 'me.com'],
    'uol': ['uol.com.br'],
    'bol': ['bol.com.br'],
    'terra': ['terra.com.br']
};

let emailValidationTimeout;

emailInput.addEventListener('input', function() {
    clearTimeout(emailValidationTimeout);
    const email = this.value.trim();
    
    // Limpar validação anterior
    emailValidationIcon.className = 'email-validation-icon';
    emailSuggestion.style.display = 'none';
    
    if (email.length < 5 || !email.includes('@')) {
        return;
    }
    
    // Mostrar ícone de verificação
    emailValidationIcon.classList.add('checking');
    
    emailValidationTimeout = setTimeout(() => {
        validateEmail(email);
    }, 800);
});

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        emailValidationIcon.className = 'email-validation-icon invalid';
        return;
    }
    
    // Extrair domínio
    const [localPart, domain] = email.split('@');
    
    // Verificar erros comuns de digitação
    const suggestion = suggestEmailCorrection(localPart, domain);
    
    if (suggestion) {
        emailValidationIcon.className = 'email-validation-icon invalid';
        emailSuggestion.innerHTML = `Did you mean: <strong>${suggestion}</strong>? Click to correct.`;
        emailSuggestion.style.display = 'block';
        
        // Permitir clicar na sugestão
        emailSuggestion.onclick = function() {
            emailInput.value = suggestion;
            emailSuggestion.style.display = 'none';
            emailValidationIcon.className = 'email-validation-icon valid';
        };
    } else {
        emailValidationIcon.className = 'email-validation-icon valid';
    }
}

function suggestEmailCorrection(localPart, domain) {
    // Verificar domínios comuns com erro
    const domainLower = domain.toLowerCase();
    
    // Correções comuns
    const corrections = {
        'gmai.com': 'gmail.com',
        'gmial.com': 'gmail.com',
        'gmaul.com': 'gmail.com',
        'gmil.com': 'gmail.com',
        'gmailcom': 'gmail.com',
        'hotmial.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com',
        'homail.com': 'hotmail.com',
        'hotmailcom': 'hotmail.com',
        'yahooo.com': 'yahoo.com',
        'yaho.com': 'yahoo.com',
        'yhoo.com': 'yahoo.com',
        'outloo.com': 'outlook.com',
        'outlok.com': 'outlook.com',
        'iclod.com': 'icloud.com',
        'icoud.com': 'icloud.com'
    };
    
    if (corrections[domainLower]) {
        return `${localPart}@${corrections[domainLower]}`;
    }
    
    return null;
}

// ========================================
// COPIAR PROTOCOLO
// ========================================
const copyProtocolBtn = document.getElementById('copyProtocolBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

copyProtocolBtn.addEventListener('click', function() {
    const protocolNumber = document.getElementById('protocolNumber').textContent;
    
    navigator.clipboard.writeText(protocolNumber).then(() => {
        const actionText = this.querySelector('.action-text');
        const originalText = actionText.textContent;
        
        actionText.textContent = 'Copied!';
        this.classList.add('success');
        
        setTimeout(() => {
            actionText.textContent = originalText;
            this.classList.remove('success');
        }, 2000);
    }).catch(err => {
        console.error('Copy error:', err);
        alert('Failed to copy. Please copy manually: ' + protocolNumber);
    });
});

// ========================================
// BAIXAR PDF DO PROTOCOLO
// ========================================
downloadPdfBtn.addEventListener('click', function() {
    const protocolNumber = document.getElementById('protocolNumber').textContent;
    const name = document.getElementById('confirmName').textContent;
    const email = document.getElementById('confirmEmail').textContent;
    const phone = document.getElementById('confirmPhone').textContent;
    
    // Criar conteúdo HTML para o PDF
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Refund Receipt - ${protocolNumber}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 3px solid #0ea5e9;
                    padding-bottom: 20px;
                }
                .logo {
                    font-size: 32px;
                    font-weight: bold;
                    color: #0ea5e9;
                }
                h1 {
                    color: #0ea5e9;
                    margin: 20px 0;
                }
                .protocol-box {
                    background: #f0f9ff;
                    border: 2px solid #0ea5e9;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 30px 0;
                }
                .protocol-number {
                    font-size: 28px;
                    font-weight: bold;
                    color: #0284c7;
                    font-family: 'Courier New', monospace;
                }
                .info-section {
                    margin: 30px 0;
                }
                .info-item {
                    display: flex;
                    padding: 12px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .info-label {
                    font-weight: bold;
                    width: 150px;
                    color: #64748b;
                }
                .info-value {
                    color: #1e293b;
                }
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #64748b;
                    font-size: 12px;
                }
                .success-icon {
                    color: #10b981;
                    font-size: 48px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">X AI Monitor</div>
                <h1>Refund Request Receipt</h1>
                <div class="success-icon">✓</div>
            </div>
            
            <div class="protocol-box">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">PROTOCOL NUMBER</div>
                <div class="protocol-number">${protocolNumber}</div>
            </div>
            
            <div class="info-section">
                <h2>Request Information</h2>
                <div class="info-item">
                    <div class="info-label">Name:</div>
                    <div class="info-value">${name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phone:</div>
                    <div class="info-value">${phone}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date:</div>
                    <div class="info-value">${new Date().toLocaleString('pt-BR')}</div>
                </div>
            </div>
            
            <div class="info-section">
                <h2>Next Steps</h2>
                <ol style="line-height: 1.8;">
                    <li>You will receive a confirmation email within 24 hours</li>
                    <li>Refund processing within 7 business days</li>
                    <li>Amount will appear on your next card statement</li>
                </ol>
            </div>
            
            <div class="footer">
                <p>This is an automatic refund request receipt.</p>
                <p>Save this protocol number for tracking: <strong>${protocolNumber}</strong></p>
                <p>© 2024 X AI Monitor - All rights reserved</p>
            </div>
        </body>
        </html>
    `;
    
    // Abrir janela de impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Aguardar carregar e imprimir
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
});

// ========================================
// ENVIO DO FORMULÁRIO
// ========================================
refundForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Atualizar barra de progresso
    updateProgressBar(2);
    
    // Validação
    if (!validateForm()) {
        updateProgressBar(1);
        return;
    }
    
    // Coletar dados do formulário
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: selectedCountry.code + ' ' + document.getElementById('phone').value,
        phoneCountry: selectedCountry.country,
        purchaseDate: document.getElementById('purchaseDate').value,
        reasonCategory: document.getElementById('reasonCategory').value,
        reasonCategoryText: document.getElementById('reasonCategory').options[document.getElementById('reasonCategory').selectedIndex].text,
        reason: document.getElementById('reason').value,
        protocol: generateProtocol(),
        timestamp: new Date().toISOString()
    };
    
    // Simular envio (adicionar animação de loading ao botão)
    const submitBtn = refundForm.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<span class="btn-text">Processing</span>';
    
    // Simular delay de processamento
    setTimeout(() => {
        // Atualizar barra de progresso
        updateProgressBar(3);
        
        // Registrar submissão para rate limiting
        recordSubmission();
        
        // Limpar dados salvos
        localStorage.removeItem(STORAGE_KEY);
        
        // Preencher informações de confirmação
        document.getElementById('confirmName').textContent = formData.fullName;
        document.getElementById('confirmEmail').textContent = formData.email;
        document.getElementById('confirmPhone').textContent = formData.phone; // Já inclui código do país
        document.getElementById('protocolNumber').textContent = formData.protocol;
        
        // Esconder formulário
        formContainer.style.display = 'none';
        progressBar.style.display = 'none';
        successContainer.style.display = 'block';
        
        // Trigger confetti
        triggerConfetti();
        
        // Scroll suave para o topo
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Aqui você pode adicionar código para enviar os dados para um servidor
        console.log('Dados da solicitação:', formData);
        
        // Resetar botão (caso usuário volte)
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = '<span class="btn-text">Request Refund</span>';
        
    }, 1500);
});

// ========================================
// VALIDAÇÃO EM TEMPO REAL DO MOTIVO
// ========================================
const reasonField = document.getElementById('reason');
reasonField.addEventListener('input', function() {
    const charCount = this.value.length;
    const existingCounter = this.parentElement.querySelector('.char-counter');
    
    if (!existingCounter) {
        const counter = document.createElement('small');
        counter.className = 'char-counter';
        counter.style.display = 'block';
        counter.style.marginTop = '6px';
        counter.style.fontSize = '12px';
        counter.style.textAlign = 'right';
        this.parentElement.appendChild(counter);
    }
    
    const counter = this.parentElement.querySelector('.char-counter');
    counter.textContent = `${charCount} characters`;
    counter.style.color = charCount >= 20 ? '#10b981' : '#64748b';
});

// ========================================
// PREVENIR ENTER EM CAMPOS DE TEXTO
// ========================================
document.querySelectorAll('input:not([type="submit"])').forEach(input => {
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
});

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadFormData();
    updateProgressBar(1);
    
    // Ajuda para testes - mostrar no console
    console.log('%c🎯 X AI Monitor - Refund Page', 'font-size: 16px; font-weight: bold; color: #0ea5e9');
    console.log('%c💡 To clear test limit:', 'font-size: 12px; color: #64748b');
    console.log('localStorage.removeItem("refundSubmissions")');
});
