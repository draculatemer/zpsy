const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, 'perfectpay', 'ingles'),
    path.join(__dirname, 'perfectpay', 'espanhol')
];

const SEARCH = /zapspy-funnel-production/g;
const REPLACE = 'zapspy-backend-production';

function fixFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (SEARCH.test(content)) {
        const newContent = content.replace(SEARCH, REPLACE);
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Fixed: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            fixFile(fullPath);
        }
    }
}

console.log('🚀 Starting URL replacement...');
targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        walkDir(dir);
    } else {
        console.log(`⚠️ Directory not found: ${dir}`);
    }
});
console.log('✨ Done!');
