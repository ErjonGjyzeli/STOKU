import { requireSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AppShell } from '@/components/layout/app-shell';
import { SidebarProvider } from '@/lib/context/sidebar-context';
import { StoreProvider } from '@/lib/context/store-context';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createClient();

  // Count badge per voce sidebar — globali (non-scoped). Fetch leggero
  // via head count.
  const scopeStoreId = session.isExplicitAllScope ? null : session.activeStoreId;

  const ordersOpenQuery = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['draft', 'confirmed', 'paid', 'shipped']);
  if (scopeStoreId) ordersOpenQuery.eq('store_id', scopeStoreId);

  const transfersOpenQuery = supabase
    .from('stock_transfers')
    .select('id', { count: 'exact', head: true })
    .in('status', ['draft', 'in_transit']);
  if (scopeStoreId) {
    transfersOpenQuery.or(`from_store_id.eq.${scopeStoreId},to_store_id.eq.${scopeStoreId}`);
  }

  const [productsCountRes, ordersCountRes, customersCountRes, transfersCountRes] =
    await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      ordersOpenQuery,
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      transfersOpenQuery,
    ]);

  const navCounts = {
    products: productsCountRes.count ?? 0,
    orders: ordersCountRes.count ?? 0,
    customers: customersCountRes.count ?? 0,
    transfers: transfersCountRes.count ?? 0,
  };

  return (
    <StoreProvider initialStoreId={session.activeStoreId}>
      <SidebarProvider>
        <AppShell>
          <Sidebar
            role={session.profile.role}
            email={session.email}
            fullName={session.profile.full_name}
            counts={navCounts}
          />
          <div className="stoku-main">
            <Topbar stores={session.stores} />
            <div className="stoku-content">{children}</div>
          </div>
        </AppShell>
      </SidebarProvider>
    </StoreProvider>
  );
}
