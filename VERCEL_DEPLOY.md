# Vercelデプロイ手順

## 1. Gitリポジトリの準備

```bash
# Gitリポジトリを初期化（まだの場合）
git init

# ファイルを追加
git add .

# コミット
git commit -m "Initial commit"

# GitHubリポジトリを作成してプッシュ
# GitHubでリポジトリを作成後：
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main
```

## 2. Vercelでのデプロイ

### 方法A: Vercelダッシュボードから（推奨）

1. [Vercel](https://vercel.com/)にアクセスしてログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Next.js（自動検出されるはず）
   - **Root Directory**: `./`（そのまま）
   - **Build Command**: `npm run build`（デフォルト）
   - **Output Directory**: `.next`（デフォルト）
   - **Install Command**: `npm install`（デフォルト）

5. **環境変数を設定**（重要！）:
   - `GOOGLE_CLIENT_ID`: Google Cloud Consoleから取得
   - `GOOGLE_CLIENT_SECRET`: Google Cloud Consoleから取得
   - `NEXTAUTH_SECRET`: `openssl rand -base64 32`で生成した値
   - `NEXTAUTH_URL`: Vercelが自動生成するURL（例: `https://your-app.vercel.app`）
   - `ALLOWED_DOMAIN`: `it-plusone.com`

6. 「Deploy」をクリック

### 方法B: Vercel CLIから

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

## 3. Google OAuth設定の更新

Vercelデプロイ後、Google Cloud ConsoleでリダイレクトURIを追加：

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」
4. OAuth 2.0クライアントIDを編集
5. 承認済みのリダイレクトURIに追加：
   - `https://your-app.vercel.app/api/auth/callback/google`
6. 保存

## 4. 環境変数の確認

Vercelダッシュボードで以下を確認：
- Settings → Environment Variables
- すべての環境変数が正しく設定されているか確認
- Production、Preview、Developmentすべてに設定されているか確認

## 5. デプロイ後の確認

- [ ] アプリが正常に起動するか
- [ ] ログインページが表示されるか
- [ ] Google OAuth認証が動作するか
- [ ] PDF編集機能が動作するか

## トラブルシューティング

### ビルドエラーが出る場合
- ローカルで `npm run build` が成功するか確認
- 環境変数が正しく設定されているか確認

### 認証が動作しない場合
- `NEXTAUTH_URL`が正しいか確認（VercelのURL）
- Google OAuthのリダイレクトURIが正しく設定されているか確認
- 環境変数が本番環境に設定されているか確認

### PDFが表示されない場合
- ブラウザのコンソールでエラーを確認
- CDNからworkerファイルが読み込めているか確認

