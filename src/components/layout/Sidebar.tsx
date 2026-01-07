import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Flag,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Brain,
  BarChart3,
  FileText,
  Users,
  Settings,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentAdmin } from '@/data/mockData';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'DASHBOARD & MONITORING',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Flag, label: 'Flagged Claims', href: '/flagged-claims' },
      { icon: Search, label: 'Investigations', href: '/investigations' },
    ],
  },
  {
    title: 'FRAUD RULES & INTELLIGENCE',
    items: [
      { icon: SlidersHorizontal, label: 'Fraud Rules Engine', href: '/' },
      { icon: TrendingUp, label: 'Rule Performance', href: '/rule-performance' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { icon: BarChart3, label: 'Fraud Analytics', href: '/fraud-analytics' },
      { icon: FileText, label: 'Reports', href: '/reports' },
    ],
  },
  {
    title: 'SYSTEM & ADMIN',
    items: [
      { icon: Users, label: 'Users & Roles', href: '/users' },
      { icon: Settings, label: 'System Settings', href: '/settings' },
      { icon: History, label: 'Audit Logs', href: '/audit-logs' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-lg">I</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-semibold text-foreground">Insure Assist</h1>
            <p className="text-xs text-muted-foreground">ADMIN PANEL</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navigation.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <p className="px-4 mb-2 text-xs font-semibold text-sidebar-section tracking-wide">
                {section.title}
              </p>
            )}
            <ul className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                const NavIcon = item.icon;

                const linkContent = (
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                    )}
                  >
                    <NavIcon className={cn('w-5 h-5 shrink-0', isActive && 'text-sidebar-primary')} />
                    {!collapsed && <span className="animate-fade-in">{item.label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <li key={item.href}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                }

                return <li key={item.href}>{linkContent}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {currentAdmin.initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-foreground truncate">{currentAdmin.name}</p>
              <p className="text-xs text-sidebar-primary capitalize">
                {currentAdmin.role.replace('_', ' ')}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>
    </aside>
  );
}
