import { Outlet } from 'react-router';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-bone">
      <TopNav />
      <main className="pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
