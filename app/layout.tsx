import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas CRM dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface font-body text-on-surface">
        <Toaster
          position="top-right"
          theme="dark"
          closeButton
          visibleToasts={4}
          gap={12}
          offset={{ top: 18, right: 18 }}
          mobileOffset={{ top: 76, right: 16, left: 16 }}
          toastOptions={{
            duration: 4200,
            classNames: {
              toast: "atlas-toast",
              title: "atlas-toast-title",
              description: "atlas-toast-description",
              content: "atlas-toast-content",
              icon: "atlas-toast-icon",
              closeButton: "atlas-toast-close",
              success: "atlas-toast-success",
              error: "atlas-toast-error",
              warning: "atlas-toast-warning",
              info: "atlas-toast-info",
              loading: "atlas-toast-loading",
              actionButton: "atlas-toast-action",
              cancelButton: "atlas-toast-cancel",
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}
