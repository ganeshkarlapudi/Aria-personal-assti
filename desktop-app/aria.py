"""
ARIA - Adaptive Real-time Intelligence Assistant
Modes: Screenshot | Clipboard | Off
Powered by Google Gemini (FREE)
"""

import tkinter as tk
import threading
import time
import json
import io
import sys
from datetime import datetime
from PIL import ImageGrab, Image
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ────────────────────────────────────────────────────────────────────
API_KEY           = os.getenv("GEMINI_API_KEY", "")
SCREENSHOT_INTERVAL = 20      # seconds between screenshots
CLIPBOARD_INTERVAL  = 4       # seconds between clipboard checks

# ── COLORS ────────────────────────────────────────────────────────────────────
BG      = "#08080f"
BG2     = "#0f0f1e"
BORDER  = "#1e1e38"
TEXT    = "#d0d0f0"
DIM     = "#44445a"
TEAL    = "#7DF9C4"
BLUE    = "#7DC4F9"
YELLOW  = "#F9E97D"
RED     = "#F97D7D"
PURPLE  = "#B47DF9"
ORANGE  = "#F9A87D"

TYPE_CFG = {
    "summary": {"color": TEAL,   "icon": "◈", "label": "SUMMARY"},
    "answer":  {"color": BLUE,   "icon": "◉", "label": "ANSWER"},
    "tip":     {"color": YELLOW, "icon": "◎", "label": "TIP"},
    "alert":   {"color": RED,    "icon": "◆", "label": "ALERT"},
    "idle":    {"color": DIM,    "icon": "○", "label": ""},
}

MODE_CFG = {
    "screenshot": {"color": TEAL,   "label": "SCREENSHOT", "icon": "⊡"},
    "clipboard":  {"color": ORANGE, "label": "CLIPBOARD",  "icon": "⊞"},
    "off":        {"color": DIM,    "label": "OFF",        "icon": "⊘"},
}

SCREENSHOT_PROMPT = """You are ARIA, an intelligent screen-watching AI on the user's Windows laptop.
Analyze the screenshot and respond helpfully.
Reply ONLY with valid JSON, no markdown:
{
  "type": "summary" | "answer" | "tip" | "alert" | "idle",
  "message": "Helpful response max 30 words",
  "context": "one word: coding/email/browsing/document/video/idle"
}
- idle: nothing interesting visible
- summary: lots of readable content on screen
- answer: a question/problem visible you can solve
- tip: something inefficient or improvable
- alert: error, warning, sensitive data, risky action
Never mention you're looking at a screenshot."""

CLIPBOARD_PROMPT = """You are ARIA, an intelligent assistant watching the user's clipboard.
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
- idle: very short/trivial text, nothing useful to say
Be sharp and concise."""


