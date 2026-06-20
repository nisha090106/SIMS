import React, { useState, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { Package, Layers, IndianRupee, TrendingDown, AlertTriangle } from 'lucide-react';
import { warehouseAPI } from '../../../services/api';
import reportAPI from '../../../services/reportAPI';
import KpiCard from '../shared/KpiCard';
import ReportTable from '../shared/ReportTable';
import FilterBar, { FilterField } from '../shared/FilterBar';
import { downloadBlob, fmtCurrency, fmtNum, STATUS_PILL } from '../reportUtils';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#f43f5e','#06b6d4','#84cc16','#e879f9'];

const STOCK_STATUS_MAP = {
  in_stock:     { label: 'In Stock',     class: 'delivered' },
  low_stock:    { label: 'Low Stock',    class: 'pending'   },
  out_of_stock: { label: 'Out of Stock', class: 'cancelled' },
};

export default function InventoryTab() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [page,       setPage]       = useState(1);

  const [filters, setFilters] = useState({
    warehouseId: '', category: '', search: '', status: '',
    page: 1, limit: 15,
  });

  // Load warehouse list for filter dropdown
  useEffect(() => {
    warehouseAPI.getAll({ limit: 100 })
      .then(r => setWarehouses(r.data.data || r.data.warehouses || []))
      .catch(() => {});
  }, []);

  const fetch = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await reportAPI.getInventory({ ...filters, page: pageNum });
      setData(res.data.data);
    } catch (e) {
      console.error('Inventory report error', e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetch(1); setPage(1); }, []); // initial load

  const handleApply = () => { fetch(1); setPage(1); };

  const handlePageChange = (p) => { setPage(p); fetch(p); };

  const handleExport = async () => {
    try {
      const res = await reportAPI.exportReport('inventory', {
        warehouseId: filters.warehouseId,
        format: 'csv',
      });
      downloadBlob(res.data, `inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) {
      console.error('Export error', e);
    }
  };

  const f = (v) => `₹${Number(v || 0).toFixed(2)}`;

  // Category pie data
  const catData = data
    ? Object.entries(data.categoryBreakdown?.reduce((a, c) => { a[c.category] = c.value; return a; }, {}) || {})
        .map(([name, value]) => ({ name, value: Math.round(Number(value)) }))
        .sort((a, b) => b.value - a.value)
    : [];

  const barData = data?.categoryBreakdown?.slice(0, 8) || [];

  const columns = [
    { key: 'sku',          label: 'SKU',       render: v => <span className="mono">{v}</span> },
    { key: 'name',         label: 'Product' },
    { key: 'category',     label: 'Category' },
    { key: 'quantity',     label: 'Qty',        align: 'right', render: v => fmtNum(v) },
    { key: 'availableQty', label: 'Available',  align: 'right', render: v => fmtNum(v) },
    { key: 'unitPrice',    label: 'Unit Price',  align: 'right', render: v => f(v) },
    { key: 'costPrice',    label: 'Cost Price',  align: 'right', render: v => f(v) },
    { key: 'totalValue',   label: 'Total Value', align: 'right', render: v => f(v) },
    { key: 'reorderLevel', label: 'Reorder At',  align: 'right' },
    {
      key: 'stockStatus', label: 'Status',
      render: v => {
        const s = STOCK_STATUS_MAP[v] || { label: v, class: 'draft' };
        return <span className={`status-pill ${s.class}`}>{s.label}</span>;
      },
    },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'location',  label: 'Location', render: v => v || '—' },
  ];

  return (
    <>
      <FilterBar onApply={handleApply} onExport={handleExport} loading={loading}>
        <FilterField label="Warehouse">
          <select value={filters.warehouseId} onChange={e => setFilters(p => ({ ...p, warehouseId: e.target.value }))}>
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Category">
          <input
            placeholder="e.g. Electronics"
            value={filters.category}
            onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
          />
        </FilterField>
        <FilterField label="Search Product">
          <input
            placeholder="Product name…"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
          />
        </FilterField>
        <FilterField label="Stock Status">
          <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </FilterField>
      </FilterBar>

      {/* KPI Cards */}
      <div className="reports-kpi-grid">
        <KpiCard icon={<Layers size={20}/>} label="Total SKUs"    color="blue"   loading={loading} value={fmtNum(data?.summary?.totalSkus)} />
        <KpiCard icon={<Package size={20}/>} label="Total Units"  color="green"  loading={loading} value={fmtNum(data?.summary?.totalUnits)} />
        <KpiCard icon={<IndianRupee size={20}/>} label="Total Value (Sell)" color="purple" loading={loading}
          value={fmtCurrency(data?.summary?.totalValue)} sub="at selling price" />
        <KpiCard icon={<IndianRupee size={20}/>} label="Total Cost Basis"  color="cyan"  loading={loading}
          value={fmtCurrency(data?.summary?.totalCost)} sub="at cost price" />
        <KpiCard icon={<TrendingDown size={20}/>} label="Gross Margin" color="orange" loading={loading}
          value={fmtCurrency(data?.summary?.grossMarginValue)}
          sub={data?.summary?.totalValue > 0
            ? `${((data.summary.grossMarginValue / data.summary.totalValue) * 100).toFixed(1)}%`
            : undefined} />
      </div>

      {/* Charts */}
      {(catData.length > 0 || barData.length > 0) && (
        <div className="reports-chart-row">
          {/* Pie: value by category */}
          <div className="reports-chart-card">
            <h3>Value by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Value']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar: units by category */}
          <div className="reports-chart-card">
            <h3>Units by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [fmtNum(v), 'Units']} />
                <Bar dataKey="units" fill="#3b82f6" name="Units" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ReportTable
        title="Inventory Items"
        columns={columns}
        rows={data?.items || []}
        loading={loading}
        serverPage={data?.pagination?.page}
        serverPages={data?.pagination?.pages}
        serverTotal={data?.pagination?.total}
        onPageChange={handlePageChange}
      />
    </>
  );
}
