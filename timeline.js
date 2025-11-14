// Timeline - タイムライン管理クラス
export class Timeline {
    constructor(duration, videoPlayer) {
        this.duration = duration;
        this.videoPlayer = videoPlayer;
        this.clips = [];
        this.selectedClipId = null;
        this.clipIdCounter = 0;
        
        // アンドゥ/リドゥ用の履歴
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        this.initElements();
        this.initEventListeners();
        this.createInitialClip();
        this.saveState(); // 初期状態を保存
        this.render();
    }

    initElements() {
        this.container = document.querySelector('.timeline-container');
        this.timelineSection = document.querySelector('.timeline-section');
        this.clipsContainer = document.getElementById('clips');
        this.playhead = document.getElementById('playhead');
        this.canvas = document.getElementById('timelineCanvas');
        this.ruler = document.getElementById('timelineRuler');
        this.clipCountDisplay = document.getElementById('clipCount');
        this.deleteBtn = document.getElementById('deleteBtn');
        
        // ドラッグ状態
        this.isDraggingPlayhead = false;
        this.isDraggingClip = false;
        this.isResizingClip = false;
        this.draggedClipId = null;
        this.resizeClipId = null;
        this.resizeEdge = null; // 'left' or 'right'
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.hasMoved = false;
        this.clipOriginalStart = 0;
        this.clipOriginalEnd = 0;
        
        // バインドされたメソッド
        this.boundDragPlayhead = this.dragPlayhead.bind(this);
        this.boundStopDraggingPlayhead = this.stopDraggingPlayhead.bind(this);
        this.boundDragClip = this.dragClip.bind(this);
        this.boundStopDraggingClip = this.stopDraggingClip.bind(this);
        this.boundResizeClip = this.resizeClip.bind(this);
        this.boundStopResizingClip = this.stopResizingClip.bind(this);
        
        // Canvasのサイズを設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    initEventListeners() {
        // タイムラインクリックで再生位置を変更
        this.container.addEventListener('click', (e) => this.handleTimelineClick(e));
        
        // タイムラインセクション全体でのクリック（灰色部分を含む）
        this.timelineSection.addEventListener('click', (e) => this.handleTimelineSectionClick(e));
        
        // 再生ヘッドのドラッグ
        this.playhead.addEventListener('mousedown', (e) => this.startDraggingPlayhead(e));
        document.addEventListener('mousemove', this.boundDragPlayhead);
        document.addEventListener('mouseup', this.boundStopDraggingPlayhead);
        
        // クリップのドラッグ
        document.addEventListener('mousemove', this.boundDragClip);
        document.addEventListener('mouseup', this.boundStopDraggingClip);
        
        // クリップのリサイズ
        document.addEventListener('mousemove', this.boundResizeClip);
        document.addEventListener('mouseup', this.boundStopResizingClip);
    }

    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.drawWaveform();
        this.updateRuler();
    }

    createInitialClip() {
        this.clips.push({
            id: this.clipIdCounter++,
            start: 0,
            end: this.duration,
            fadeIn: 0,
            fadeOut: 0
        });
        this.updateClipCount();
    }

    cutAtTime(time) {
        // カット位置が含まれるクリップを見つける
        const clipIndex = this.clips.findIndex(clip => 
            time > clip.start && time < clip.end
        );
        
        if (clipIndex === -1) {
            console.log('カット位置にクリップがありません');
            return;
        }
        
        const clip = this.clips[clipIndex];
        
        // 既存のクリップを分割
        const newClip1 = {
            id: this.clipIdCounter++,
            start: clip.start,
            end: time,
            fadeIn: clip.fadeIn,
            fadeOut: 0
        };
        
        const newClip2 = {
            id: this.clipIdCounter++,
            start: time,
            end: clip.end,
            fadeIn: 0,
            fadeOut: clip.fadeOut
        };
        
        // 古いクリップを削除して新しいクリップを追加
        this.clips.splice(clipIndex, 1, newClip1, newClip2);
        
        // クリップを時間順にソート
        this.clips.sort((a, b) => a.start - b.start);
        
        this.saveState();
        this.updateClipCount();
        this.render();
    }

    deleteSelectedClip() {
        if (this.selectedClipId === null) {
            return false;
        }
        
        const clipIndex = this.clips.findIndex(c => c.id === this.selectedClipId);
        if (clipIndex === -1) {
            return false;
        }
        
        const deletedClip = this.clips[clipIndex];
        const deletedDuration = deletedClip.end - deletedClip.start;
        
        // 削除するクリップを配列から完全に削除
        this.clips.splice(clipIndex, 1);
        
        // 削除されたクリップより後のクリップを前に詰める
        for (let i = clipIndex; i < this.clips.length; i++) {
            this.clips[i].start -= deletedDuration;
            this.clips[i].end -= deletedDuration;
        }
        
        // 再生位置が削除された範囲より後にある場合、調整
        if (this.videoPlayer.currentTime > deletedClip.start) {
            const newTime = Math.max(deletedClip.start, this.videoPlayer.currentTime - deletedDuration);
            this.videoPlayer.currentTime = newTime;
        }
        
        // 選択を解除
        this.selectedClipId = null;
        this.deleteBtn.disabled = true;
        
        // 状態を保存
        this.updateClipCount();
        this.saveState();
        this.render();
        return true;
    }

    selectClip(clipId) {
        this.selectedClipId = clipId;
        this.deleteBtn.disabled = false;
        this.render();
    }

    deselectClip() {
        this.selectedClipId = null;
        this.deleteBtn.disabled = true;
        this.render();
    }

    getActiveSegments() {
        // 削除されていないクリップを時間順にソートして返す
        return this.clips
            .sort((a, b) => a.start - b.start)
            .map(clip => ({
                start: clip.start,
                end: clip.end,
                fadeIn: clip.fadeIn || 0,
                fadeOut: clip.fadeOut || 0
            }));
    }

    handleTimelineClick(event) {
        // 再生ヘッドのドラッグ中はクリックイベントを無視
        if (this.isDraggingPlayhead) {
            return;
        }
        
        // 再生ヘッドがクリックされた場合はスキップ
        if (event.target === this.playhead || event.target.closest('#playhead')) {
            return;
        }
        
        const rect = this.container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const clickedTime = (x / rect.width) * this.duration;
        
        // クリップがクリックされたかチェック
        const clickedClip = this.clips.find(clip => {
            const clipStart = (clip.start / this.duration) * rect.width;
            const clipEnd = (clip.end / this.duration) * rect.width;
            return x >= clipStart && x <= clipEnd;
        });
        
        if (clickedClip) {
            // クリップを選択
            if (this.selectedClipId === clickedClip.id) {
                this.deselectClip();
            } else {
                this.selectClip(clickedClip.id);
            }
        } else {
            // 再生位置を変更
            this.videoPlayer.currentTime = clickedTime;
            this.deselectClip();
        }
    }

    handleTimelineSectionClick(event) {
        // 再生ヘッドのドラッグ中はクリックイベントを無視
        if (this.isDraggingPlayhead || this.isDraggingClip || this.isResizingClip) {
            return;
        }
        
        // 再生ヘッドがクリックされた場合はスキップ
        if (event.target === this.playhead || event.target.closest('#playhead')) {
            return;
        }
        
        // ボタンやヘッダーテキストのクリックは無視
        if (event.target.closest('button') || event.target.tagName === 'H3' || event.target.tagName === 'SPAN') {
            return;
        }
        
        // クリップ要素のクリックは無視（timeline-containerで処理される）
        if (event.target.closest('.clip')) {
            return;
        }
        
        // タイムラインコンテナの位置を取得
        const containerRect = this.container.getBoundingClientRect();
        const x = event.clientX - containerRect.left;
        
        // タイムラインコンテナの範囲内の場合のみ処理
        if (x >= 0 && x <= containerRect.width) {
            const clickedTime = (x / containerRect.width) * this.duration;
            this.videoPlayer.currentTime = clickedTime;
            this.deselectClip();
        }
    }

    startDraggingPlayhead(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingPlayhead = true;
        this.playhead.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        // 初期位置も更新
        this.dragPlayhead(event);
    }

    dragPlayhead(event) {
        if (!this.isDraggingPlayhead) {
            return;
        }
        
        event.preventDefault();
        
        const rect = this.container.getBoundingClientRect();
        let x = event.clientX - rect.left;
        
        // タイムラインの範囲内に制限
        x = Math.max(0, Math.min(x, rect.width));
        
        const time = (x / rect.width) * this.duration;
        
        // 再生位置を更新
        this.videoPlayer.currentTime = time;
        
        // 再生ヘッドの位置も即座に更新
        const percent = (time / this.duration) * 100;
        this.playhead.style.left = `${percent}%`;
    }

    stopDraggingPlayhead() {
        if (this.isDraggingPlayhead) {
            this.isDraggingPlayhead = false;
            this.playhead.style.cursor = 'grab';
            document.body.style.userSelect = '';
        }
    }

    startDraggingClip(event, clipId) {
        event.preventDefault();
        event.stopPropagation();
        
        const clip = this.clips.find(c => c.id === clipId);
        if (!clip) return;
        
        this.isDraggingClip = true;
        this.draggedClipId = clipId;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.hasMoved = false;
        this.clipOriginalStart = clip.start;
        this.clipOriginalEnd = clip.end;
        
        // スナップ閾値（秒単位）
        this.snapThreshold = 0.2;
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
    }

    dragClip(event) {
        if (!this.isDraggingClip || this.draggedClipId === null) return;
        
        event.preventDefault();
        
        // 移動量をチェック（5px以上移動したらドラッグとみなす）
        const deltaX = Math.abs(event.clientX - this.dragStartX);
        const deltaY = Math.abs(event.clientY - this.dragStartY);
        if (deltaX > 5 || deltaY > 5) {
            this.hasMoved = true;
        }
        
        const clip = this.clips.find(c => c.id === this.draggedClipId);
        if (!clip) return;
        
        const rect = this.container.getBoundingClientRect();
        const deltaTime = ((event.clientX - this.dragStartX) / rect.width) * this.duration;
        
        const clipDuration = this.clipOriginalEnd - this.clipOriginalStart;
        let newStart = this.clipOriginalStart + deltaTime;
        let newEnd = this.clipOriginalEnd + deltaTime;
        
        // タイムラインの範囲内に制限
        if (newStart < 0) {
            newStart = 0;
            newEnd = clipDuration;
        }
        if (newEnd > this.duration) {
            newEnd = this.duration;
            newStart = this.duration - clipDuration;
        }
        
        // スナップ処理
        const snapped = this.applySnapping(newStart, newEnd, clip.id);
        newStart = snapped.start;
        newEnd = snapped.end;
        
        clip.start = newStart;
        clip.end = newEnd;
        
        this.render();
    }

    stopDraggingClip() {
        if (this.isDraggingClip) {
            const clipId = this.draggedClipId;
            
            this.isDraggingClip = false;
            this.draggedClipId = null;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            // ほとんど移動しなかった場合はクリックとみなして選択
            if (!this.hasMoved && clipId !== null) {
                if (this.selectedClipId === clipId) {
                    this.deselectClip();
                } else {
                    this.selectClip(clipId);
                }
            } else {
                // クリップを時間順にソート
                this.clips.sort((a, b) => a.start - b.start);
                
                // 重なりを検出してクロスフェードを設定
                this.detectAndSetCrossfades();
                
                this.saveState();
            }
            
            this.hasMoved = false;
            this.render();
        }
    }

    startResizingClip(event, clipId, edge) {
        event.preventDefault();
        event.stopPropagation();
        
        const clip = this.clips.find(c => c.id === clipId);
        if (!clip) return;
        
        this.isResizingClip = true;
        this.resizeClipId = clipId;
        this.resizeEdge = edge;
        this.dragStartX = event.clientX;
        this.clipOriginalStart = clip.start;
        this.clipOriginalEnd = clip.end;
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
    }

    resizeClip(event) {
        if (!this.isResizingClip || this.resizeClipId === null) return;
        
        event.preventDefault();
        
        const clip = this.clips.find(c => c.id === this.resizeClipId);
        if (!clip) return;
        
        const rect = this.container.getBoundingClientRect();
        const deltaX = event.clientX - this.dragStartX;
        const deltaTime = (deltaX / rect.width) * this.duration;
        
        if (this.resizeEdge === 'left') {
            // 左端をリサイズ
            let newStart = this.clipOriginalStart + deltaTime;
            
            // 0以上、かつendより小さい値に制限
            newStart = Math.max(0, Math.min(newStart, this.clipOriginalEnd - 0.1));
            
            clip.start = newStart;
        } else if (this.resizeEdge === 'right') {
            // 右端をリサイズ
            let newEnd = this.clipOriginalEnd + deltaTime;
            
            // startより大きく、かつduration以下に制限
            newEnd = Math.min(this.duration, Math.max(newEnd, this.clipOriginalStart + 0.1));
            
            clip.end = newEnd;
        }
        
        this.render();
    }

    stopResizingClip() {
        if (this.isResizingClip) {
            this.isResizingClip = false;
            this.resizeClipId = null;
            this.resizeEdge = null;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            // クリップを時間順にソート
            this.clips.sort((a, b) => a.start - b.start);
            
            // 重なりを検出してクロスフェードを設定
            this.detectAndSetCrossfades();
            
            this.saveState();
            this.render();
        }
    }

    detectAndSetCrossfades() {
        // 全てのクリップのフェードをリセット
        this.clips.forEach(clip => {
            clip.fadeIn = 0;
            clip.fadeOut = 0;
        });
        
        // 連続するクリップの重なりをチェック
        for (let i = 0; i < this.clips.length - 1; i++) {
            const currentClip = this.clips[i];
            const nextClip = this.clips[i + 1];
            
            // 現在のクリップの終了が次のクリップの開始より後にある場合（重なり）
            if (currentClip.end > nextClip.start) {
                const overlapDuration = currentClip.end - nextClip.start;
                
                // 前後のクリップに同じ重なり時間を設定
                currentClip.fadeOut = overlapDuration;
                nextClip.fadeIn = overlapDuration;
            }
        }
    }

    updatePlayhead(currentTime) {
        const percent = (currentTime / this.duration) * 100;
        this.playhead.style.left = `${percent}%`;
    }

    applySnapping(newStart, newEnd, clipId) {
        // スナップポイントを収集
        const snapPoints = [];
        
        // 他のクリップの開始・終了点
        this.clips.forEach(c => {
            if (c.id !== clipId) {
                snapPoints.push(c.start);
                snapPoints.push(c.end);
            }
        });
        
        // 再生ヘッドの位置
        const playheadTime = this.videoPlayer.currentTime;
        snapPoints.push(playheadTime);
        
        // タイムラインの開始・終了
        snapPoints.push(0);
        snapPoints.push(this.duration);
        
        const clipDuration = newEnd - newStart;
        let snappedStart = newStart;
        let snappedEnd = newEnd;
        
        // クリップの開始点でスナップ
        for (const point of snapPoints) {
            if (Math.abs(newStart - point) < this.snapThreshold) {
                snappedStart = point;
                snappedEnd = point + clipDuration;
                break;
            }
        }
        
        // クリップの終了点でスナップ
        if (snappedStart === newStart) {
            for (const point of snapPoints) {
                if (Math.abs(newEnd - point) < this.snapThreshold) {
                    snappedEnd = point;
                    snappedStart = point - clipDuration;
                    break;
                }
            }
        }
        
        return { start: snappedStart, end: snappedEnd };
    }

    isTimeInClip(time) {
        // 指定時間がいずれかのクリップ内にあるかチェック
        return this.clips.some(clip => 
            time >= clip.start && time <= clip.end
        );
    }

    getOpacityAtTime(time) {
        // 指定時間における不透明度を計算（クロスフェード用）
        
        // 重なっているクリップを探す
        for (let i = 0; i < this.clips.length - 1; i++) {
            const currentClip = this.clips[i];
            const nextClip = this.clips[i + 1];
            
            // 重なり部分かチェック
            if (currentClip.fadeOut > 0 && nextClip.fadeIn > 0) {
                const crossfadeStart = nextClip.start;
                const crossfadeEnd = currentClip.end;
                const crossfadeDuration = crossfadeEnd - crossfadeStart;
                const crossfadeMid = crossfadeStart + crossfadeDuration / 2;
                
                // 現在の時間がクロスフェード部分にあるか
                if (time >= crossfadeStart && time <= crossfadeEnd) {
                    // 前半（最初のクリップがフェードアウト）
                    if (time < crossfadeMid) {
                        const progress = (time - crossfadeStart) / (crossfadeDuration / 2);
                        return 1 - progress; // 1から0へフェードアウト
                    }
                    // 後半（次のクリップがフェードイン）
                    else {
                        const progress = (time - crossfadeMid) / (crossfadeDuration / 2);
                        return progress; // 0から1へフェードイン
                    }
                }
            }
        }
        
        // 通常のクリップ内にある場合
        for (const clip of this.clips) {
            if (time >= clip.start && time <= clip.end) {
                return 1; // 完全に表示
            }
        }
        
        return 1; // デフォルトは完全に表示
    }

    saveState() {
        // 現在の状態を履歴に保存
        const state = {
            clips: JSON.parse(JSON.stringify(this.clips)),
            clipIdCounter: this.clipIdCounter,
            selectedClipId: this.selectedClipId
        };
        
        // 現在の位置より後の履歴を削除
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 新しい状態を追加
        this.history.push(state);
        
        // 履歴サイズを制限
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(state) {
        this.clips = JSON.parse(JSON.stringify(state.clips));
        this.clipIdCounter = state.clipIdCounter;
        this.selectedClipId = state.selectedClipId;
        
        // クロスフェードを再検出
        this.detectAndSetCrossfades();
        
        this.updateClipCount();
        this.render();
    }

    handleKeyDown(event) {
        // Ctrl+Z: アンドゥ
        if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            this.undo();
        }
        // Ctrl+Y または Ctrl+Shift+Z: リドゥ
        else if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
            event.preventDefault();
            this.redo();
        }
    }

    render() {
        // クリップ要素をクリア
        this.clipsContainer.innerHTML = '';
        
        // 各クリップをレンダリング
        this.clips.forEach(clip => {
            const clipElement = document.createElement('div');
            clipElement.className = 'clip';
            
            if (clip.id === this.selectedClipId) {
                clipElement.classList.add('selected');
            }
            
            const startPercent = (clip.start / this.duration) * 100;
            const widthPercent = ((clip.end - clip.start) / this.duration) * 100;
            
            clipElement.style.left = `${startPercent}%`;
            clipElement.style.width = `${widthPercent}%`;
            
            // リサイズハンドルを追加
            const leftHandle = document.createElement('div');
            leftHandle.className = 'resize-handle left';
            leftHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startResizingClip(e, clip.id, 'left');
            });
            
            const rightHandle = document.createElement('div');
            rightHandle.className = 'resize-handle right';
            rightHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startResizingClip(e, clip.id, 'right');
            });
            
            // クリップの時間表示用のspan
            const timeLabel = document.createElement('span');
            timeLabel.className = 'clip-time-label';
            const duration = clip.end - clip.start;
            timeLabel.textContent = `${duration.toFixed(2)}s`;
            
            // 要素を追加
            clipElement.appendChild(leftHandle);
            clipElement.appendChild(timeLabel);
            clipElement.appendChild(rightHandle);
            
            // クロスフェードの表示
            if (clip.fadeIn > 0) {
                const fadeInDiv = document.createElement('div');
                fadeInDiv.className = 'fade-indicator fade-in';
                const fadeInPercent = (clip.fadeIn / (clip.end - clip.start)) * 100;
                fadeInDiv.style.width = `${fadeInPercent}%`;
                clipElement.appendChild(fadeInDiv);
            }
            
            if (clip.fadeOut > 0) {
                const fadeOutDiv = document.createElement('div');
                fadeOutDiv.className = 'fade-indicator fade-out';
                const fadeOutPercent = (clip.fadeOut / (clip.end - clip.start)) * 100;
                fadeOutDiv.style.width = `${fadeOutPercent}%`;
                clipElement.appendChild(fadeOutDiv);
            }
            
            // ドラッグイベント
            clipElement.style.cursor = 'grab';
            clipElement.addEventListener('mousedown', (e) => {
                // リサイズハンドルがクリックされた場合はスキップ
                if (e.target.classList.contains('resize-handle')) {
                    return;
                }
                e.stopPropagation();
                // クリックまたはドラッグ開始
                this.startDraggingClip(e, clip.id);
            });            this.clipsContainer.appendChild(clipElement);
        });
    }

    drawWaveform() {
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 背景をクリア
        ctx.clearRect(0, 0, width, height);
        
        // シンプルな波形表示（ダミー）
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const centerY = height / 2;
        const points = 200;
        
        for (let i = 0; i < points; i++) {
            const x = (i / points) * width;
            const randomHeight = Math.random() * (height * 0.4);
            const y = centerY + (Math.random() > 0.5 ? randomHeight : -randomHeight);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // グリッドライン
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        
        const gridLines = 10;
        for (let i = 0; i <= gridLines; i++) {
            const x = (i / gridLines) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }

    updateRuler() {
        this.ruler.innerHTML = '';
        
        const intervals = 10;
        for (let i = 0; i <= intervals; i++) {
            const time = (i / intervals) * this.duration;
            const span = document.createElement('span');
            span.textContent = this.formatTime(time);
            this.ruler.appendChild(span);
        }
    }

    updateClipCount() {
        const activeClips = this.clips.length;
        this.clipCountDisplay.textContent = `クリップ数: ${activeClips}`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    }
}
