# ClipTrimmer
短いクリップのトリミングに特化したWebアプリケーション

## ディレクトリ構成

```
ClipTrimmer/
├── index.html          # メインHTMLファイル
├── styles.css          # スタイルシート
├── app.js             # メインアプリケーションロジック
├── timeline.js        # タイムライン管理モジュール
├── package.json       # プロジェクト設定
├── README.md          # プロジェクトドキュメント
└── .gitignore         # Git除外設定
```

## 本番デプロイ用の静的ファイル配置（オプション）

より高速な読み込みのため、以下のようにffmpeg.wasmファイルを配置できます:

```
ClipTrimmer/
├── libs/
│   ├── ffmpeg-core.js
│   ├── ffmpeg-core.wasm
│   └── ffmpeg-core.worker.js
├── index.html
├── app.js
└── ...
```

ファイルのダウンロード方法はREADME.mdを参照してください。
