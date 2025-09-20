import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClientLayout } from './client-layout';
import { Header } from '@/components/header';
import { NavBar } from '@/components/nav';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MCP Sentinel',
  description: 'Monitor and manage your MCP servers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
              <AuthProvider>
                <ClientLayout>
                  <div className="relative min-h-screen flex">
                    <NavBar />
                    <div className="flex flex-col flex-1 ml-[240px] min-h-screen pl-6">
                      <Header />
                      <main className="flex-1 p-6">
                        <div className="max-w-7xl mx-auto">
                          {children}
                        </div>
                      </main>
                      <footer className="glass-card border-t border-white/20 py-6 md:py-0 mx-6 mb-6 rounded-2xl">
                        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                          <p className="text-center text-sm leading-loose text-white/60 md:text-left">
                            MCP Sentinel &copy; {new Date().getFullYear()}
                          </p>
                        </div>
                      </footer>
                    </div>
                  </div>
                  <Toaster position="top-right" richColors />
                </ClientLayout>
              </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
