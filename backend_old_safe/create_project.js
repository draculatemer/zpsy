const { spawn } = require('child_process');

const child = spawn('railway', ['init', '--name', 'zapspy-funnel'], {
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true
});

// Envia Enter após 2 segundos
setTimeout(() => {
    console.log('Enviando Enter para selecionar o workspace...');
    child.stdin.write('\n');
    child.stdin.end();
}, 5000);

child.on('close', (code) => {
    process.exit(code);
});
