# Next.js RAG デモ

Next.js、LangChain、Prisma を使用して構築された、ハイパフォーマンスな Retrieval-Augmented Generation (RAG) デモアプリケーションです。永続的なナレッジベースとリアルタイムのドキュメント処理を備えた、完全な AI チャット体験を提供します。

## 主な機能

- **ストリーミング RAG チャット**: Vercel AI SDK と Google Gemini を使用した、リアルタイムで文脈を考慮した応答。
- **動的ナレッジベース**: ドキュメント（PDF、TXT、MARKDOWN）のアップロードと管理。グローバルまたは特定のチャットに限定してアクセス可能です。
- **高度なドキュメント処理**: LangChain と pgvector を使用した自動チャンク分割およびベクトル埋め込み生成。
- **レスポンシブな 3 カラム UI**: チャット履歴、ストリーミングチャットウィンドウ、ドキュメント添付パネルを備えたモダンなインターフェース。
- **利用制限とクレジット**: AI Gateway を介した統合的な利用状況モニタリング。クレジット残高やストレージ制限を管理します。

## 技術スタック

- **アプリケーションフレームワーク**: [Next.js](https://nextjs.org/) (App Router) / [React](https://react.dev/)
- **AI & RAG フレームワーク**: [Vercel AI SDK](https://sdk.vercel.ai/), [LangChain](https://js.langchain.com/)
- **データベース & ORM**: [Prisma](https://www.prisma.io/) (PostgreSQL + [`pgvector`](https://github.com/pgvector/pgvector))
- **UI コンポーネント**: [ShadcnUI](https://ui.shadcn.com/), [Vercel AI Elements](https://ai-sdk.dev/elements)
- **スタイリング**: [Tailwind CSS](https://tailwindcss.com/)
- **ストレージ**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **インフラ**: [Vercel](https://vercel.com/) / [AI Gateway](https://vercel.com/ai-gateway/)

## ローカルセットアップ

### 1. 前提条件

- **Node.js 20 以上** および **pnpm** がインストールされていること。
- **PostgreSQL** (`pgvector` 拡張機能が有効であること)。
- **AI Gateway** の API キーとベース URL（Google Gemini サービス用に設定されていること）。

### 2. クローンとインストール

```bash
git clone <repository-url>
cd next-rag-demo
pnpm install
```

### 3. 環境変数の設定

ルートディレクトリに `.env.local` ファイルを作成し、以下の内容を追加します：

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
AI_GATEWAY_API_KEY="あなたのAPIキー"
AI_GATEWAY_BASE_URL="https://ai-gateway.vercel.sh/v1"
BLOB_READ_WRITE_TOKEN="あなたのVercel Blobトークン"
```

> **注**: `BLOB_READ_WRITE_TOKEN` を取得するには、[Vercel](https://vercel.com) でプロジェクトを作成し、Storage タブで [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) を設定する必要があります。ローカル開発では、Vercel CLI を使用してプロジェクトをリンクし、環境変数を取得することも可能です (`vercel link && vercel env pull`)。

### 4. データベースの初期化

このプロジェクトでは Prisma 7 を使用しています。データベーススキーマを初期化し、クライアントを生成します：

```bash
npx prisma migrate dev
```

### 5. 開発サーバーの起動

```bash
pnpm dev
```

`http://localhost:3000` にアクセスして、動作を確認してください。

## Vercel でのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fikudev%2Fnext-rag-demo)

### 1. 簡単なデプロイ

上の **Deploy with Vercel** ボタンをクリックするのが最も簡単な方法です。以下の操作が自動的に行われます：
- このリポジトリをご自身の GitHub アカウントにクローン。
- Vercel 上に新しいプロジェクトを作成。
- 必要な環境変数の設定プロンプトを表示。

### 2. 環境変数の設定

`.env.local` にあるすべての変数を Vercel プロジェクトの設定に追加してください。

### 3. マネージドサービスの設定

- **データベース**: **Neon** など、`pgvector` をサポートするマネージド Postgres サービスを使用してください。
- **ストレージ**: ファイルアップロード機能を有効にするため、プロジェクトで **Vercel Blob** を有効にしてください。
- **ビルドステップ**: `package.json` にてビルドコマンドが事前に設定されています (`prisma migrate deploy && next build`)。

### 4. デプロイ

設定完了後、デプロイを実行してください。ビルドプロセス中に Prisma の生成とマイグレーションが自動的に処理されます。
