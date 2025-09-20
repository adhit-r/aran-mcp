import { ReactNode } from 'react';
import { Home, Server, Bell, Settings, Palette } from 'lucide-react';


const navItems = [
  { label: 'Dashboard', icon: <Home />, href: '/' },
  { label: 'Servers', icon: <Server />, href: '/servers' },
  { label: 'Alerts', icon: <Bell />, href: '/alerts' },
  { label: 'Design System', icon: <Palette />, href: '/design-system' },
  { label: 'Settings', icon: <Settings />, href: '/settings' },
];

export function NavBar() {
  return (
    <nav className="flex flex-col gap-4 glass-nav px-6 py-8 min-h-screen w-[240px] fixed top-0 left-0 z-40">
      <div className="font-bold text-2xl mb-12 tracking-tight text-white/90">
        MCP Sentinel
      </div>
      <ul className="flex flex-col gap-3">
        {navItems.map(item => (
          <li key={item.label}>
            <a
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/80 hover:bg-white/15 hover:text-white transition-all duration-300 font-medium backdrop-blur-sm border border-white/10"
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
