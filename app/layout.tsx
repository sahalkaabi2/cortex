import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Crypto Trading Experiment",
  description: "Compare LLM trading strategies vs Buy & Hold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
