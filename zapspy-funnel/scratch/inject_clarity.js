const fs = require('fs');
const path = require('path');

const CLARITY_CODE = `    <script type="text/javascript">
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "wc9rwucf4n");
    </script>`;

const CLARITY_ID = 'wc9rwucf4n';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

const targetDir = path.resolve('c:/Users/madso/zapspy-funnel/zapspy-funnel/perfectpay');

let count = 0;
let skipped = 0;

walk(targetDir, (filePath) => {
    if (path.extname(filePath) === '.html') {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Skip if already has Clarity
        if (content.includes(CLARITY_ID)) {
            skipped++;
            return;
        }

        // Try to insert after <head> or at the top if no <head>
        let newContent = content;
        if (content.includes('<head>')) {
            newContent = content.replace('<head>', `<head>\n${CLARITY_CODE}`);
        } else if (content.includes('<HEAD>')) {
            newContent = content.replace('<HEAD>', `<HEAD>\n${CLARITY_CODE}`);
        } else {
            // Fallback: insert at the very top
            newContent = CLARITY_CODE + '\n' + content;
        }

        fs.writeFileSync(filePath, newContent, 'utf8');
        count++;
        console.log(`Updated: ${filePath}`);
    }
});

console.log(`\nDone! Total updated: ${count}, Skipped: ${skipped}`);
