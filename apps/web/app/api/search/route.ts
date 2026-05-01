import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  await requireSession();
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ products: [], customers: [], orders: [] });
  }

  const supabase = await createClient();
  const p = `%${q}%`;

  const [productsRes, customersRes, ordersRes, staffRes, shelvesRes, storesRes] =
    await Promise.all([
      supabase
        .from('products')
        .select(
          'id, sku, name, vehicle_make, tire_width, tire_aspect, tire_diameter, category:product_categories(kind, slug)',
        )
        .or(`sku.ilike.${p},name.ilike.${p},vehicle_make.ilike.${p}`)
        .eq('is_active', true)
        .limit(8),

      supabase
        .from('customers')
        .select('id, code, name')
        .or(`name.ilike.${p},code.ilike.${p}`)
        .limit(5),

      supabase
        .from('orders')
        .select('id, order_number, status, customer:customers(name)')
        .ilike('order_number', p)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('staff_profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.${p},email.ilike.${p}`)
        .limit(4),

      supabase
        .from('shelves')
        .select('id, code, description, store:stores(code)')
        .or(`code.ilike.${p},description.ilike.${p}`)
        .eq('is_active', true)
        .limit(4),

      supabase
        .from('stores')
        .select('id, code, name')
        .or(`code.ilike.${p},name.ilike.${p}`)
        .eq('is_active', true)
        .limit(4),
    ]);

  return NextResponse.json({
    products: productsRes.data ?? [],
    customers: customersRes.data ?? [],
    orders: ordersRes.data ?? [],
    staff: staffRes.data ?? [],
    shelves: shelvesRes.data ?? [],
    stores: storesRes.data ?? [],
  });
}
