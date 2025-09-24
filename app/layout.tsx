import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Teacher Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-mono h-screen">{children}</body>
    </html>
  );
}
