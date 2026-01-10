# Next.js RAG Demo

A high-performance Retrieval-Augmented Generation (RAG) demo application built with Next.js, LangChain, and Prisma. It demonstrates a complete AI chat experience with a persistent knowledge base and real-time document processing.

## Basic Features

- **Streaming RAG Chat**: Real-time context-aware responses using the Vercel AI SDK and Google Gemini.
- **Dynamic Knowledge Base**: Upload and manage documents (PDF, TXT, MD) that can be accessed globally or specific to a chat.
- **Advanced Document Processing**: Automatic chunking and vector embedding generation using LangChain and pgvector.
- **Responsive 3-Column UI**: A modern interface with chat history, a streaming chat window, and a document attachment panel.
- **Usage Limits & Credits**: Integrated usage monitoring via AI Gateway to manage credit balance and storage limits.

## Local Setup Instructions

### 1. Prerequisites

- **Node.js 20+** and **pnpm** installed.
- **PostgreSQL** with the `pgvector` extension enabled.
- An **AI Gateway** API key and base URL (configured for Google Gemini services).

### 2. Clone and Install

```bash
git clone <repository-url>
cd next-rag-demo
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
AI_GATEWAY_API_KEY="your-gateway-api-key"
AI_GATEWAY_BASE_URL="https://ai-gateway.vercel.sh/v1"
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

> **Note**: To get the `BLOB_READ_WRITE_TOKEN`, you need to create a project on [Vercel](https://vercel.com) and set up [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) in the Storage tab. For local development, you can use the Vercel CLI to link your project and pull the environment variables (`vercel link && vercel env pull`).

### 4. Database Initialization

This project uses Prisma 7. Initialize your database schema and generate the client:

```bash
npx prisma migrate dev
```

### 5. Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application in action.

## Vercel Deployment Instructions

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fikudev%2Fnext-rag-demo)

### 1. Simple Deployment

The easiest way to deploy this project is to click the **Deploy with Vercel** button above. It will:
- Clone this repository to your GitHub account.
- Create a new project on Vercel.
- Prompt you to configure the necessary environment variables.

### 2. Configure Environment Variables

Add all variables from your `.env.local` to the Vercel project settings.

### 3. Setup Managed Services

- **Database**: Use **Neon** or any Managed Postgres service that supports `pgvector`.
- **Storage**: Enable **Vercel Blob** for the project to handle file uploads.
- **Build Step**: The build command is pre-configured in `package.json` to handle migrations: `prisma migrate deploy && next build`.

### 4. Deploy

Once configured, trigger a deployment. Vercel will automatically handle the Prisma generation and migration during the build process.
