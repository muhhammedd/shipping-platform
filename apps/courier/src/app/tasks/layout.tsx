'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/queries';
import { Home, Wallet, LogOut, Menu, X, Truck } from 'lucide-react';
import { useState } from 'react';

const bottomNavItems = [
  { href: '/tasks', icon: Home, label: 'المهام' },
  { href: '/cod/summary', icon: Wallet, label: 'COD' },
];

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const logoutMutation = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logoutMutation.mutate();
    router.push('/login');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const todayDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-orange-500" />
          <span className="font-bold text-sm">{todayDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-orange-500 text-white text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 top-14 z-30 bg-background border-t p-4 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-orange-500 text-white text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="destructive" className="w-full h-12 text-lg" onClick={handleLogout}>
            <LogOut className="ms-2 h-5 w-5" />
            تسجيل الخروج
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="container max-w-lg mx-auto p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 px-6 min-h-[56px] rounded-xl mx-2 transition-colors',
                  isActive
                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-600'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-6 w-6', isActive && 'text-orange-500')} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
