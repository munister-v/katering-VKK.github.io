import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, CheckCircle, Clock, X, ChevronDown, ChevronRight, Search, Trash2 } from 'lucide-react';

export interface Order {
  id: string;
  date: string;
  customer: { name: string; phone: string; email?: string; city?: string; address?: string; comment?: string };
  items: { productId: number; name: string; price: string; qty: number }[];
  total: string;
  status: OrderStatus;
}

export type OrderStatus = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: 'Нове', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-4 h-4" /> },
  processing: { label: 'В обробці', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Package className="w-4 h-4" /> },
  shipped: { label: 'Відправлено', color: 'bg-violet-100 text-violet-800 border-violet-200', icon: <Truck className="w-4 h-4" /> },
  delivered: { label: 'Доставлено', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'Скасовано', color: 'bg-red-100 text-red-800 border-red-200', icon: <X className="w-4 h-4" /> },
};

const ORDERS_KEY = 'lumu_admin_orders';
const STATUS_ORDER: OrderStatus[] = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];

function loadOrders(): Order[] {
  try {
    const s = localStorage.getItem(ORDERS_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>(loadOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => { saveOrders(orders); }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.id.includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    STATUS_ORDER.forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });
    return counts;
  }, [orders]);

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const deleteOrder = (id: string) => {
    if (confirm('Видалити замовлення?')) {
      setOrders(prev => prev.filter(o => o.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const addDemoOrder = () => {
    const id = 'ORD-' + Date.now().toString(36).toUpperCase();
    const newOrder: Order = {
      id,
      date: new Date().toISOString(),
      customer: { name: 'Новий клієнт', phone: '+380991234567', city: 'Ірпінь' },
      items: [{ productId: 1, name: 'Тестовий товар', price: '100 ₴', qty: 1 }],
      total: '100 ₴',
      status: 'new',
    };
    setOrders(prev => [newOrder, ...prev]);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук замовлень..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={addDemoOrder}
          className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800"
        >
          + Додати замовлення
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUS_ORDER] as const).map(s => {
          const cfg = s === 'all' ? { label: 'Всі', color: 'bg-gray-100 text-gray-700' } : STATUS_CONFIG[s];
          const count = statusCounts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${statusFilter === s ? 'ring-2 ring-violet-500 ring-offset-1' : ''} ${cfg.color}`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{orders.length === 0 ? 'Замовлень поки немає' : 'Нічого не знайдено'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status];
            const isOpen = expandedId === order.id;
            return (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{order.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{order.customer.name} &middot; {order.customer.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{order.total}</p>
                    <p className="text-xs text-gray-400">{new Date(order.date).toLocaleDateString('uk-UA')}</p>
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">{'Клієнт'}</p>
                            <p className="text-sm">{order.customer.name}</p>
                            <p className="text-sm text-gray-500">{order.customer.phone}</p>
                            {order.customer.email && <p className="text-sm text-gray-500">{order.customer.email}</p>}
                            {order.customer.city && <p className="text-sm text-gray-500">{order.customer.city}</p>}
                            {order.customer.address && <p className="text-sm text-gray-500">{order.customer.address}</p>}
                            {order.customer.comment && <p className="text-sm text-gray-400 italic mt-1">{order.customer.comment}</p>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">{'Товари'}</p>
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm py-0.5">
                                <span>{item.name} &times; {item.qty}</span>
                                <span className="text-gray-500">{item.price}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold border-t border-gray-100 mt-2 pt-2">
                              <span>{'Разом'}</span>
                              <span>{order.total}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 mr-2">{'Змінити статус:'}</span>
                          {STATUS_ORDER.map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(order.id, s)}
                              disabled={order.status === s}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${order.status === s ? 'ring-2 ring-violet-500 opacity-100' : 'opacity-60 hover:opacity-100'} ${STATUS_CONFIG[s].color}`}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                            title="Видалити"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
