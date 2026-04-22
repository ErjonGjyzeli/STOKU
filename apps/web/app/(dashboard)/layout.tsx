import { requireSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { StoreProvider } from '@/lib/context/store-context';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <StoreProvider initialStoreId={session.activeStoreId}>
      <div className="stoku-app">
        <Sidebar
          role={session.profile.role}
          email={session.email}
          fullName={session.profile.full_name}
        />
        <div className="stoku-main">
          <Topbar stores={session.stores} />
          <div className="stoku-content">{children}</div>
        </div>
      </div>
    </StoreProvider>
  );
}
