import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CLIPBOARD_PROMPT = `You are ARIA, an intelligent assistant watching the user's clipboard.
The user just copied some text. Analyze it and respond helpfully.
Reply ONLY with valid JSON, no markdown:
{
  "type": "summary" | "answer" | "tip" | "alert" | "idle",
  "message": "Helpful response max 30 words",
  "context": "one word describing the content type"
}
- summary: long text, article, document — give a quick summary
- answer: contains a question, error message, or code problem — solve it
- tip: URL, contact info, date — give useful context or suggestion
- alert: password, sensitive data, personal info copied — warn the user
- idle: very short or trivial text, nothing useful to say
Be sharp and concise.`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ type: "idle", message: "", context: "idle" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      CLIPBOARD_PROMPT,
      `Clipboard content:\n\n${text.slice(0, 3000)}`,
    ]);

    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { type: "alert", message: `Clipboard analysis failed: ${String(error).slice(0, 50)}`, context: "error" },
      { status: 500 }
    );
  }
}
