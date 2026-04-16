const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = '371d6888c7c7926156a602ad9e2ff127799be33b081ae80845b599188975b7902a11591a';
// A URL base precisa ser a raiz, e o endpoint é /api/3/templates
const API_URL = 'https://draculatemer11258320.api-us1.com/api/3/templates';

const templatesDir = path.join(__dirname, 'email-templates', 'en');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const htmlContent = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    // Cria um nome legível baseado no nome do arquivo
    const nameLabel = file.replace('.html', '').replace(/_/g, ' ').toUpperCase();

    const data = JSON.stringify({
        template: {
            name: `Funnel ZapSpy - ${nameLabel}`,
            html: htmlContent
        }
    });

    const options = {
        method: 'POST',
        headers: {
            'Api-Token': API_KEY,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(API_URL, options, (res) => {
        let responseBody = '';
        res.on('data', chunk => {
            responseBody += chunk;
        });
        res.on('end', () => {
             if(res.statusCode === 201 || res.statusCode === 200) {
                 console.log(`✅ Template '${nameLabel}' salvo no ActiveCampaign com sucesso!`);
             } else {
                 console.log(`❌ Erro ao salvar '${nameLabel}'. Status: ${res.statusCode}`);
                 console.log(`Detalhes: ${responseBody}`);
             }
        });
    });

    req.on('error', (e) => {
        console.error(`Erro na requisição: ${e.message}`);
    });

    req.write(data);
    req.end();
});
