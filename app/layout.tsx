import type { Metadata } from "next";
import AppNav from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CranBania — AI-ready Kanban",
  description:
    "Kanban board built for humans and AI agents. REST API + MCP tools included.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
