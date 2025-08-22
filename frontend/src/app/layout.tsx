'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { QueryProvider } from '@/components/providers/query-provider';
import { cn } from '@/lib/utils';
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Aran MCP Sentinel',
  description: 'Monitor and manage MCP servers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased',
        GeistSans.variable,
        GeistMono.variable
      )}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative flex min-h-screen flex-col">
              <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-backdrop/60">
                <div className="container flex h-14 items-center">
                  <div className="mr-4 flex">
                    <a className="mr-6 flex items-center space-x-2" href="/">
                      <span className="font-bold inline-block">Aran MCP Sentinel</span>
                    </a>
                  </div>
                  <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                      {/* Search bar can go here */}
                    </div>
                    <nav className="flex items-center">
                      <ThemeToggle />
                    </nav>
                  </div>
                </div>
              </header>
              <main className="flex-1">
                {children}
              </main>
              <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                  <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    MCP Sentinel &copy; {new Date().getFullYear()}
                  </p>
                </div>
              </footer>
            </div>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
