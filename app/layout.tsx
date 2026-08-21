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
          expand
          visibleToasts={4}
          gap={12}
          offset={{ top: 18, right: 18 }}
          mobileOffset={{ top: 76, right: 16, left: 16 }}
          toastOptions={{
            duration: 4200,
            unstyled: true,
            classNames: {
              toast:
                "flex min-h-[68px] w-[min(390px,calc(100vw-32px))] items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-high p-4 pr-12 text-on-surface shadow-ambient",
              title: "text-sm font-bold leading-snug text-on-surface",
              description:
                "mt-1 text-xs leading-relaxed text-on-surface-variant",
              content: "min-w-0 flex-1",
              icon: "shrink-0 text-primary-light",
              closeButton:
                "absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-default)] bg-surface-container-lowest text-on-surface-muted transition hover:text-on-surface",
              success: "border-l-4 border-l-tertiary-light",
              error: "border-l-4 border-l-error-light",
              warning: "border-l-4 border-l-warning-light",
              info: "border-l-4 border-l-primary-light",
              loading: "border-l-4 border-l-primary-light",
              actionButton:
                "h-9 rounded-[var(--radius-default)] bg-primary px-3 text-xs font-bold text-on-primary",
              cancelButton:
                "h-9 rounded-[var(--radius-default)] bg-surface-container-lowest px-3 text-xs font-bold text-on-surface-variant",
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}
