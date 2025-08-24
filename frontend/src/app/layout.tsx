import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClientLayout } from './client-layout';
import { Header } from '@/components/header';
import { NavBar } from '@/components/nav';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth-context';
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
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased`}>
        <AuthProvider>
          <ClientLayout>
            <div className="relative min-h-screen flex">
              <NavBar />
              <div className="flex flex-col flex-1 ml-[220px] min-h-screen">
                <Header />
                <main className="flex-1">
                  <div className="container py-6">
                    {children}
                  </div>
                </main>
                <footer className="border-t py-6 md:py-0">
                  <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                      MCP Sentinel &copy; {new Date().getFullYear()}
                    </p>
                  </div>
                </footer>
              </div>
            </div>
            <Toaster position="top-right" richColors />
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
