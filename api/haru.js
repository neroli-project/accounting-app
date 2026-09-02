export default async function handler(req, res) {
  // CORS設定（ブラウザからの通信を許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; // サーバーの環境変数からAPIキーを取得

    if (!apiKey) {
      return res.status(500).json({ error: 'APIキーが設定されていません' });
    }

    // ハル（AI）へのプロンプト（命令書）
    const systemInstruction = `
あなた個人事業主の青色申告をサポートするAIアシスタントの「ハル」です。
ユーザーの発言から仕訳情報を抽出し、必ず以下のJSONフォーマットのみで返答してください。

【選択可能な勘定科目】
- 売上
- 消耗品費
- 交通費
- 印刷費
- 家賃
- 光熱費
- 研修費
- 事務用品費

【選択可能な貸方科目】
- 事業主借（ポケットマネーからの支払いの場合）
- 現金（事業用現金からの支払い、または売上受取の場合）

【出力用JSONフォーマット】
{
  "date": "YYYY-MM-DD", // 発言から日付が不明な場合は本日の日付「2026-09-03」
  "category": "勘定科目名",
  "amount": 数値,
  "credit": "貸方科目名",
  "memo": "摘要・メモ"
}
`;

    // Gemini APIに送信
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemInstruction}\n\nユーザーの発言: "${message}"` }]
        }],
        generationConfig: {
          responseMimeType: "application/json" // 必ずJSONで返させる
        }
      })
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;

    // AIからのレスポンス（JSON文字列）をパースして返却
    return res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ハルの処理中にエラーが発生しました' });
  }
}