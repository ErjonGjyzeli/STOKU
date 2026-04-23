import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { requireSession } from '@/lib/auth/session';
import {
  fetchInventory,
  fetchMovements,
  fetchSales,
  type ReportTab,
} from '../queries';

function resolveTab(raw: string | null): ReportTab {
  if (raw === 'inventory') return 'inventory';
  if (raw === 'movements') return 'movements';
  return 'sales';
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const head = headers.map(csvEscape).join(',');
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h])).join(','))
    .join('\n');
  return `${head}\n${body}\n`;
}

export async function GET(req: Request) {
  await requireSession();
  const url = new URL(req.url);
  const tab = resolveTab(url.searchParams.get('tab'));
  const format = url.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const filters = {
    tab,
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    store: url.searchParams.get('store') ? Number(url.searchParams.get('store')) : null,
  };

  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];
  let sheetName = 'Report';
  const stamp = new Date().toISOString().slice(0, 10);
  const basename = `stoku-${tab}-${stamp}`;

  if (tab === 'sales') {
    const data = await fetchSales(filters);
    sheetName = 'Vendite';
    headers = ['data', 'numero', 'status', 'cliente', 'store', 'subtotale', 'iva', 'totale', 'valuta'];
    rows = data.map((r) => ({
      data: r.created_at?.slice(0, 10) ?? '',
      numero: r.order_number,
      status: r.status,
      cliente: r.customer_name ?? 'Vendita banco',
      store: r.store_code ?? '',
      subtotale: r.subtotal,
      iva: r.tax_amount,
      totale: r.total,
      valuta: r.currency ?? 'EUR',
    }));
  } else if (tab === 'inventory') {
    const data = await fetchInventory(filters);
    sheetName = 'Inventario';
    headers = ['store', 'sku', 'nome', 'quantita', 'prenotato', 'disponibile', 'soglia'];
    rows = data.map((r) => ({
      store: r.store_code ?? '',
      sku: r.sku,
      nome: r.name,
      quantita: r.quantity,
      prenotato: r.reserved_quantity,
      disponibile: r.available,
      soglia: r.min_stock ?? 0,
    }));
  } else {
    const data = await fetchMovements(filters);
    sheetName = 'Movimenti';
    headers = [
      'data',
      'causale',
      'sku',
      'prodotto',
      'store',
      'delta',
      'ordine',
      'trasferimento',
    ];
    rows = data.map((r) => ({
      data: r.created_at ?? '',
      causale: r.reason,
      sku: r.sku ?? '',
      prodotto: r.product_name ?? '',
      store: r.store_code ?? '',
      delta: r.change,
      ordine: r.reference_order_number ?? '',
      trasferimento: r.transfer_number ?? '',
    }));
  }

  if (format === 'csv') {
    const csv = rowsToCsv(rows, headers);
    return new NextResponse('﻿' + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${basename}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  // xlsx
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${basename}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
