import { NavLink } from 'react-router';
import { LayoutDashboard, Phone, Mic, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/lab', label: 'Lab', icon: Mic, accent: true },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/onboarding', label: 'Setup', icon: HelpCircle },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-ironwood border-t border-white/10 px-2 pb-safe">
      {navItems.map(({ to, label, icon: Icon, accent }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 rounded-lg text-[11px] font-medium transition-colors',
              accent && !isActive && 'text-copper-clay',
              accent && isActive && 'text-copper-clay',
              !accent && isActive && 'text-bone',
              !accent && !isActive && 'text-bone/50'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
                  accent && 'bg-copper-clay text-white',
                  !accent && isActive && 'bg-deep-eucalypt/30',
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
