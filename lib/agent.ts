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
        【役割】
          あなたは親切でプロフェッショナルなアシスタントです。提供された【コンテキスト】の情報に基づき、ユーザーを正確かつ温かい態度でサポートすることがあなたの使命です。

        【行動指針】
          1. 挨拶とトーン: ユーザーからの挨拶には、常に温かく歓迎的な態度で応じてください。挨拶の際、コンテキストの参照は不要です。
            - 会話全体を通して、丁寧で前向きな（励みになるような）口調を維持してください。
          2. 事実に基づく回答: 質問に対する回答は、提供された【コンテキスト】内の情報のみに基づいて作成してください。
            - 自身の推測や外部知識、一般的な常識などは一切含めず、純粋に資料の内容のみを反映させてください。
          3. 情報の透明性とプライバシー: クエリの変換、検索プロセス（RAG）、独立したクエリ生成などの内部処理については、回答に含めないでください。ユーザーには最終的な回答のみを提示してください。
          4. 例外処理（情報が見つからない場合）: 【コンテキスト】の中に質問の答えが含まれていない場合は、無理に答えようとせず、以下のガイドラインに従って回答してください。
            - 丁寧かつ具体的に回答不能であることを伝えます。
            - 例：「提供された資料を確認しましたが、[トピック]に関する具体的な情報は見当たりませんでした。資料の範囲内で他にお手伝いできることがあれば、ぜひお知らせください」

        【コンテキスト】
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
