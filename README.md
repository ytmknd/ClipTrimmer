# ClipTrimmer

短いクリップのトリミングに特化したWebアプリです。GitHub Pagesで動作し、ffmpeg.wasmを使用してブラウザ上で動画編集を行います。

## 特徴

- 🎬 ブラウザ上で完結する動画トリミング
- ✂️ タイムライン上の再生ヘッド位置でクリップをカット
- 🗑️ 選択したクリップをDeleteキーで削除
- 💾 編集後の動画をエクスポート
- 🚀 GitHub Pagesで動作（静的ホスティング）

## 使い方

### 1. インストール

```bash
# 依存パッケージのインストール
npm install
```

これにより、`@ffmpeg/ffmpeg`と`@ffmpeg/util`がインストールされ、必要なWASMファイルが`public`ディレクトリに自動的にコピーされます。

### 2. 開発サーバーの起動

```bash
# HTTPサーバーを起動
npm start
```

その後、ブラウザで `http://localhost:8000` にアクセスしてください。

### 3. 動画の編集

1. **動画の読み込み**
   - 「動画ファイルを選択」ボタンをクリックして動画を読み込みます

2. **クリップのカット**
   - 動画を再生し、カットしたい位置で一時停止
   - 「カット」ボタンまたは「C」キーを押してクリップを分割

3. **クリップの削除**
   - タイムライン上のクリップをクリックして選択
   - 「削除」ボタンまたは「Delete」キーを押して削除

4. **エクスポート**
   - 編集が完了したら「エクスポート」ボタンをクリック
   - 処理後、編集済みの動画がダウンロードされます

## キーボードショートカット

- **C**: 再生ヘッド位置でカット
- **Delete**: 選択中のクリップを削除
- **Space**: 再生/一時停止

## GitHub Pagesでのデプロイ

### 準備

GitHub Pagesにデプロイする前に、ローカルでビルドして`public`ディレクトリを作成します：

```bash
npm install
```

### デプロイ手順

```bash
# リポジトリをGitHubにプッシュ
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/ClipTrimmer.git
git push -u origin main
```

### GitHub Pagesの設定

1. GitHubリポジトリの「Settings」→「Pages」に移動
2. Source: "Deploy from a branch"
3. Branch: "main" / "/ (root)" を選択
4. 「Save」をクリック

**重要**: `public`ディレクトリと`node_modules`ディレクトリをGitにコミットしてください。

数分後、`https://yourusername.github.io/ClipTrimmer/` でアクセス可能になります。

### .gitignoreの調整

GitHub Pagesで動作させるため、`.gitignore`に以下の設定を確認してください：

```gitignore
# node_modulesは除外しない（FFmpegファイルが必要なため）
# node_modules/
.DS_Store
*.log
.vscode/
dist/
*.tmp
```

または、`public`ディレクトリのみをコミットする場合：

```gitignore
node_modules/
!public/
.DS_Store
*.log
.vscode/
dist/
*.tmp
```

## 技術スタック

- **HTML5/CSS3**: UI構築
- **Vanilla JavaScript (ES6+)**: アプリケーションロジック
- **FFmpeg.wasm**: ブラウザ上での動画処理
- **Canvas API**: タイムライン表示

## ブラウザ対応

- Chrome/Edge 90+
- Firefox 90+
- Safari 15.4+

※ SharedArrayBufferを使用するため、最新のブラウザが必要です。

## ライセンス

MIT License

## ローカルでの開発

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm start
```

その後、`http://localhost:8000`にアクセスしてください。

## プロジェクト構成

```
ClipTrimmer/
├── index.html              # メインHTMLファイル
├── styles.css              # スタイルシート
├── app.js                  # メインアプリケーションロジック
├── timeline.js             # タイムライン管理モジュール
├── copy-ffmpeg-files.js    # FFmpegファイルコピースクリプト
├── package.json            # プロジェクト設定
├── README.md               # ドキュメント
├── .gitignore              # Git除外設定
├── node_modules/           # NPMパッケージ
│   ├── @ffmpeg/ffmpeg/     # FFmpegライブラリ
│   └── @ffmpeg/util/       # FFmpegユーティリティ
└── public/                 # 静的ファイル（自動生成）
    ├── ffmpeg-core.js
    ├── ffmpeg-core.wasm
    └── ffmpeg-core.worker.js
```

## 注意事項

- 大きなファイルの処理にはメモリが必要です（推奨: 4GB以上）
- エクスポート処理は動画の長さによって時間がかかる場合があります
- すべての処理はブラウザ内で完結し、サーバーにデータは送信されません
