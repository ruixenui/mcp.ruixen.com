import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ruixen MCP — Generate Physics-Based UI Components",
  description:
    "Generate beautiful React components with spring physics and audio feedback. Powered by the Ruixen design system.",
  keywords: [
    "UI components",
    "React",
    "spring physics",
    "framer motion",
    "Tailwind CSS",
    "MCP",
    "AI",
  ],
  openGraph: {
    title: "Ruixen MCP — Generate Physics-Based UI Components",
    description:
      "Generate beautiful React components with spring physics and audio feedback.",
    url: "https://mcp.ruixen.com",
    siteName: "Ruixen MCP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruixen MCP — Generate Physics-Based UI Components",
    description:
      "Generate beautiful React components with spring physics and audio feedback.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
