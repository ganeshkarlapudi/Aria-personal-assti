# ARIA — Complete Project
### AI Screen Intelligence Agent · Floating UI · Windows Desktop + React Web

---

```
aria-complete/
├── desktop-app/          ← Python Windows overlay (always-on, runs on boot)
│   ├── aria.py           ← Main app: screenshot + clipboard + off modes
│   ├── requirements.txt  ← Python dependencies
│   ├── START_ARIA.bat    ← Double-click to launch
│   └── ADD_TO_STARTUP.bat← Double-click to run on every Windows boot
│
└── react-ui/             ← Next.js floating UI component (web / Electron)
    ├── app/
    │   ├── layout.tsx        ← Mounts <ARIAFloating> globally
    │   ├── page.tsx          ← Demo page
    │   ├── globals.css       ← Tailwind base styles
    │   └── api/aria/
    │       ├── screenshot/route.ts  ← Gemini vision API endpoint
    │       └── clipboard/route.ts   ← Gemini clipboard API endpoint
    ├── components/ui/
    │   ├── aria-floating.tsx ← Floating orb + panel React component
    │   └── ai-loader.tsx     ← AI loading animation component
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    └── .env.local.example    ← Copy to .env.local and add your key
```

---

## GET YOUR FREE API KEY (both apps need this)

1. Go to → https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy it (looks like `AIzaSy...`)

> **100% free** — no credit card, ~1,500 requests/day

---

## PART 1 — Desktop App (Windows Python overlay)

Always-on floating orb that sits above ALL your windows.

### Setup
1. Install Python → https://python.org *(check "Add to PATH")*
2. Open `desktop-app/aria.py` in Notepad
3. Line 20: replace `YOUR_GEMINI_API_KEY_HERE` with your key
4. Double-click `START_ARIA.bat`
5. *(Optional)* Double-click `ADD_TO_STARTUP.bat` to run on every boot

### Modes
| Mode | Behaviour |
|------|-----------|
| ⊡ SCREENSHOT | Takes a screenshot every 20s, analyzes screen with Gemini Vision |
| ⊞ CLIPBOARD  | Watches clipboard every 4s, reacts when you copy text |
| ⊘ OFF        | Completely paused — zero API calls |

Switch modes by double-clicking the orb → clicking mode buttons in the panel.

---

## PART 2 — React / Next.js Floating UI

Floating ARIA component for web apps or Electron desktop apps.

### Setup

```bash
cd react-ui
npm install

# Copy env file and add your key
cp .env.local.example .env.local
# Edit .env.local → GEMINI_API_KEY=AIzaSy...

npm run dev
```

Open http://localhost:3000 — ARIA orb appears in the top-right corner.

### Using the component

```tsx
import { ARIAFloating } from "@/components/ui/aria-floating";

// Already wired in app/layout.tsx — just run the project!
<ARIAFloating
  onScreenshot={async () => { /* calls /api/aria/screenshot */ }}
  onClipboard={async (text) => { /* calls /api/aria/clipboard */ }}
  screenshotInterval={20000}
  clipboardInterval={4000}
/>
```

### Using the AI Loader

```tsx
import { Component as AILoader } from "@/components/ui/ai-loader";

<AILoader size={180} text="Generating" />
```

---

## ORB COLORS (both apps)

| Color | Meaning |
|-------|---------|
| 🟢 Teal   | Summary of content |
| 🔵 Blue   | Answer to something visible |
| 🟡 Yellow | Productivity tip |
| 🔴 Red    | Alert or warning |
| 🟣 Purple | Currently scanning |
| ⚫ Dark   | Idle / off |

---

## REQUIREMENTS

**Desktop app:** Windows 10/11, Python 3.10+, internet
**React UI:** Node.js 18+, npm, internet
**Both:** Free Gemini API key from aistudio.google.com
