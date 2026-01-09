/*
  Warnings:

  - You are about to drop the column `chatId` on the `documents` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_chatId_fkey";

-- DropIndex
DROP INDEX "documents_chatId_idx";

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "chatId",
ADD COLUMN     "url" TEXT;

-- CreateTable
CREATE TABLE "chat_documents" (
    "chatId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_documents_pkey" PRIMARY KEY ("chatId","documentId")
);

-- CreateIndex
CREATE INDEX "chat_documents_chatId_idx" ON "chat_documents"("chatId");

-- CreateIndex
CREATE INDEX "chat_documents_documentId_idx" ON "chat_documents"("documentId");

-- AddForeignKey
ALTER TABLE "chat_documents" ADD CONSTRAINT "chat_documents_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_documents" ADD CONSTRAINT "chat_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
