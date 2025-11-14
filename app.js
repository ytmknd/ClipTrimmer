// ClipTrimmer - メインアプリケーションファイル
import { Timeline } from './timeline.js';

class ClipTrimmer {
    constructor() {
        this.ffmpeg = null;
        this.ffmpegLoaded = false;
        this.videoFile = null;
        this.videoDuration = 0;
        this.timeline = null;
        
        this.initElements();
        this.initEventListeners();
        this.loadFFmpeg();
    }

    initElements() {
        // 入力要素
        this.videoInput = document.getElementById('videoInput');
        this.fileName = document.getElementById('fileName');
        
        // ビデオプレーヤー
        this.videoPlayer = document.getElementById('videoPlayer');
        this.deletedOverlay = document.getElementById('deletedOverlay');
        this.videoWrapper = document.querySelector('.video-wrapper');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.durationDisplay = document.getElementById('duration');
        
        // ボタン
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.cutBtn = document.getElementById('cutBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.exportBtn = document.getElementById('exportBtn');
        
        // ステータス
        this.statusDiv = document.getElementById('status');
    }

    initEventListeners() {
        // ファイル読み込み
        this.videoInput.addEventListener('change', (e) => this.handleVideoUpload(e));
        
        // ビデオプレーヤー
        this.videoPlayer.addEventListener('loadedmetadata', () => this.handleVideoLoaded());
        this.videoPlayer.addEventListener('timeupdate', () => this.handleTimeUpdate());
        
        // ボタン
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.cutBtn.addEventListener('click', () => this.cutAtPlayhead());
        this.deleteBtn.addEventListener('click', () => this.deleteSelectedClip());
        this.exportBtn.addEventListener('click', () => this.exportVideo());
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    async loadFFmpeg() {
        try {
            this.showStatus('FFmpegを読み込み中...', 'info');
            
            // node_modulesからFFmpeg.wasmをインポート
            const { FFmpeg } = await import('./node_modules/@ffmpeg/ffmpeg/dist/esm/index.js');
            const { toBlobURL, fetchFile } = await import('./node_modules/@ffmpeg/util/dist/esm/index.js');
            
            this.ffmpeg = new FFmpeg();
            
            // ログ出力
            this.ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg:', message);
            });
            
            // 進捗表示
            this.ffmpeg.on('progress', ({ progress, time }) => {
                const percent = (progress * 100).toFixed(0);
                this.showStatus(`処理中... ${percent}%`, 'info');
            });
            
            // publicディレクトリからWASMファイルを読み込み
            const baseURL = './public';
            
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            this.ffmpegLoaded = true;
            this.showStatus('FFmpegの読み込みが完了しました', 'success');
            setTimeout(() => this.hideStatus(), 3000);
            
        } catch (error) {
            console.error('FFmpeg読み込みエラー:', error);
            this.showStatus('FFmpegの読み込みに失敗しました: ' + error.message, 'error');
        }
    }

    handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.videoFile = file;
        this.fileName.textContent = file.name;
        
        const url = URL.createObjectURL(file);
        this.videoPlayer.src = url;
        
