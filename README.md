# PDF編集ツール

Plus One社内向けPDF編集Webアプリケーション

電子印鑑の挿入、署名・日付の記入が可能なPDF編集ツールです。

## 機能

- Googleアカウントでのログイン（@it-plusone.com ドメインのみ）
- PDFファイルのアップロード（ドラッグ&ドロップ対応）
- PDF上の任意の位置へテキスト入力（署名・日付等）
- 電子印鑑画像の挿入・配置
- 配置済み要素のドラッグ移動
- 要素の削除機能
- フォントサイズ調整
- 編集後PDFのダウンロード保存

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: NextAuth.js (Google OAuth)
- **PDF処理**: pdf-lib, react-pdf
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`を`.env.local`にコピーし、必要な値を設定してください。

```bash
cp .env.local.example .env.local
```

`.env.local`ファイルを編集：

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-random-secret-string-here
NEXTAUTH_URL=http://localhost:3000
ALLOWED_DOMAIN=it-plusone.com
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. 「APIとサービス」→「認証情報」に移動
3. OAuth 2.0クライアントIDを作成
4. 承認済みのリダイレクトURIを追加:
   - 開発: `http://localhost:3000/api/auth/callback/google`
   - 本番: `https://your-app.vercel.app/api/auth/callback/google`
5. クライアントIDとシークレットを`.env.local`に設定

### 4. NEXTAUTH_SECRETの生成

```bash
openssl rand -base64 32
```

生成された文字列を`NEXTAUTH_SECRET`に設定してください。

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使用方法

1. Googleアカウント（@it-plusone.com）でログイン
2. PDFファイルをアップロード（ドラッグ&ドロップまたは選択）
3. テキストモードをONにして、PDF上をクリックしてテキストを追加
4. 印鑑画像をアップロードして配置
5. 要素をドラッグして移動、削除ボタンで削除
6. フォントサイズを調整
7. 「PDFを保存」ボタンで編集済みPDFをダウンロード

## Vercelデプロイ

詳細な手順は [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) を参照してください。

### クイックスタート

1. **Gitリポジトリの準備**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # GitHubリポジトリを作成してプッシュ
   ```

2. **Vercelでデプロイ**
   - [Vercel](https://vercel.com/)でGitHubリポジトリをインポート
   - 環境変数を設定（Settings → Environment Variables）
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `NEXTAUTH_SECRET` (生成: `openssl rand -base64 32`)
     - `NEXTAUTH_URL` (VercelのURL、例: `https://your-app.vercel.app`)
     - `ALLOWED_DOMAIN` (`it-plusone.com`)
   - デプロイ実行

3. **Google OAuth設定の更新**
   - Google Cloud ConsoleでリダイレクトURIに追加:
     - `https://your-app.vercel.app/api/auth/callback/google`

## ファイル構成

```
pdf-editor/
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth設定
│   ├── login/page.tsx                    # ログインページ
│   ├── page.tsx                          # メイン編集画面
│   ├── layout.tsx                        # ルートレイアウト
│   └── globals.css                       # グローバルスタイル
├── components/
│   ├── PDFEditor.tsx                     # PDF編集コンポーネント
│   ├── PDFViewer.tsx                     # PDFプレビュー
│   └── Providers.tsx                     # SessionProvider
├── middleware.ts                         # 認証チェック
└── .env.local                            # 環境変数（要作成）
```

## ライセンス

ISC

