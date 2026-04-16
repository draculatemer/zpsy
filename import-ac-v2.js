const fs = require('fs');
const path = require('path');

const API_KEY = '371d6888c7c7926156a602ad9e2ff127799be33b081ae80845b599188975b7902a11591a';
const API_BASE_URL = 'https://draculatemer11258320.api-us1.com/api/3';

async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/lists`, {
            headers: { 'Api-Token': API_KEY }
        });
        const data = await response.json();
        if (response.ok) {
            console.log('✅ Conexão com ActiveCampaign estabelecida com sucesso!');
            console.log(`Listas encontradas: ${data.lists.length}`);
            return true;
        } else {
            console.log(`❌ Erro de conexão: ${response.status}`);
            console.log(data);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao tentar conectar:', error.message);
        return false;
    }
}

async function importTemplates() {
    const templatesDir = path.join(__dirname, 'email-templates', 'en');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
        const htmlContent = fs.readFileSync(path.join(templatesDir, file), 'utf8');
        const nameLabel = file.replace('.html', '').replace(/_/g, ' ').toUpperCase();
        
        // Assuntos baseados no nome do arquivo
        const subjects = {
            'email_1_reminder.html': 'Your Whats Spy Report is Ready',
            'email_2_urgency.html': '⚠️ URGENT: Your data will be deleted',
            'email_3_discount_30.html': '🎁 30% OFF: Final chance to unlock',
            'email_4_final_offer.html': 'Last warning: Report deletion scheduled'
        };

        const payload = {
            template: {
                name: `ZapSpy - ${nameLabel}`,
                subject: subjects[file] || 'ZapSpy Report Update',
                sender: 1, // Geralmente 1 é o administrador padrão
                content: htmlContent, // Algumas versões usam 'content', outras 'html'
                type: "custom" 
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}/templates`, {
                method: 'POST',
                headers: {
                    'Api-Token': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`✅ Template '${nameLabel}' importado!`);
            } else {
                console.log(`❌ Erro no template '${nameLabel}': ${response.status}`);
                console.log('Detalhes:', JSON.stringify(result, null, 2));
                
                // Tenta fallback com o campo 'html' em vez de 'content' se der erro
                if (response.status === 422 || response.status === 500) {
                     console.log(`Tentando fallback com campo 'html'...`);
                     payload.template.html = htmlContent;
                     delete payload.template.content;
                     const retryResponse = await fetch(`${API_BASE_URL}/templates`, {
                        method: 'POST',
                        headers: { 'Api-Token': API_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                     });
                     if (retryResponse.ok) {
                         console.log(`✅ Template '${nameLabel}' importado (via fallback)!`);
                     } else {
                         console.log(`❌ Falha definitiva no template '${nameLabel}'.`);
                     }
                }
            }
        } catch (error) {
            console.error(`Erro ao processar ${file}:`, error.message);
        }
    }
}

(async () => {
    const connected = await testConnection();
    if (connected) {
        await importTemplates();
    }
})();
