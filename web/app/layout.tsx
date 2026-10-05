import type { Metadata } from "next";
import "./design/tokens.css";
import "./design/mock.css";

export const metadata: Metadata = {
  title: { default: "LSAT Prep", template: "%s · LSAT Prep" },
  description: "Practise on LSAT-style questions, sorted by type, with your accuracy tracked.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* The design tokens name the family "Inter", so it is loaded by name rather than through next/font. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
