import { ReactNode } from 'react';
import { Home, Server, Bell, Settings, Palette, Shield } from 'lucide-react';
import { Logo, LogoUltraBrutal } from '@/components/logo';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { label: 'Dashboard', icon: <Home />, href: '/dashboard' },
  { label: 'Servers', icon: <Server />, href: '/servers' },
  { label: 'Security', icon: <Shield />, href: '/security' },
  { label: 'Alerts', icon: <Bell />, href: '/alerts' },
  { label: 'Design System', icon: <Palette />, href: '/design-system' },
  { label: 'Settings', icon: <Settings />, href: '/settings' },
];

export function NavBar() {
  return (
    <nav className="flex flex-col gap-4 aran-nav px-6 py-8 min-h-screen w-[240px] fixed top-0 left-0 z-40">
      <div className="mb-12 flex items-center gap-3">
        <LogoUltraBrutal size="lg" />
        <div>
          <div className="font-display font-bold text-aran-black text-lg">MCP</div>
          <div className="font-display font-semibold text-aran-gray-600 text-sm">Sentinel</div>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {navItems.map(item => (
          <li key={item.label}>
            <a
              href={item.href}
              className="aran-nav-link flex items-center gap-3 px-4 py-3"
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
      
      {/* User Profile */}
      <div className="mt-auto pt-6 border-t-2 border-aran-black">
        <div className="flex items-center gap-3 px-4 py-3">
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-10 h-10 border-2 border-aran-black shadow-brutal",
                userButtonPopoverCard: "aran-card shadow-brutalLg",
                userButtonPopoverActionButton: "text-aran-black hover:bg-aran-gray-100",
                userButtonPopoverActionButtonText: "text-aran-black",
                userButtonPopoverFooter: "hidden"
              }
            }}
          />
        </div>
      </div>
    </nav>
  );
}