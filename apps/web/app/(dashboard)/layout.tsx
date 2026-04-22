import { requireSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { StoreProvider } from '@/lib/context/store-context';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <StoreProvider>
      <div className="flex min-h-screen">
        <Sidebar role={session.profile.role} />
        <div className="flex flex-1 flex-col">
          <Topbar
            email={session.email}
            fullName={session.profile.full_name}
            role={session.profile.role}
            stores={session.stores}
          />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}
