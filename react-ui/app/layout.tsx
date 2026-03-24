import type { Metadata } from "next";
import { ARIAFloating } from "@/components/ui/aria-floating";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARIA - Screen Intelligence",
  description: "AI-powered screen assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ARIAFloating
          onScreenshot={async () => {
            const res = await fetch("/api/aria/screenshot");
            return res.json();
          }}
          onClipboard={async (text: string) => {
            const res = await fetch("/api/aria/clipboard", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text }),
            });
            return res.json();
          }}
        />
      </body>
    </html>
  );
}
