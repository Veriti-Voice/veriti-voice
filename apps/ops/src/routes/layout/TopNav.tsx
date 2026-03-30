import { NavLink } from 'react-router';
import { LayoutDashboard, Phone, Mic, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/lab', label: 'Call Lab', icon: Mic },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/onboarding', label: 'Onboarding', icon: HelpCircle },
];

export function TopNav() {
  return (
    <nav className="hidden md:flex items-center justify-between px-6 h-14 bg-ironwood text-bone border-b border-ironwood/80">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-copper-clay flex items-center justify-center">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-base tracking-tight">Veriti Voice</span>
      </div>

      <div className="flex items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-deep-eucalypt text-bone'
                  : 'text-bone/70 hover:text-bone hover:bg-white/10'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-mist/20 text-sage-mist text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-sage-mist animate-pulse" />
          Live
        </div>
      </div>
    </nav>
  );
}
