import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";
export const metadata: Metadata = {
  title: "ForestWatch AI · Forest intelligence",
  description:
    "A sample forest monitoring command center for a healthier planet.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
