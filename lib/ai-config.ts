import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY;
const gatewayBaseURL = 'https://ai-gateway.vercel.sh/v1';

export const aiModel = new ChatOpenAI({
  apiKey: gatewayApiKey,
  modelName: 'openai/gpt-5', // Or any model supported by your gateway
  temperature: 0.7,
  configuration: {
    baseURL: gatewayBaseURL,
  },
});

export const embeddings = new OpenAIEmbeddings({
  apiKey: gatewayApiKey,
  modelName: 'openai/text-embedding-3-small',
  dimensions: 768, // Match the vector(768) in schema.prisma
  configuration: {
    baseURL: gatewayBaseURL,
  },
});

export const embeddingModel = 'openai/text-embedding-3-small';

export const AI_CONFIG = {
  chatModel: 'openai/gpt-5',
  embeddingModel: 'openai/text-embedding-3-small',
  embeddingDimensions: 768, // Match existing schema
  maxTokens: 8192,
  temperature: 0.7,
  topK: 5, // Number of relevant chunks to retrieve for RAG
};
