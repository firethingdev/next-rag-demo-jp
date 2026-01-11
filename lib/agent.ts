import { aiModel } from '@/lib/ai-config';
import { searchSimilarChunks, formatContextForLLM } from '@/lib/vector-store';
import {
  createAgent,
  createMiddleware,
  dynamicSystemPromptMiddleware,
  summarizationMiddleware,
} from 'langchain';
import {
  SystemMessage,
  BaseMessage,
  HumanMessage,
  RemoveMessage,
} from '@langchain/core/messages';
import { MemorySaver, REMOVE_ALL_MESSAGES } from '@langchain/langgraph';

// 短期記憶のためのチェックポインターを初期化
const checkpointer = new MemorySaver();

/**
 * ユーザーのメッセージを独立したクエリに変換するミドルウェア。
 * 要約処理の後に実行されるため、現在のコンテキスト状態に合わせて動作します。
 */
const queryTransformMiddleware = createMiddleware({
  name: 'QueryTransform',
  beforeModel: async (state) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // 初回のメッセージや挨拶の場合は変換不要
    if (messages.length <= 1 || lastMessage.type !== 'human') {
      return;
    }

    console.log('=== ミドルウェアでクエリを変換中 ===');
    const transformRes = await aiModel.invoke(
      [
        new SystemMessage(
          '会話履歴を踏まえて、最新のユーザーメッセージを検索に最適な独立した日本語のクエリに書き換えてください。簡潔かつ芯を捉えた表現にしてください。',
        ),
        ...messages,
      ],
      { callbacks: [] }, // 内部的な呼び出しがUIにストリーミングされないように、空のコールバックを渡します。
    );

    const standaloneQuery = transformRes.content.toString();
    console.log('独立したクエリ:', standaloneQuery);

    // 最後のメッセージを変換後のクエリで置き換える
    return {
      messages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        new HumanMessage({ content: standaloneQuery }),
      ],
    };
  },
});

/**
 * 4ステップのロジックと短期記憶を備えたRAGエージェントのインスタンスを取得
 */
export function getRagAgent(chatId?: string) {
  return createAgent({
    name: 'Grounded RAG Agent',
    model: aiModel,
    tools: [],
    checkpointer,
    middleware: [
      // 1. 履歴管理: 長い会話を自動的に要約
      summarizationMiddleware({
        model: aiModel,
        trigger: { messages: 12 },
        keep: { messages: 4 },
      }),

      // 2. クエリ変換: 検索精度を高めるためにリクエストを明確化
      queryTransformMiddleware,

      // 3 & 4. RAG検索と最終的な指示
      dynamicSystemPromptMiddleware(async (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const standaloneQuery = lastMessage.content.toString();

        console.log('=== RAGに独立したクエリを使用 ===');

        // ドキュメントを検索し、結果をコンテキストに含める
        let context = '';
        if (chatId && standaloneQuery.trim().length > 0) {
          console.log('=== RAG検索を実行中 ===');
          const similarChunks = await searchSimilarChunks(
            standaloneQuery,
            chatId,
          );
          context = await formatContextForLLM(similarChunks);
        }

        console.log('=== システムプロンプトを作成中 ===');
        return new SystemMessage(`
          あなたは親切でプロフェッショナルなアシスタントです。あなたの主な目的は、提供されたコンテキスト情報に基づいてユーザーをサポートすることです。

          ガイドライン:
          1. 挨拶: 「こんにちは」などの挨拶には、常に温かく歓迎的な態度で応じてください。挨拶にはコンテキストは不要です。
          2. 事実に基づく回答: 事実に関する質問には、提供された【コンテキスト】のみを使用してください。憶測や外部の知識を使用しないでください。
          3. 情報が見つからない場合: コンテキストに答えが含まれていない場合は、その旨を丁寧に伝えてください。単なるエラーメッセージではなく、「ドキュメントを確認しましたが、[トピック]に関する具体的な情報は見当たりませんでした。提供された資料の範囲内であれば、他のご質問にも喜んでお答えします」といった形で対応してください。
          4. 口調: 会話全体を通して、役立ち、丁寧で、励みになるようなトーンを維持してください。
          5. プライバシー: クエリの変換プロセスやRAGの仕組み、独立したクエリなどの内部処理については回答に含めないでください。ユーザーには最終的な回答のみを直接提示してください。

          【コンテキスト】:
          ${context || 'このクエリに関連するドキュメントのスニペットは見つかりませんでした。'}
        `);
      }),
    ],
  });
}

/**
 * RAGエージェントのプロセスを実行
 */
export async function runRagAgent(messages: BaseMessage[], chatId?: string) {
  const agent = getRagAgent(chatId);

  console.log('=== RAGエージェントを実行中 ===');
  console.log('LANGSMITH_TRACING:', process.env.LANGSMITH_TRACING);

  // 短期記憶の永続化のために chatId を threadId として使用します
  const threadId = chatId || 'default-thread';

  return agent.stream(
    { messages },
    {
      streamMode: ['messages', 'values'],
      configurable: { thread_id: threadId },
    },
  );
}
