'use client';

import { User, LogOut } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Temporarily disable auth context for testing
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo, LogoUltraBrutal } from '@/components/logo';

export function Header() {
  // Temporarily use demo user for testing
  const user = { name: 'Demo User', email: 'demo@example.com' };

  const handleLogout = async () => {
    console.log('Demo logout - no action needed');
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoUltraBrutal size="md" />
          <span className="font-display font-bold text-aran-black text-lg">MCP Sentinel</span>
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        <ThemeToggle />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded border-2 border-aran-black shadow-brutal">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-aran-orange text-aran-white rounded">{getUserInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 aran-card border-2 border-aran-black shadow-brutalLg" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-aran-black">{user.name}</p>
                  <p className="text-xs leading-none text-aran-gray-600">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-aran-gray-200" />
              <DropdownMenuItem asChild className="text-aran-black hover:bg-aran-gray-100 rounded">
                <Link href="/profile" className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-aran-gray-200" />
              <DropdownMenuItem onClick={handleLogout} className="text-aran-error hover:bg-aran-error/10 rounded">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