class ARIAApp:
    def __init__(self):
        genai.configure(api_key=API_KEY)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

        self.mode = "screenshot"   # "screenshot" | "clipboard" | "off"
        self.history = []
        self.current_response = None
        self.is_thinking = False
        self.is_expanded = False
        self.auto_scan = False
        self._pulse_val = 0
        self._pulse_dir = 1
        self._last_clipboard = ""
        self._next_tick = SCREENSHOT_INTERVAL

        self._build_window()
        self._build_orb()
        self._build_panel()
        self._tick_loop()
        # first scan after 2s
        self.root.after(2000, lambda: threading.Thread(target=self._run_scan, daemon=True).start())

    # ── WINDOW ────────────────────────────────────────────────────────────────
    def _build_window(self):
        self.root = tk.Tk()
        self.root.title("ARIA")
        self.root.overrideredirect(True)
        self.root.wm_attributes("-topmost", True)
        self.root.wm_attributes("-transparentcolor", "#010101")
        self.root.config(bg="#010101")
        sw = self.root.winfo_screenwidth()
        self.root.geometry(f"64x64+{sw - 94}+80")
        self._drag_x = self._drag_y = 0

    # ── ORB ───────────────────────────────────────────────────────────────────
    def _build_orb(self):
        self.orb_canvas = tk.Canvas(self.root, width=64, height=64,
                                    bg="#010101", highlightthickness=0)
        self.orb_canvas.pack()
        self.orb_canvas.bind("<ButtonPress-1>",  self._drag_start)
        self.orb_canvas.bind("<B1-Motion>",       self._drag_motion)
        self.orb_canvas.bind("<Double-Button-1>", self._toggle_panel)
        self._animate_orb()

    def _orb_color(self):
        if self.mode == "off":    return DIM
        if self.is_thinking:      return PURPLE
        if self.current_response and self.current_response["type"] != "idle":
            return TYPE_CFG[self.current_response["type"]]["color"]
        return MODE_CFG[self.mode]["color"]

    def _draw_orb(self, color):
        c = self.orb_canvas
        c.delete("all")
        cx = cy = 32
        r = 28
        for ring, alpha in [(r+10,"14"),(r+6,"22"),(r+2,"35")]:
            c.create_oval(cx-ring,cy-ring,cx+ring,cy+ring, outline=color, width=1)
        c.create_oval(cx-r,cy-r,cx+r,cy+r, fill=BG2, outline=color, width=2)
        c.create_oval(cx-22,cy-22,cx+22,cy+22, fill=color, outline="")

        if self.mode == "off":
            icon = "⊘"
        elif self.is_thinking:
            icon = "⟳"
        elif self.current_response and self.current_response["type"] != "idle":
            icon = TYPE_CFG[self.current_response["type"]]["icon"]
        else:
            icon = MODE_CFG[self.mode]["icon"]
        c.create_text(cx, cy, text=icon, fill=color, font=("Segoe UI", 18))

        # tiny mode dot bottom-right
        dot_color = MODE_CFG[self.mode]["color"]
        c.create_oval(cx+14, cy+14, cx+22, cy+22,
                      fill=dot_color, outline=BG, width=1)

    def _animate_orb(self):
        self._pulse_val += 0.05 * self._pulse_dir
        if self._pulse_val >= 1: self._pulse_dir = -1
        if self._pulse_val <= 0: self._pulse_dir = 1
        self._draw_orb(self._orb_color())
        self.root.after(80, self._animate_orb)

    # ── DRAG ──────────────────────────────────────────────────────────────────
    def _drag_start(self, e):
        self._drag_x = e.x_root - self.root.winfo_x()
        self._drag_y = e.y_root - self.root.winfo_y()

    def _drag_motion(self, e):
        x = e.x_root - self._drag_x
        y = e.y_root - self._drag_y
        self.root.geometry(f"+{x}+{y}")
        self._reposition_panel()

    # ── PANEL ─────────────────────────────────────────────────────────────────
    def _build_panel(self):
        self.panel = tk.Toplevel(self.root)
        self.panel.overrideredirect(True)
        self.panel.wm_attributes("-topmost", True)
        self.panel.config(bg=BG)
        self.panel.withdraw()

        outer = tk.Frame(self.panel, bg=BORDER, padx=1, pady=1)
        outer.pack(fill="both", expand=True)
        self.inner = tk.Frame(outer, bg=BG, padx=14, pady=12)
        self.inner.pack(fill="both", expand=True)

        self._build_panel_header()
        tk.Frame(self.inner, bg=BORDER, height=1).pack(fill="x", pady=(0,10))
        self._build_mode_switcher()
        tk.Frame(self.inner, bg=BORDER, height=1).pack(fill="x", pady=8)

        self.auto_scan_frame = tk.Frame(self.inner, bg=BG)
        # It will be packed via _refresh_panel if mode == screenshot

        self.status_var = tk.StringVar(value="Watching your screen...")
        tk.Label(self.inner, textvariable=self.status_var, bg=BG, fg=DIM,
                 font=("Courier New", 8), wraplength=270, justify="left").pack(anchor="w")

        self.resp_frame = tk.Frame(self.inner, bg=BG)
        self.resp_frame.pack(fill="x", pady=(8,0))

        tk.Frame(self.inner, bg=BORDER, height=1).pack(fill="x", pady=8)
        tk.Label(self.inner, text="HISTORY", bg=BG, fg=DIM,
                 font=("Courier New", 7)).pack(anchor="w")
        self.history_frame = tk.Frame(self.inner, bg=BG)
        self.history_frame.pack(fill="x", pady=(4,0))

        tk.Frame(self.inner, bg=BORDER, height=1).pack(fill="x", pady=(8,4))
        
        self.chat_frame = tk.Frame(self.inner, bg=BG)
        self.chat_frame.pack(fill="x", pady=(0, 4))
        
        self.chat_var = tk.StringVar(value="")
        self.chat_entry = tk.Entry(self.chat_frame, textvariable=self.chat_var, bg=BG2, fg=TEXT, font=("Courier New", 8), relief="flat", insertbackground=TEXT)
        self.chat_entry.pack(side="left", fill="x", expand=True, ipady=4, padx=(0, 4))
        self.chat_entry.bind("<Return>", self._on_chat_send)
        
        tk.Button(self.chat_frame, text="SEND", bg=BG2, fg=DIM, relief="flat", font=("Courier New", 8, "bold"), cursor="hand2", padx=6, command=self._on_chat_send).pack(side="right")
        
        bottom_frame = tk.Frame(self.inner, bg=BG)
        bottom_frame.pack(fill="x", pady=(4,0))
        self.next_var = tk.StringVar(value="")
        tk.Label(bottom_frame, textvariable=self.next_var, bg=BG, fg=DIM,
                 font=("Courier New", 7)).pack(anchor="w")

        self._reposition_panel()

    def _build_panel_header(self):
        hdr = tk.Frame(self.inner, bg=BG)
        hdr.pack(fill="x", pady=(0,8))
        tk.Label(hdr, text="ARIA", bg=BG, fg=TEAL,
                 font=("Courier New",10,"bold")).pack(side="left")
        tk.Label(hdr, text="● GEMINI", bg=BG, fg=TEAL,
                 font=("Courier New",7)).pack(side="left", padx=6)
        tk.Button(hdr, text="×", bg=BG, fg=DIM, relief="flat",
                  font=("Courier New",12), cursor="hand2",
                  command=self._toggle_panel).pack(side="right")

    def _build_mode_switcher(self):
        lbl = tk.Label(self.inner, text="MODE", bg=BG, fg=DIM,
                       font=("Courier New",7))
        lbl.pack(anchor="w", pady=(0,6))

        row = tk.Frame(self.inner, bg=BG)
        row.pack(fill="x")

        self._mode_btns = {}
        modes = [
            ("screenshot", "⊡  SCREENSHOT"),
            ("clipboard",  "⊞  CLIPBOARD"),
            ("off",        "⊘  OFF"),
        ]
        for mode_key, mode_label in modes:
            cfg = MODE_CFG[mode_key]
            btn = tk.Button(
                row,
                text=mode_label,
                bg=BG2, fg=DIM,
                relief="flat",
                font=("Courier New", 8),
                cursor="hand2",
                padx=8, pady=5,
                bd=0,
                command=lambda m=mode_key: self._set_mode(m)
            )
            btn.pack(side="left", padx=(0,4))
            self._mode_btns[mode_key] = btn

        self._highlight_mode_btn()

    def _toggle_auto_scan(self):
        self.auto_scan = not self.auto_scan
        self._refresh_panel()

    def _manual_scan(self):
        if not self.is_thinking:
            threading.Thread(target=self._run_scan, daemon=True).start()

    def _highlight_mode_btn(self):
        for key, btn in self._mode_btns.items():
            if key == self.mode:
                cfg = MODE_CFG[key]
                btn.config(bg=cfg["color"], fg=BG,
                           relief="flat")
            else:
                btn.config(bg=BG2, fg=DIM, relief="flat")

    def _set_mode(self, new_mode):
        old_mode = self.mode
        self.mode = new_mode
        
        if new_mode == "off":
            self.root.destroy()
            sys.exit(0)
            
        self._next_tick = 1   # trigger scan soon after switching
        self._last_clipboard = ""  # reset clipboard state

        labels = {
            "screenshot": "Taking screenshots every 20s...",
            "clipboard":  "Watching clipboard for copied text...",
            "off":        "Closing ARIA...",
        }
        self.status_var.set(labels[new_mode])
        self._highlight_mode_btn()


        if self.is_expanded:
            self._refresh_response()

    def _toggle_panel(self, e=None):
        self.is_expanded = not self.is_expanded
        if self.is_expanded:
            self._reposition_panel()
            self.panel.deiconify()
            self._refresh_panel()
        else:
            self.panel.withdraw()

    def _reposition_panel(self):
        if not hasattr(self, "panel"): return
        ox, oy = self.root.winfo_x(), self.root.winfo_y()
        sw = self.root.winfo_screenwidth()
        px = ox - 314 if ox > 360 else ox + 74
        self.panel.geometry(f"300x530+{px}+{oy}")

    def _refresh_panel(self):
        self._highlight_mode_btn()
        # Manage auto scan frame visibility
        for w in self.auto_scan_frame.winfo_children(): w.destroy()
        if self.mode == "screenshot":
            self.auto_scan_frame.pack(fill="x", pady=(0, 8), before=self.resp_frame.master.winfo_children()[3]) # Right after the mode switcher separator
            tk.Label(self.auto_scan_frame, text="AUTO-SCAN", bg=BG, fg=DIM, font=("Courier New", 7)).pack(side="left")
            bg_color = TEAL if self.auto_scan else BG2
            fg_color = BG if self.auto_scan else DIM
            text_val = "ON" if self.auto_scan else "OFF"
            tk.Button(self.auto_scan_frame, text=text_val, bg=bg_color, fg=fg_color, relief="flat", font=("Courier New", 7), cursor="hand2", command=self._toggle_auto_scan).pack(side="left", padx=8)
            tk.Button(self.auto_scan_frame, text="SCAN NOW", bg=BG2, fg=TEAL, relief="flat", font=("Courier New", 7), cursor="hand2", command=self._manual_scan).pack(side="right")
        else:
            self.auto_scan_frame.pack_forget()

        self._refresh_response()
        self._refresh_history()

    def _refresh_response(self):
        for w in self.resp_frame.winfo_children(): w.destroy()

        if self.mode == "off":
            tk.Label(self.resp_frame, text="⊘  ARIA is off.", bg=BG, fg=DIM,
                     font=("Courier New", 10)).pack(anchor="w")
            return

        if self.is_thinking:
            tk.Label(self.resp_frame, text="⟳  Analyzing...", bg=BG, fg=PURPLE,
                     font=("Courier New", 10)).pack(anchor="w")
            return

        if self.current_response and self.current_response["type"] != "idle":
            r   = self.current_response
            cfg = TYPE_CFG[r["type"]]
            hdr = tk.Frame(self.resp_frame, bg=BG)
            hdr.pack(fill="x")
            tk.Label(hdr, text=f"{cfg['icon']}  {cfg['label']}",
                     bg=BG, fg=cfg["color"],
                     font=("Courier New",8,"bold")).pack(side="left")
            if r.get("context"):
                tk.Label(hdr, text=r["context"].upper(), bg=BG, fg=DIM,
                         font=("Courier New",7)).pack(side="right")
            tk.Label(self.resp_frame, text=r["message"], bg=BG, fg=TEXT,
                     font=("Courier New",10), wraplength=268,
                     justify="left").pack(anchor="w", pady=(6,0))
        else:
            tk.Label(self.resp_frame, text="Nothing notable yet.",
                     bg=BG, fg=DIM, font=("Courier New",9)).pack(anchor="w")

    def _refresh_history(self):
        for w in self.history_frame.winfo_children(): w.destroy()
        for item in self.history[:4]:
            cfg = TYPE_CFG[item["type"]]
            row = tk.Frame(self.history_frame, bg=BG)
            row.pack(fill="x", pady=1)
            src = "📷" if item.get("source") == "screenshot" else "📋"
            tk.Label(row, text=src, bg=BG, fg=DIM,
                     font=("Courier New",7), width=2).pack(side="left")
            tk.Label(row, text=cfg["icon"], bg=BG, fg=cfg["color"],
                     font=("Courier New",8), width=2).pack(side="left")
            txt = item["message"][:40] + ("…" if len(item["message"]) > 40 else "")
            tk.Label(row, text=txt, bg=BG, fg=DIM,
                     font=("Courier New",7), anchor="w").pack(side="left")

    # ── CHAT ──────────────────────────────────────────────────────────────────
    def _on_chat_send(self, e=None):
        text = self.chat_var.get().strip()
        if not text or self.is_thinking:
            return
        
        self.chat_var.set("")
        self.is_thinking = True
        self.status_var.set("Thinking about your question...")
        if self.is_expanded:
            self._refresh_panel()
            
        threading.Thread(target=self._run_chat, args=(text,), daemon=True).start()

    def _run_chat(self, user_text):
        try:
            img = ImageGrab.grab()
            img = img.resize((1280, int(img.height * 1280 / img.width)), Image.LANCZOS)
            
            if "clipboard" in self.mode:
                prompt = f"The user asked: {user_text}\nClipboard context: {self._last_clipboard}"
                result = self.model.generate_content([prompt])
            else:
                prompt = f"The user asked: {user_text}\nAnswer based on the attached screenshot if relevant."
                result = self.model.generate_content([prompt, img])
                
            self.current_response = {
                "type": "answer",
                "message": result.text.strip()[:200],
                "context": "chat"
            }
            
            parsed = self.current_response.copy()
            parsed["source"] = "chat"
            parsed["time"] = datetime.now().strftime("%H:%M")
            self.history.insert(0, parsed)
            self.history = self.history[:8]
            
            self.root.after(0, self._on_response)
        except Exception as ex:
            self.current_response = {
                "type": "alert",
                "message": f"Chat Error: {str(ex)[:70]}",
                "context": "error"
            }
            self.root.after(0, self._on_response)
        finally:
            self.is_thinking = False
            self.root.after(0, lambda: self.status_var.set("Chat complete."))
            if self.is_expanded:
                self.root.after(0, self._refresh_panel)

    # ── ANALYSIS ──────────────────────────────────────────────────────────────
    def _run_scan(self):
        if self.mode == "off" or self.is_thinking:
            return
        self.is_thinking = True
        self.root.after(0, lambda: self.status_var.set(
            "Scanning screen..." if self.mode == "screenshot" else "Reading clipboard..."
        ))

        try:
            if self.mode == "screenshot":
                parsed = self._analyze_screenshot()
            elif self.mode == "clipboard":
                parsed = self._analyze_clipboard()
            else:
                return

            if parsed:
                self.current_response = parsed
                if parsed["type"] != "idle":
                    parsed["source"] = self.mode
                    parsed["time"]   = datetime.now().strftime("%H:%M")
                    self.history.insert(0, parsed)
                    self.history = self.history[:8]
                self.root.after(0, self._on_response)

        except Exception as ex:
            self.current_response = {
                "type": "alert",
                "message": f"Error: {str(ex)[:70]}",
                "context": "error"
            }
            self.root.after(0, self._on_response)
        finally:
            self.is_thinking = False

    def _analyze_screenshot(self):
        img = ImageGrab.grab()
        img = img.resize((1280, int(img.height * 1280 / img.width)), Image.LANCZOS)
        result = self.model.generate_content(
            [SCREENSHOT_PROMPT + "\n\nWhat's on the screen?", img],
            generation_config={"max_output_tokens": 200, "temperature": 0.3}
        )
        return self._parse(result.text)

    def _analyze_clipboard(self):
        try:
            clip = self.root.clipboard_get()
        except Exception:
            clip = ""

        clip = clip.strip()
        if not clip or clip == self._last_clipboard or len(clip) < 10:
            return {"type": "idle", "message": "", "context": "idle"}

        self._last_clipboard = clip
        short = clip[:3000]  # limit tokens
        result = self.model.generate_content(
            [CLIPBOARD_PROMPT, f"Clipboard content:\n\n{short}"],
            generation_config={"max_output_tokens": 200, "temperature": 0.3}
        )
        return self._parse(result.text)

    def _parse(self, raw):
        try:
            clean = raw.strip().replace("```json","").replace("```","").strip()
            return json.loads(clean)
        except Exception:
            return {"type": "idle", "message": "", "context": "unknown"}

    def _on_response(self):
        r = self.current_response
        if r and r["type"] != "idle":
            cfg = TYPE_CFG[r["type"]]
            self.status_var.set(f"{cfg['icon']} {r['message'][:55]}")
        else:
            labels = {
                "screenshot": "Watching your screen...",
                "clipboard":  "Watching clipboard...",
                "off":        "ARIA is paused.",
            }
            self.status_var.set(labels.get(self.mode, ""))
        if self.is_expanded:
            self._refresh_panel()

    # ── TICK LOOP ─────────────────────────────────────────────────────────────
    def _tick_loop(self):
        if self.mode != "off":
            self._next_tick -= 1
            interval = CLIPBOARD_INTERVAL if self.mode == "clipboard" else SCREENSHOT_INTERVAL
            if self.is_expanded:
                if self.mode == "screenshot" and not self.auto_scan:
                    self.next_var.set("Auto-scan disabled")
                else:
                    self.next_var.set(f"Next check in {max(0, self._next_tick)}s")
            
            if self._next_tick <= 0:
                self._next_tick = interval
                if not self.is_thinking:
                    if self.mode == "clipboard" or (self.mode == "screenshot" and self.auto_scan):
                        threading.Thread(target=self._run_scan, daemon=True).start()
        else:
            self.next_var.set("") if self.is_expanded else None

        self.root.after(1000, self._tick_loop)

    def run(self):
        self.root.mainloop()


# ── ENTRY ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not API_KEY or API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        print("=" * 55)
        print("  ARIA — Setup Required")
        print("=" * 55)
        print()
        print("  1. Go to: https://aistudio.google.com/app/apikey")
        print("  2. Click 'Create API key' (FREE, no card needed)")
        print("  3. Open aria.py in Notepad")
        print("  4. Replace YOUR_GEMINI_API_KEY_HERE with your key")
        print("=" * 55)
        input("\n  Press Enter to exit...")
        sys.exit(1)

    app = ARIAApp()
    app.run()
