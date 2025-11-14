// FFmpegのWASMファイルとモジュールをnode_modulesからpublicディレクトリにコピーするスクリプト
import { copyFileSync, mkdirSync, existsSync } from 'fs';
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

// コピーするファイルのリスト
const filesToCopy = [
    // Core WASM files
    { src: join(coreDir, 'ffmpeg-core.js'), dest: join(publicDir, 'ffmpeg-core.js') },
    { src: join(coreDir, 'ffmpeg-core.wasm'), dest: join(publicDir, 'ffmpeg-core.wasm') },
    
    // FFmpeg module files
    { src: join(ffmpegDir, 'index.js'), dest: join(publicDir, 'ffmpeg.js') },
    { src: join(ffmpegDir, 'classes.js'), dest: join(publicDir, 'ffmpeg-classes.js') },
    { src: join(ffmpegDir, 'const.js'), dest: join(publicDir, 'ffmpeg-const.js') },
    { src: join(ffmpegDir, 'errors.js'), dest: join(publicDir, 'ffmpeg-errors.js') },
    { src: join(ffmpegDir, 'types.js'), dest: join(publicDir, 'ffmpeg-types.js') },
    { src: join(ffmpegDir, 'utils.js'), dest: join(publicDir, 'ffmpeg-utils.js') },
    { src: join(ffmpegDir, 'worker.js'), dest: join(publicDir, 'ffmpeg-worker.js') },
    
    // Util module files
    { src: join(utilDir, 'index.js'), dest: join(publicDir, 'util.js') },
    { src: join(utilDir, 'const.js'), dest: join(publicDir, 'util-const.js') },
    { src: join(utilDir, 'errors.js'), dest: join(publicDir, 'util-errors.js') },
    { src: join(utilDir, 'types.js'), dest: join(publicDir, 'util-types.js') }
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
