import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY;
const gatewayBaseURL = process.env.AI_GATEWAY_BASE_URL;

export const AI_CONFIG = {
  chatModelName: 'google/gemini-3-flash',
  embeddingModelName: 'google/text-embedding-005',
  embeddingDimensions: 768,
  maxTokens: 8192,
  temperature: 0.7,
  topK: 5,
};

export const aiModel = new ChatOpenAI({
  apiKey: gatewayApiKey,
  modelName: AI_CONFIG.chatModelName,
  temperature: AI_CONFIG.temperature,
  configuration: {
    baseURL: gatewayBaseURL,
  },
});

export const embeddings = new OpenAIEmbeddings({
  apiKey: gatewayApiKey,
  modelName: AI_CONFIG.embeddingModelName,
  dimensions: AI_CONFIG.embeddingDimensions,
  configuration: {
    baseURL: gatewayBaseURL,
  },
});
