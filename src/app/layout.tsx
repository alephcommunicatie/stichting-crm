import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RelatieCRM — Stichting Relatiebeheer",
  description: "Relatiebeheer voor stichtingen: contacten, pipeline, taken en rapportages.",
};

const THEME_INIT_SCRIPT = `(function(){
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