        this.showStatus('動画を読み込み中...', 'info');
    }

    handleVideoLoaded() {
        this.videoDuration = this.videoPlayer.duration;
        this.durationDisplay.textContent = this.formatTime(this.videoDuration);
        
        // タイムラインの初期化
        this.timeline = new Timeline(this.videoDuration, this.videoPlayer);
        
        // ボタンを有効化
        this.playPauseBtn.disabled = false;
        this.cutBtn.disabled = false;
        this.exportBtn.disabled = false;
        
        this.showStatus('動画の読み込みが完了しました', 'success');
        setTimeout(() => this.hideStatus(), 3000);
    }

    handleTimeUpdate() {
        const currentTime = this.videoPlayer.currentTime;
        this.currentTimeDisplay.textContent = this.formatTime(currentTime);
        
        if (this.timeline) {
            this.timeline.updatePlayhead(currentTime);
            
            // クリップが存在しない部分かチェック
            const hasClip = this.timeline.isTimeInClip(currentTime);
            if (!hasClip) {
                this.deletedOverlay.classList.add('active');
                this.videoPlayer.style.opacity = '1';
            } else {
                this.deletedOverlay.classList.remove('active');
                
                // クロスフェード中の不透明度を計算
                const opacity = this.timeline.getOpacityAtTime(currentTime);
                this.videoPlayer.style.opacity = opacity.toString();
            }
        }
    }

    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
            this.playPauseBtn.innerHTML = '<span>⏸️ 一時停止</span>';
        } else {
            this.videoPlayer.pause();
            this.playPauseBtn.innerHTML = '<span>▶️ 再生</span>';
        }
    }

    cutAtPlayhead() {
        if (!this.timeline) return;
        
        const currentTime = this.videoPlayer.currentTime;
        this.timeline.cutAtTime(currentTime);
        
        this.showStatus(`${this.formatTime(currentTime)} でクリップをカットしました`, 'success');
        setTimeout(() => this.hideStatus(), 2000);
    }

    deleteSelectedClip() {
        if (!this.timeline) return;
        
        const deleted = this.timeline.deleteSelectedClip();
        if (deleted) {
            this.deleteBtn.disabled = true;
            this.showStatus('選択したクリップを削除しました', 'success');
            setTimeout(() => this.hideStatus(), 2000);
        }
    }

    async exportVideo() {
        if (!this.timeline || !this.ffmpegLoaded) {
            this.showStatus('準備ができていません', 'error');
            return;
        }
        
        try {
            this.showStatus('動画をエクスポート中...', 'info');
            this.exportBtn.disabled = true;
            
            const segments = this.timeline.getActiveSegments();
            
            if (segments.length === 0) {
                this.showStatus('エクスポートするクリップがありません', 'error');
                this.exportBtn.disabled = false;
                return;
            }
            
            // FFmpegで動画を処理
            await this.processVideoWithFFmpeg(segments);
            
            this.exportBtn.disabled = false;
            
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showStatus('エクスポートに失敗しました: ' + error.message, 'error');
            this.exportBtn.disabled = false;
        }
    }

    async processVideoWithFFmpeg(segments) {
        try {
            // ビデオファイルをFFmpegに書き込み
            const videoData = new Uint8Array(await this.videoFile.arrayBuffer());
            await this.ffmpeg.writeFile('input.mp4', videoData);
            
            // フィルター文字列を作成
            const filters = this.createFilterString(segments);
            
            // FFmpegコマンドを実行
            await this.ffmpeg.exec([
                '-i', 'input.mp4',
                '-filter_complex', filters,
                '-map', '[outv]',
                '-map', '[outa]',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'aac',
                'output.mp4'
            ]);
            
            // 出力ファイルを読み込み
            const data = await this.ffmpeg.readFile('output.mp4');
            
            // ダウンロード
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'trimmed_' + this.videoFile.name;
            a.click();
            
            // クリーンアップ
            await this.ffmpeg.deleteFile('input.mp4');
            await this.ffmpeg.deleteFile('output.mp4');
            
            this.showStatus('エクスポートが完了しました', 'success');
            
        } catch (error) {
            throw error;
        }
    }

    createFilterString(segments) {
        // クロスフェードがあるかチェック
        const hasCrossfade = segments.some(seg => seg.fadeIn > 0 || seg.fadeOut > 0);
        
        if (!hasCrossfade || segments.length === 1) {
            // クロスフェードなし：シンプルな連結
            return this.createSimpleFilterString(segments);
        } else {
            // クロスフェードあり：xfadeフィルターを使用
            return this.createCrossfadeFilterString(segments);
        }
    }

    createSimpleFilterString(segments) {
        // セグメントから動画と音声のフィルターを作成
        let filterParts = [];
        
        segments.forEach((segment, index) => {
            const start = segment.start.toFixed(3);
            const duration = (segment.end - segment.start).toFixed(3);
            
            filterParts.push(
                `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${index}];` +
                `[0:a]atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS[a${index}]`
            );
        });
        
        // すべてのセグメントを連結
        const vInputs = segments.map((_, i) => `[v${i}]`).join('');
        const aInputs = segments.map((_, i) => `[a${i}]`).join('');
        
        filterParts.push(
            `${vInputs}concat=n=${segments.length}:v=1:a=0[outv];` +
            `${aInputs}concat=n=${segments.length}:v=0:a=1[outa]`
        );
        
        return filterParts.join('');
    }

    createCrossfadeFilterString(segments) {
        let filterParts = [];
        
        // 各セグメントをトリミング
        segments.forEach((segment, index) => {
            const start = segment.start.toFixed(3);
            const duration = (segment.end - segment.start).toFixed(3);
            
            filterParts.push(
                `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${index}];` +
                `[0:a]atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS[a${index}]`
            );
        });
        
        // クロスフェードを適用
        let currentVideoLabel = '[v0]';
        let currentAudioLabel = '[a0]';
        
        for (let i = 1; i < segments.length; i++) {
            const prevSegment = segments[i - 1];
            const currentSegment = segments[i];
            
            // クロスフェードの長さ（前のクリップのfadeOutと現在のクリップのfadeInの最小値）
            const crossfadeDuration = Math.min(
                prevSegment.fadeOut || 0,
                currentSegment.fadeIn || 0
            );
            
            if (crossfadeDuration > 0) {
                // 映像のクロスフェード
                const prevDuration = prevSegment.end - prevSegment.start;
                const offset = (prevDuration - crossfadeDuration).toFixed(3);
                const duration = crossfadeDuration.toFixed(3);
                
                filterParts.push(
                    `${currentVideoLabel}[v${i}]xfade=transition=fade:duration=${duration}:offset=${offset}[vx${i}]`
                );
                
                // 音声のクロスフェード
                filterParts.push(
                    `${currentAudioLabel}[a${i}]acrossfade=d=${duration}[ax${i}]`
                );
                
                currentVideoLabel = `[vx${i}]`;
                currentAudioLabel = `[ax${i}]`;
            } else {
                // クロスフェードなしで連結
                filterParts.push(
                    `${currentVideoLabel}[v${i}]concat=n=2:v=1:a=0[vx${i}];` +
                    `${currentAudioLabel}[a${i}]concat=n=2:v=0:a=1[ax${i}]`
                );
                
                currentVideoLabel = `[vx${i}]`;
                currentAudioLabel = `[ax${i}]`;
            }
        }
        
        // 最終出力ラベルを設定
        filterParts.push(
            `${currentVideoLabel}copy[outv];` +
            `${currentAudioLabel}copy[outa]`
        );
        
        return filterParts.join(';');
    }

    handleKeyPress(event) {
        // 入力フィールドにフォーカスがある場合はスキップ
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Delete key
        if (event.key === 'Delete') {
            event.preventDefault();
            this.deleteSelectedClip();
        }
        // C key
        else if (event.key === 'c' || event.key === 'C') {
            if (!event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                this.cutAtPlayhead();
            }
        }
        // Space key
        else if (event.key === ' ') {
            event.preventDefault();
            this.togglePlayPause();
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
    }

    hideStatus() {
        this.statusDiv.className = 'status';
        this.statusDiv.textContent = '';
    }
}

// アプリケーションの起動
document.addEventListener('DOMContentLoaded', () => {
    new ClipTrimmer();
});
