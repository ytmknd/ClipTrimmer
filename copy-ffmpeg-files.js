// FFmpegのWASMファイルとモジュールをnode_modulesからpublicディレクトリにコピーするスクリプト
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, 'public');
const coreDir = join(__dirname, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const ffmpegDir = join(__dirname, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm');
const utilDir = join(__dirname, 'node_modules', '@ffmpeg', 'util', 'dist', 'esm');

// publicディレクトリを作成
if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
}

// ファイルをコピーしてインポートパスを修正する関数
function copyAndFixImports(src, dest, prefix) {
    try {
        if (!existsSync(src)) {
            console.warn(`⚠ ${dest.split(/[\\\/]/).pop()} が見つかりません: ${src}`);
            return;
        }
        
        let content = readFileSync(src, 'utf8');
        
        // インポートパスを修正（プレフィックスを追加）
        content = content.replace(/from\s+['"]\.\//g, `from "./${prefix}`);
        
        // worker.jsへの参照をffmpeg-worker.jsに修正
        content = content.replace(/new URL\(["']\.\/worker\.js["']/g, `new URL("./ffmpeg-worker.js"`);
        
        writeFileSync(dest, content, 'utf8');
        console.log(`✓ ${dest.split(/[\\\/]/).pop()} をコピーしました`);
    } catch (error) {
        console.error(`✗ ${dest.split(/[\\\/]/).pop()} のコピーに失敗しました:`, error.message);
    }
}

console.log('FFmpegファイルをコピー中...');

// Core WASM files (バイナリファイルはそのままコピー)
copyFileSync(join(coreDir, 'ffmpeg-core.js'), join(publicDir, 'ffmpeg-core.js'));
console.log('✓ ffmpeg-core.js をコピーしました');
copyFileSync(join(coreDir, 'ffmpeg-core.wasm'), join(publicDir, 'ffmpeg-core.wasm'));
console.log('✓ ffmpeg-core.wasm をコピーしました');

// FFmpeg module files (インポートパスを修正してコピー)
const ffmpegFiles = [
    { name: 'index.js', dest: 'ffmpeg.js' },
    { name: 'classes.js', dest: 'ffmpeg-classes.js' },
    { name: 'const.js', dest: 'ffmpeg-const.js' },
    { name: 'errors.js', dest: 'ffmpeg-errors.js' },
    { name: 'types.js', dest: 'ffmpeg-types.js' },
    { name: 'utils.js', dest: 'ffmpeg-utils.js' },
    { name: 'worker.js', dest: 'ffmpeg-worker.js' }
];

ffmpegFiles.forEach(({ name, dest }) => {
    copyAndFixImports(join(ffmpegDir, name), join(publicDir, dest), 'ffmpeg-');
});

// Util module files (インポートパスを修正してコピー)
const utilFiles = [
    { name: 'index.js', dest: 'util.js' },
    { name: 'const.js', dest: 'util-const.js' },
    { name: 'errors.js', dest: 'util-errors.js' },
    { name: 'types.js', dest: 'util-types.js' }
];

utilFiles.forEach(({ name, dest }) => {
    copyAndFixImports(join(utilDir, name), join(publicDir, dest), 'util-');
});

console.log('FFmpegファイルのコピーが完了しました');
