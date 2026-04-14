const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'perfectpay');
const MAX_SIZE_BYTES = 1024 * 1024; // 1MB

async function optimizeFolder(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            await optimizeFolder(fullPath);
        } else if (file.toLowerCase().endsWith('.png') && stats.size > MAX_SIZE_BYTES) {
            console.log(`📦 Optimizing: ${fullPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            
            const tmpPath = fullPath + '.tmp';
            try {
                await sharp(fullPath)
                    .png({ quality: 80, compressionLevel: 9 })
                    .toFile(tmpPath);
                
                const tmpStats = fs.statSync(tmpPath);
                if (tmpStats.size < stats.size) {
                    fs.unlinkSync(fullPath);
                    fs.renameSync(tmpPath, fullPath);
                    console.log(`✅ Reduced to: ${(tmpStats.size / 1024 / 1024).toFixed(2)} MB`);
                } else {
                    fs.unlinkSync(tmpPath);
                    console.log(`ℹ️ No reduction possible, keeping original.`);
                }
            } catch (err) {
                console.error(`❌ Error optimizing ${file}: ${err.message}`);
                if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
            }
        }
    }
}

console.log('🚀 Starting image optimization in perfectpay/...');
optimizeFolder(targetDir).then(() => {
    console.log('✨ Optimization complete!');
}).catch(err => {
    console.error('💥 Fatal error:', err);
});
