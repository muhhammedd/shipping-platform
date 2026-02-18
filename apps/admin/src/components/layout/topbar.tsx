'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/queries';
import { ROLE_LABELS } from '@/lib/constants';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
 Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { LogOut, Settings, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

const pageNames: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/shipments': 'الشحنات',
  '/merchants': 'التجار',
  '/couriers': 'المندوبين',
  '/branches': 'الفروع',
  '/cod': 'الدفع عند الاستلام',
  '/pricing': 'التسعير',
  '/settings': 'الإعدادات',
};

export function Topbar() {
  const { user } = useAuthStore();
  const logoutMutation = useLogout();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get page name from path
  const getPageName = () => {
    const basePath = '/' + pathname.split('/')[1];
    return pageNames[basePath] || 'لوحة التحكم';
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-card border-b border-border">
      <div className="flex items-center justify-between h-full px-4">
        {/* Breadcrumb - Right side in RTL */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-lg font-semibold">
                {getPageName()}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Actions - Left side in RTL */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">تبديل السمة</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.role && ROLE_LABELS[user.role]?.ar}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex items-center">
                  <Settings className="ms-2 h-4 w-4" />
                  <span>الإعدادات</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/profile" className="flex items-center">
                  <User className="ms-2 h-4 w-4" />
                  <span>الملف الشخصي</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="ms-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
