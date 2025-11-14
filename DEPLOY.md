# ClipTrimmer デプロイ手順

## GitHub Pagesへのデプロイ

### 1. 依存パッケージのインストール

```bash
npm install
```

これにより、`public`ディレクトリにWASMファイルが生成されます。

### 2. node_modulesをGitに含める

GitHub Pagesで動作させるため、`@ffmpeg`パッケージをコミットする必要があります。

**オプション1: publicディレクトリのみをコミット（推奨）**

`.gitignore`を以下のように設定：

```gitignore
node_modules/
!public/
.DS_Store
*.log
```

この場合、`app.js`のインポートパスも修正が必要です。

**オプション2: @ffmpeg関連のnode_modulesをコミット**

`.gitignore`を以下のように設定：

```gitignore
node_modules/*
!node_modules/@ffmpeg/
.DS_Store
*.log
```

### 3. GitHubにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/ClipTrimmer.git
git push -u origin main
```

### 4. GitHub Pagesを有効化

1. GitHubリポジトリの「Settings」→「Pages」に移動
2. Source: "Deploy from a branch"
3. Branch: "main" / "/ (root)" を選択
4. 「Save」をクリック

数分後、`https://yourusername.github.io/ClipTrimmer/` でアクセス可能になります。

## ローカル開発

```bash
npm install
npm start
```

その後、`http://localhost:8000` にアクセスしてください。
