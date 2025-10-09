import { ReactNode } from 'react';
import { Home, Server, Bell, Settings, Palette, Shield, LogOut } from 'lucide-react';
import { Logo, LogoUltraBrutal } from '@/components/logo';
import { useAuth } from '@/contexts/auth-context';

const navItems = [
  { label: 'Dashboard', icon: <Home />, href: '/dashboard' },
  { label: 'Servers', icon: <Server />, href: '/servers' },
  { label: 'Security', icon: <Shield />, href: '/security' },
  { label: 'Alerts', icon: <Bell />, href: '/alerts' },
  { label: 'Design System', icon: <Palette />, href: '/design-system' },
  { label: 'Settings', icon: <Settings />, href: '/settings' },
];

export function NavBar() {
  const { user, logout } = useAuth();

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
          <div className="w-10 h-10 border-2 border-aran-black shadow-brutal rounded-full bg-aran-orange flex items-center justify-center">
            <span className="text-aran-white font-bold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-aran-black text-sm">{user?.name || 'Admin'}</div>
            <div className="text-xs text-aran-gray-600">{user?.email || 'admin@mcp-sentinel.local'}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-aran-gray-100 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-aran-gray-600" />
          </button>
        </div>
      </div>
    </nav>
  );
}