'use client';

import { Header } from '@/components/header';
import { NavBar } from '@/components/nav';

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex">
      <NavBar />
      <div className="flex flex-col flex-1 ml-[240px] min-h-screen pl-6">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <footer className="aran-card border-t-2 border-aran-black py-6 md:py-0 mx-6 mb-6">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
            <p className="text-center text-sm leading-loose text-aran-gray-600 md:text-left">
              MCP Sentinel &copy; {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}





