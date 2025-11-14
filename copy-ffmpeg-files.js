// FFmpegのWASMファイルをnode_modulesからpublicディレクトリにコピーするスクリプト
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, 'public');
const coreDir = join(__dirname, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const ffmpegDir = join(__dirname, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm');

// publicディレクトリを作成
if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
}

// コピーするファイルのリスト
const filesToCopy = [
    { src: join(coreDir, 'ffmpeg-core.js'), dest: join(publicDir, 'ffmpeg-core.js') },
    { src: join(coreDir, 'ffmpeg-core.wasm'), dest: join(publicDir, 'ffmpeg-core.wasm') },
    { src: join(ffmpegDir, 'worker.js'), dest: join(publicDir, 'ffmpeg-worker.js') }
];

console.log('FFmpegファイルをコピー中...');

filesToCopy.forEach(({ src, dest }) => {
    const fileName = dest.split(/[\\\/]/).pop();
    
    try {
        if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`✓ ${fileName} をコピーしました`);
        } else {
            console.warn(`⚠ ${fileName} が見つかりません: ${src}`);
        }
    } catch (error) {
        console.error(`✗ ${fileName} のコピーに失敗しました:`, error.message);
    }
});

console.log('FFmpegファイルのコピーが完了しました');
