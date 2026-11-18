import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETF Lens | Adeticket",
  description: "Compare ETF fees and dividend income scenarios.",
  icons: {
    icon: "/adeticket-logo.png",
    shortcut: "/adeticket-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
