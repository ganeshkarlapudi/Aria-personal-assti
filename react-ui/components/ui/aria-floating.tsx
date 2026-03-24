"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Component as AILoader } from "./ai-loader";

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "screenshot" | "clipboard" | "off" | "chat";
type Source = "screenshot" | "clipboard" | "chat";
type ResponseType = "summary" | "answer" | "tip" | "alert" | "idle";

interface ARIAResponse {
  type: ResponseType;
  message: string;
  context: string;
}

interface HistoryItem extends ARIAResponse {
  id: number;
  source: Source;
  time: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<ResponseType, { color: string; icon: string; label: string }> = {
  summary: { color: "#7DF9C4", icon: "◈", label: "SUMMARY" },
  answer:  { color: "#7DC4F9", icon: "◉", label: "ANSWER"  },
  tip:     { color: "#F9E97D", icon: "◎", label: "TIP"     },
  alert:   { color: "#F97D7D", icon: "◆", label: "ALERT"   },
  idle:    { color: "#44445a", icon: "○", label: ""         },
};

const MODE_CFG: Record<Mode, { color: string; dot: string; label: string }> = {
  screenshot: { color: "#7DF9C4", dot: "#7DF9C4", label: "SCREENSHOT" },
  clipboard:  { color: "#F9A87D", dot: "#F9A87D", label: "CLIPBOARD"  },
  off:        { color: "#44445a", dot: "#44445a", label: "OFF"        },
  chat:       { color: "#B47DF9", dot: "#B47DF9", label: "CHAT"       },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#B47DF9]"
          style={{ animation: "ariaBounce 1.2s infinite", animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <span className="text-[10px] text-[#B47DF9] ml-1 font-mono">Analyzing...</span>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const cfg = TYPE_CFG[item.type];
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-[9px]">{item.source === "screenshot" ? "📷" : item.source === "clipboard" ? "📋" : "💬"}</span>
      <span className="text-[9px]" style={{ color: cfg.color }}>{cfg.icon}</span>
      <span className="text-[9px] text-[#44445a] truncate">{item.message}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export interface ARIAFloatingProps {
  /** Called when ARIA needs to analyze the screen (screenshot mode) */
  onScreenshot?: () => Promise<ARIAResponse>;
  /** Called when ARIA needs to analyze clipboard text */
  onClipboard?: (text: string) => Promise<ARIAResponse>;
  /** Called when the user sends a chat message */
  onChat?: (message: string) => Promise<ARIAResponse>;
  /** Initial position */
  initialPosition?: { x: number; y: number };
  /** Screenshot interval in ms (default: 20000) */
  screenshotInterval?: number;
  /** Clipboard poll interval in ms (default: 4000) */
  clipboardInterval?: number;
}

export const ARIAFloating: React.FC<ARIAFloatingProps> = ({
  onScreenshot,
  onClipboard,
  onChat,
  initialPosition = { x: window.innerWidth - 90, y: 80 },
  screenshotInterval = 20000,
  clipboardInterval = 4000,
}) => {
  const [mode, setModeState] = useState<Mode>("screenshot");
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState<ARIAResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [countdown, setCountdown] = useState(20);
  const [autoScreenshot, setAutoScreenshot] = useState(false); // Default to false to save tokens
  const [position, setPosition] = useState(initialPosition);
  const [lastClipboard, setLastClipboard] = useState("");
  const [chatText, setChatText] = useState("");

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;

  // ── Analysis trigger ───────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (isThinking || modeRef.current === "off") return;
    setIsThinking(true);

    try {
      let result: ARIAResponse | null = null;
      if (modeRef.current === "screenshot" && onScreenshot) {
        result = await onScreenshot();
      } else if (modeRef.current === "clipboard" && onClipboard) {
        const clip = await navigator.clipboard.readText().catch(() => "");
        if (clip && clip.trim().length > 10 && clip !== lastClipboard) {
          setLastClipboard(clip);
          result = await onClipboard(clip);
        }
      }
      if (result) {
        setResponse(result);
        if (result.type !== "idle") {
          setHistory(prev => [
            { ...result!, id: Date.now(), source: modeRef.current as Source, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ...prev,
          ].slice(0, 8));
        }
      }
    } catch (e) {
      setResponse({ type: "alert", message: `Error: ${String(e).slice(0, 60)}`, context: "error" });
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, onScreenshot, onClipboard, lastClipboard]);

  // ── Chat trigger ───────────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatText.trim() || isThinking || !onChat) return;
    setIsThinking(true);
    try {
      const result = await onChat(chatText);
      if (result) {
        setResponse(result);
        if (result.type !== "idle") {
          setHistory(prev => [
            { ...result, id: Date.now(), source: "chat" as Source, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ...prev,
          ].slice(0, 8));
        }
      }
      setChatText("");
    } catch (e) {
      setResponse({ type: "alert", message: `Chat Error: ${String(e).slice(0, 60)}`, context: "error" });
    } finally {
      setIsThinking(false);
    }
  };

  // ── Countdown loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = mode === "clipboard" ? clipboardInterval / 1000 : screenshotInterval / 1000;
    const timer = setInterval(() => {
      if (mode === "off" || (mode === "screenshot" && !autoScreenshot)) return;
      setCountdown(prev => {
        if (prev <= 1) {
          runAnalysis();
          return interval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, autoScreenshot, clipboardInterval, screenshotInterval, runAnalysis]);

  // ── Mode change ────────────────────────────────────────────────────────────
  const setMode = (m: Mode) => {
    setModeState(m);
    setLastClipboard("");
    setCountdown(m === "clipboard" ? clipboardInterval / 1000 : screenshotInterval / 1000);
    if (m !== "off") setTimeout(runAnalysis, 500);
    else setResponse(null);
  };

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const modeCfg = MODE_CFG[mode];
  const respCfg = response ? TYPE_CFG[response.type] : TYPE_CFG.idle;
  const orbColor = isThinking ? "#B47DF9" : (response && response.type !== "idle" ? respCfg.color : modeCfg.color);
  const orbIcon  = isThinking ? "⟳" : (response && response.type !== "idle" ? respCfg.icon : (mode === "off" ? "⊘" : mode === "clipboard" ? "⊞" : "⊡"));
  const panelLeft = position.x > window.innerWidth / 2 ? position.x - 268 : position.x + 70;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
        .aria-float   { animation: ariaFloat 4s ease-in-out infinite; }
        .aria-spin    { animation: ariaSpin 1s linear infinite; }
        .aria-ring    { animation: ariaRing 3s ease-in-out infinite; }
        .aria-ring2   { animation: ariaRing 3s ease-in-out infinite 0.5s; }
        .aria-fadein  { animation: ariaFadeIn 0.25s ease; }
        @keyframes ariaFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes ariaSpin    { to{transform:rotate(360deg)} }
        @keyframes ariaRing    { 0%,100%{transform:scale(1);opacity:.2} 50%{transform:scale(1.08);opacity:.45} }
        @keyframes ariaFadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ariaBounce  { 0%,80%,100%{transform:translateY(0);opacity:.5} 40%{transform:translateY(-5px);opacity:1} }
      `}</style>

      {/* ORB */}
      <div
        ref={wrapRef}
        onMouseDown={onMouseDown}
        className="fixed z-[9999] flex flex-col items-center gap-1.5 select-none"
        style={{ left: position.x, top: position.y, cursor: "grab", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Glow rings */}
        <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
          <div className="aria-ring absolute inset-0 rounded-full border" style={{ inset: -14, borderColor: orbColor + "30" }} />
          <div className="aria-ring2 absolute rounded-full border" style={{ inset: -8, borderColor: orbColor + "40" }} />

          {/* Orb button */}
          <button
            onClick={() => setIsOpen(o => !o)}
            className={`aria-${isThinking ? "spin" : "float"} relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors duration-300 cursor-pointer`}
            style={{ background: "#0d0d1c", borderColor: orbColor }}
          >
            <span className="text-lg z-10 transition-colors duration-300" style={{ color: orbColor }}>
              {orbIcon}
            </span>
            {/* Mode dot */}
            <span
              className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0d1c] transition-colors duration-300"
              style={{ background: modeCfg.dot }}
            />
          </button>
        </div>

        <span className="text-[8px] text-[#44445a] tracking-widest">
          {isOpen ? "click to close" : "click to open"}
        </span>
      </div>

      {isThinking && <AILoader size={180} text="Analyzing" />}

      {/* PANEL */}
      {isOpen && (
        <div
          className="aria-fadein fixed z-[9998] w-[248px] overflow-hidden rounded-2xl border"
          style={{
            left: panelLeft,
            top: position.y,
            background: "#0d0d1c",
            borderColor: "rgba(255,255,255,0.1)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium tracking-[3px]" style={{ color: "#7DF9C4" }}>ARIA</span>
              <span className="text-[8px] tracking-widest" style={{ color: "#7DF9C466" }}>● GEMINI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-base text-[#44445a] hover:text-white transition-colors leading-none">×</button>
          </div>

          {/* Mode switcher */}
          <div className="px-3.5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="text-[8px] text-[#44445a] tracking-[2px] mb-2">MODE</div>
            <div className="flex gap-1.5">
              {(["screenshot", "clipboard", "off"] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-1.5 rounded-lg text-[8px] tracking-wider border transition-all duration-200 cursor-pointer"
                  style={{
                    background: mode === m ? MODE_CFG[m].color + "18" : "#12122a",
                    color: mode === m ? MODE_CFG[m].color : "#44445a",
                    borderColor: mode === m ? MODE_CFG[m].color + "50" : "transparent",
                  }}
                >
                  {m === "screenshot" ? "⊡ SCREEN" : m === "clipboard" ? "⊞ CLIP" : "⊘ OFF"}
                </button>
              ))}
            </div>
            {mode === "screenshot" && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <span className="text-[8px] text-[#44445a] tracking-wider">AUTO-SCAN {autoScreenshot ? "ON" : "OFF"}</span>
                <div className="flex gap-2">
                  <button onClick={() => setAutoScreenshot(!autoScreenshot)} className="text-[9px] px-2 py-0.5 rounded border transition-colors" style={{ borderColor: autoScreenshot ? "#7DF9C4" : "#44445a", color: autoScreenshot ? "#7DF9C4" : "#44445a" }}>
                    TOGGLE
                  </button>
                  <button onClick={runAnalysis} className="text-[9px] px-2 py-0.5 rounded border border-[#7DF9C4] text-[#7DF9C4] hover:bg-[#7DF9C420] transition-colors" disabled={isThinking}>
                    SCAN NOW
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Response */}
          <div className="px-3.5 py-3 min-h-[72px] border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {mode === "off" ? (
              <p className="text-[11px] italic" style={{ color: "#44445a" }}>ARIA is paused. Switch a mode to resume.</p>
            ) : isThinking ? (
              <ThinkingDots />
            ) : response && response.type !== "idle" ? (
              <>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px]" style={{ color: respCfg.color }}>{respCfg.icon}</span>
                  <span className="text-[8px] font-medium tracking-[2px]" style={{ color: respCfg.color }}>{respCfg.label}</span>
                  <span className="text-[8px] ml-auto" style={{ color: "#44445a" }}>{response.context.toUpperCase()}</span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "#d0d0f0" }}>{response.message}</p>
              </>
            ) : (
              <p className="text-[11px] italic" style={{ color: "#44445a" }}>Nothing notable yet.</p>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="px-3.5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="text-[8px] text-[#44445a] tracking-[2px] mb-1.5">HISTORY</div>
              {history.slice(0, 4).map(item => <HistoryRow key={item.id} item={item} />)}
            </div>
          )}

          {/* Chat */}
          <div className="px-3.5 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <input
              type="text"
              className="flex-1 bg-[#12122a] text-[#d0d0f0] text-[10px] px-2 py-1.5 rounded outline-none placeholder-[#44445a]"
              placeholder="Ask ARIA..."
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleChat();
              }}
              disabled={isThinking || !onChat}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <button
              className="text-[#B47DF9] text-[9px] font-bold tracking-wider px-2 py-1.5 rounded bg-[#B47DF915] hover:bg-[#B47DF930] transition-colors"
              onClick={handleChat}
              disabled={isThinking || !chatText.trim() || !onChat}
            >
              SEND
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3.5 py-2">
            <span className="text-[8px]" style={{ color: "#44445a55" }}>
              {mode === "off" ? "Paused" : (mode === "screenshot" && !autoScreenshot) ? "Auto-scan disabled" : `Next scan in ${countdown}s`}
            </span>
            <span className="text-[8px]" style={{ color: modeCfg.color }}>
              {modeCfg.label}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default ARIAFloating;
