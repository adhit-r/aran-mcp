import { ReactNode } from 'react';
import { Home, Server, Bell, Settings } from 'lucide-react';


const navItems = [
  { label: 'Dashboard', icon: <Home />, href: '/' },
  { label: 'Servers', icon: <Server />, href: '/servers' },
  { label: 'Alerts', icon: <Bell />, href: '/alerts' },
  { label: 'Settings', icon: <Settings />, href: '/settings' },
];

export function NavBar() {
  // Tailwind utility classes for sidebar while PandaCSS is being set up
  return (
    <nav className="flex flex-col gap-4 bg-neutral-950 text-neutral-100 px-6 py-8 min-h-screen border-r border-neutral-800 w-[220px] fixed top-0 left-0 z-40">
  <div className="font-bold text-2xl mb-12 tracking-tight text-amber-400">
    MCP Sentinel
  </div>
  <ul className="flex flex-col gap-2">
    {navItems.map(item => (
      <li key={item.label}>
        <a
          href={item.href}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-100 hover:bg-amber-500 hover:text-neutral-900 transition-colors font-medium"
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
