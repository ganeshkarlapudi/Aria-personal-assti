# ARIA — Adaptive Real-time Intelligence Assistant

ARIA is an intelligent, always-on screen and clipboard AI assistant powered by Google Gemini. It exists as a sleek, floating desktop overlay for Windows, as well as an embeddable React component for web applications. ARIA acts as your personal AI co-pilot, seamlessly integrating into your workflow without interrupting it.

Whether you're coding, reading articles, watching videos, or simply browsing, ARIA watches your context and provides autonomous, proactive insights—from summarizing content to answering visible questions and warning you about sensitive data.

---

## 🌟 Key Features

### 🖥️ 1. Windows Desktop App (Python Overlay)
A floating Python-based (Tkinter) overlay that stays above all your windows. It provides instant AI feedback through an intuitive color-coded orb and an expandable detailed panel.

**Core Modes:**
- **⊡ SCREENSHOT Mode**: Automatically or manually captures your screen every 20 seconds. It uses Gemini Vision to analyze your current activity and give context-aware tips, summaries, or answers based on what you are currently looking at. 
- **⊞ CLIPBOARD Mode**: Passively watches your clipboard. Whenever you copy text, ARIA analyzes it (up to 3000 characters) and instantly suggests solutions for copied errors, summarizes long text, or detects sensitive information.
- **💬 CONTEXTUAL CHAT**: A built-in chat interface in the expanded panel. You can ask ARIA questions, and it will answer by automatically analyzing your current screen screenshot or your recently copied clipboard text as context.
- **⊘ OFF Mode**: Pauses the assistant completely, making zero API calls.

### 🌐 2. React / Next.js Floating UI Component
An elegant front-end implementation (`<ARIAFloating>`) meant for web developers. You can easily integrate the ARIA orb into any Next.js or generic React web app (or Electron wrapper) to give your users a smart floating AI companion.

---

## 🔑 1. Prerequisites (Get your free Gemini API Key)
Both the Desktop App and the React UI require a Google Gemini API Key.
Google currently offers a **100% free** tier (approx. 1,500 requests/day).

1. Go to Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account.
3. Click **"Create API key"**.
4. Copy the generated key (it typically starts with `AIzaSy...`).

---

## 🚀 2. Setting Up the Windows Desktop App

### Requirements
- Windows 10 or 11
- Python 3.10 or higher
- Internet Connection

### Installation Guide
1. **Install Python**: Download and install from [python.org](https://python.org). Make sure to check the box **"Add Python to PATH"** during setup!
2. **Navigate to the Desktop App folder**: Open the `desktop-app` directory.
3. **Install Dependencies**: Open a terminal or Command Prompt in this folder and run:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure your API Key**:
   - Create a `.env` file in the `desktop-app` folder (or just edit the Python script directly).
   - If using `.env`, add this line: `GEMINI_API_KEY=your_copied_api_key`
   - Alternatively, open `aria.py` in Notepad, and on line 22, modify `API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")` to include your key if you don't want to use a `.env` file.
5. **Launch ARIA**:
   - Double-click `START_ARIA.bat` or run `python aria.py` in the terminal.
   - The ARIA orb will appear in the top-right corner of your screen.
6. **(Optional) Run on Startup**: 
   - Double-click `ADD_TO_STARTUP.bat` so ARIA launches silently in the background every time you turn on your PC.

### How to use the Desktop App
- **The Orb**: Click and drag the floating orb to move it anywhere on your desktop.
- **Expand Panel**: Double-click the orb to open the detailed panel.
- **Switch Modes**: In the expanded panel, click between `SCREENSHOT`, `CLIPBOARD`, and `OFF`.
- **Auto-Scan / Manual Scan**: Under Screenshot mode, you can toggle `AUTO-SCAN` ON/OFF. If OFF, you can click `SCAN NOW` to manually trigger an AI reading of your screen.
- **Chat**: Use the input box at the bottom of the panel to type queries. Press `Enter` or click `SEND`. ARIA will answer while seeing exactly what is on your screen!

---

## 🎨 3. Understanding the Orb Colors

ARIA communicates its state and the type of information it found using color-coding:

| Color | Meaning / Action |
|-------|------------------|
| 🟣 **Purple** | ARIA is currently scanning or "thinking" (Processing API request). |
| 🟢 **Teal**   | **Summary**: ARIA found lots of readable content (articles, docs) and provided a quick summary. |
| 🔵 **Blue**   | **Answer**: ARIA saw a problem or question on screen/clipboard and solved it. |
| 🟡 **Yellow** | **Tip**: ARIA gave a productivity tip, URL context, or suggestion. |
| 🔴 **Red**    | **Alert**: Look out! Error, warning, or sensitive password data detected. |
| 🟠 **Orange** | Standing by in **Clipboard Mode**. |
| ⚫ **Dark**   | **Idle / Off**: Nothing interesting visible, or ARIA is paused. |

---

## ⚛️ 4. Setting Up the React / Next.js Web UI

If you are a developer looking to integrate ARIA into a Next.js web application, this project includes a complete drop-in UI component.

### Installation
1. Navigate to the React directory:
   ```bash
   cd react-ui
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and add your Gemini API Key: `GEMINI_API_KEY=AIzaSy...`
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` to see the demo page with the floating ARIA orb!

### Implementation Example

The `ARIAFloating` component is pre-wired to your backend API routes. You can embed it in your `app/layout.tsx` so it persists across pages:

```tsx
import { ARIAFloating } from "@/components/ui/aria-floating";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ARIAFloating
          onScreenshot={async () => { /* Logic automatically handled by /api/aria/screenshot */ }}
          onClipboard={async (text) => { /* Logic automatically handled by /api/aria/clipboard */ }}
          screenshotInterval={20000} // 20 seconds
          clipboardInterval={4000}   // 4 seconds
        />
      </body>
    </html>
  );
}
```

You can also use the beautiful **AI Loader** component individually anywhere in your app:

```tsx
import { Component as AILoader } from "@/components/ui/ai-loader";

// Renders the sleek purple spinning text loader!
<AILoader size={180} text="Generating..." />
```

---

*ARIA was built to keep you focused. No more copy-pasting to ChatGPT windows. Leave your context where it is, and let the AI come to you.*
