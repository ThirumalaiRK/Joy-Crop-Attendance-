import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "JOY CORPORATE SOLUTIONS — JRM Enterprise HRMS & Biometric Attendance",
  description:
    "Joy Corporate Solutions Pvt. Ltd. — JRM Enterprise HRMS supporting Mantra MFS110 L1 Biometrics, Real-Time Working Hours Engine, Reception Kiosk, and Multi-Branch HR Management.",
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
