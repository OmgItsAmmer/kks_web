import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  Star,
  Sun,
  Tags,
  Layers,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from '@/lib/theme';
import { NavLink, Outlet, useLocation } from 'react-router';
import { NotificationsBell } from '@/components/NotificationsPanel';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay';
import { useAuth } from '@/lib/auth';
import type { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  permission: Permission;
}

const NAV: { heading?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, permission: 'dashboard.view' }] },
  {
    heading: 'Sales',
    items: [
      { to: '/orders', label: 'Orders', icon: <ShoppingCart className="h-5 w-5" />, permission: 'orders.view' },
      { to: '/customers', label: 'Customers', icon: <Users className="h-5 w-5" />, permission: 'customers.view' },
      { to: '/reviews', label: 'Reviews', icon: <Star className="h-5 w-5" />, permission: 'reviews.view' },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: <Package className="h-5 w-5" />, permission: 'catalog.view' },
      { to: '/categories', label: 'Categories & brands', icon: <Tags className="h-5 w-5" />, permission: 'catalog.view' },
      { to: '/collections', label: 'Collections', icon: <Layers className="h-5 w-5" />, permission: 'catalog.view' },
    ],
  },
  {
    heading: 'Stock',
    items: [
      { to: '/inventory', label: 'Stock levels', icon: <Boxes className="h-5 w-5" />, permission: 'inventory.view' },
      { to: '/receipts', label: 'Stock receipts', icon: <ClipboardList className="h-5 w-5" />, permission: 'inventory.view' },
    ],
  },
  {
    heading: 'Business',
    items: [
      { to: '/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" />, permission: 'reports.view' },
      { to: '/audit', label: 'Activity log', icon: <ScrollText className="h-5 w-5" />, permission: 'audit.view' },
      { to: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, permission: 'settings.manage' },
    ],
  },
];

export function AppShell() {
  const { me, signOut, can } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const sidebar = (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-4">
      <div className="flex items-center gap-2 px-3 pb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">K</div>
        <div>
          <p className="text-base font-bold leading-tight">KKS Admin</p>
          <p className="text-xs text-muted">Online store</p>
        </div>
      </div>
      {NAV.map((group, i) => {
        const items = group.items.filter((it) => can(it.permission));
        if (items.length === 0) return null;
        return (
          <div key={i}>
            {group.heading && <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{group.heading}</p>}
            <ul className="space-y-0.5">
              {items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition-colors',
                        isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-soft',
                      )
                    }
                  >
                    {it.icon}
                    {it.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface lg:block no-print">{sidebar}</aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface shadow-xl">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur no-print">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Switch light or dark mode">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <NotificationsBell />
          <Menu>
            <MenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded px-2 py-1.5 hover:bg-soft">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {me?.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight">{me?.name}</span>
                  <span className="block text-xs capitalize text-muted">{me?.role}</span>
                </span>
              </button>
            </MenuTrigger>
            <MenuContent>
              <div className="px-3 py-2 text-xs text-muted">{me?.email}</div>
              <MenuItem onSelect={() => void signOut()}>
                <LogOut className="h-4 w-4" /> Sign out
              </MenuItem>
            </MenuContent>
          </Menu>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
