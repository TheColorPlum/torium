'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SidebarNav, SidebarNavItem, SidebarNavGroup, Button } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';

// Icons
function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Get page title based on pathname
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname === '/dashboard/links') return 'Links';
    if (pathname.startsWith('/dashboard/links/')) return 'Link Details';
    if (pathname === '/dashboard/analytics') return 'Analytics';
    if (pathname === '/dashboard/billing') return 'Billing';
    return 'Dashboard';
  };

  // Redirect to login if not authenticated
  if (!loading && !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-bg-secondary border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center border-b border-border">
          <a href="/dashboard" className="text-xl font-bold text-text-primary">
            Torium
          </a>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 px-3">
          <SidebarNav>
            <SidebarNavGroup>
              <SidebarNavItem
                href="/dashboard"
                icon={<HomeIcon />}
                active={pathname === '/dashboard'}
              >
                Overview
              </SidebarNavItem>
              <SidebarNavItem
                href="/dashboard/links"
                icon={<LinkIcon />}
                active={pathname === '/dashboard/links' || pathname.startsWith('/dashboard/links/')}
              >
                Links
              </SidebarNavItem>
              <SidebarNavItem
                href="/dashboard/analytics"
                icon={<ChartIcon />}
                active={pathname === '/dashboard/analytics'}
              >
                Analytics
              </SidebarNavItem>
            </SidebarNavGroup>

            <SidebarNavGroup title="Account">
              <SidebarNavItem
                href="/dashboard/billing"
                icon={<CreditCardIcon />}
                active={pathname === '/dashboard/billing'}
              >
                Billing
              </SidebarNavItem>
            </SidebarNavGroup>
          </SidebarNav>
        </div>

        {/* User section */}
        <div className="p-4 border-t border-border">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-bg-tertiary rounded-sm mb-1" />
                <div className="h-3 w-16 bg-bg-tertiary rounded-sm" />
              </div>
            </div>
          ) : user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-text-inverse text-sm font-medium">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {user.email}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {user.plan === 'pro' ? 'Pro plan' : 'Free plan'}
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleLogout}
              >
                <span className="flex items-center gap-2">
                  <LogoutIcon />
                  Sign out
                </span>
              </Button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-border bg-bg">
          <h1 className="text-lg font-semibold text-text-primary">
            {getPageTitle()}
          </h1>
        </header>

        {/* Content container */}
        <main className="flex-1 p-8 bg-bg-secondary overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
