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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('API_KEY_MISSING: GEMINI_API_KEY is not set in Vercel environment variables.');
      return res.status(500).json({ error: 'APIキーが設定されていません' });
    }

    const systemInstruction = `
あなた個人事業主の青色申告をサポートするAIアシスタントの「ハル」です。
ユーザーの発言から仕訳情報を抽出し、必ず以下のJSON形式のみで返答してください。余計な解説は不要です。

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
- 事業主借
- 現金

【出力用JSONフォーマット】
{
  "date": "2026-09-03",
  "category": "勘定科目名",
  "amount": 数値,
  "credit": "貸方科目名",
  "memo": "摘要・メモ"
}
`;

    // Gemini 2.5 Flash モデルを使用
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemInstruction}\n\n入力: "${message}"` }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.candidates || !data.candidates[0]) {
      console.error('Gemini API Error Detail:', JSON.stringify(data));
      return res.status(500).json({ error: 'Gemini APIからの応答エラー', details: data });
    }

    let resultText = data.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    return res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error('Server Processing Error:', error);
    return res.status(500).json({ error: '処理中にエラーが発生しました', message: error.message });
  }
}