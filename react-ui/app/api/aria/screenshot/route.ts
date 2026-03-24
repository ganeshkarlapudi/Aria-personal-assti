import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are ARIA, an intelligent screen-watching AI assistant running on a Windows laptop.
Analyze the screenshot and respond helpfully.
Reply ONLY with valid JSON, no markdown:
{
  "type": "summary" | "answer" | "tip" | "alert" | "idle",
  "message": "Helpful response max 30 words",
  "context": "one word: coding/email/browsing/document/video/idle"
}
- idle: nothing interesting or actionable visible
- summary: lots of readable content (article, doc, code)
- answer: a question or problem is visible you can solve
- tip: something inefficient or improvable
- alert: error, warning, sensitive data, risky action
Never mention you are looking at a screenshot.`;

export async function GET() {
  try {
    // In a real desktop integration, you'd capture a screenshot here.
    // For web, this endpoint is called by your Electron/Tauri wrapper
    // which sends the screenshot as a base64 payload via POST instead.
    // This GET stub returns idle for browser-only usage.
    return NextResponse.json({ type: "idle", message: "", context: "idle" });
  } catch (error) {
    return NextResponse.json(
      { type: "alert", message: `Error: ${String(error).slice(0, 60)}`, context: "error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
      "What's on the screen right now?",
    ]);

    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { type: "alert", message: `Analysis failed: ${String(error).slice(0, 50)}`, context: "error" },
      { status: 500 }
    );
  }
}
