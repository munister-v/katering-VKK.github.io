import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { useProducts, parsePrice } from '../context/ProductsContext';
import { isValidEmail, isValidUAPhone, formatPhoneForSubmit } from '../utils/validation';
import { productDisplayName } from '../utils/productImport';

function formatPrice(n: number) {
  return n.toLocaleString('uk-UA') + ' ₴';
}

const DELIVERY_OPTIONS = [
  { id: 'self', label: 'Самовивіз' },
  { id: 'nova', label: 'Нова пошта' },
  { id: 'ukr', label: 'Укрпошта' },
  { id: 'region', label: 'Доставка по регіону' },
] as const;

interface FormData {
  name: string;
  phone: string;
  email: string;
  delivery: string;
  city: string;
  address: string;
  comment: string;
}

const initialForm: FormData = {
  name: '',
  phone: '',
  email: '',
  delivery: 'self',
  city: '',
  address: '',
  comment: '',
};

const ORDERS_KEY = 'lumu_admin_orders';

interface LocalOrder {
  id: string;
  date: string;
  customer: { name: string; phone: string; email?: string; city?: string; address?: string; comment?: string };
  items: { productId: number; name: string; price: string; qty: number }[];
  total: string;
  status: 'new';
}

function saveOrderLocally(order: LocalOrder): { ok: boolean; error?: string } {
  try {
    const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    existing.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(existing));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Помилка збереження' };
  }
}

export const CheckoutForm = ({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) => {
  const { cart } = useStore();
  const { products } = useProducts();
  const cartTotal = useMemo(() => {
    const total = cart.reduce((s, i) => {
      const p = products.find(x => x.id === i.product.id) || i.product;
      return s + parsePrice(p.price) * i.qty;
    }, 0);
    return formatPrice(total);
  }, [cart, products]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameInputRef.current?.focus(); }, []);

  const update = (k: keyof FormData, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = 'Введіть ім\'я';
    if (!form.phone.trim()) e.phone = 'Введіть телефон';
    else if (!isValidUAPhone(form.phone)) e.phone = 'Невірний формат (068 364 22 05 або +380 99 123 45 67)';
    if (!form.email.trim()) e.email = 'Введіть email';
    else if (!isValidEmail(form.email)) e.email = 'Невірний email';
    if (!form.city.trim()) e.city = 'Введіть місто';
    const isSelfPickup = form.delivery === 'self';
    if (!isSelfPickup && !form.address.trim()) e.address = 'Введіть адресу доставки';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      requestAnimationFrame(() => document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (cart.length === 0) {
      setErrors({ name: 'Кошик порожній. Додайте товари.' });
      return;
    }
    setLoading(true);
    const phone = formatPhoneForSubmit(form.phone);
    const orderItems = cart.map(({ product, qty }) => {
      const p = products.find(x => x.id === product.id) || product;
      return { productId: p.id, name: productDisplayName(p), price: p.price, qty };
    });
    const deliveryLabel = DELIVERY_OPTIONS.find(d => d.id === form.delivery)?.label ?? form.delivery;
    const order: LocalOrder = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      customer: {
        name: form.name.trim(),
        phone,
        email: form.email.trim() || undefined,
        city: form.city.trim() || undefined,
        address: form.delivery !== 'self' ? form.address.trim() : undefined,
        comment: form.comment.trim() || undefined,
      },
      items: orderItems,
      total: cartTotal,
      status: 'new',
    };
    const result = saveOrderLocally(order);
    setLoading(false);
    if (result.ok) onSuccess();
    else setErrors({ name: result.error || 'Помилка збереження. Спробуйте ще раз.' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full"
    >
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Назад до кошика">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold uppercase tracking-wider">Оформлення</h2>
          <p className="text-xs text-gray-500 mt-0.5">{cart.length} {cart.length === 1 ? 'товар' : 'товарів'} · {cartTotal}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <div>
          <label htmlFor="checkout-name" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Ім'я *</label>
          <input
            id="checkout-name"
            ref={nameInputRef}
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-black/20`}
            placeholder="Іван Петренко"
            autoComplete="name"
          />
          {errors.name && <p data-error className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="checkout-phone" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Телефон *</label>
          <input
            id="checkout-phone"
            type="tel"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-black/20`}
            placeholder="099 123 45 67"
            autoComplete="tel"
          />
          {errors.phone && <p data-error className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="checkout-email" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email *</label>
          <input
            id="checkout-email"
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-black/20`}
            placeholder="email@example.com"
            autoComplete="email"
          />
          {errors.email && <p data-error className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Спосіб доставки *</label>
          <div className="grid grid-cols-2 gap-2">
            {DELIVERY_OPTIONS.map(d => (
              <label
                key={d.id}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                  form.delivery === d.id ? 'border-black bg-black/5 ring-2 ring-black/20' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  value={d.id}
                  checked={form.delivery === d.id}
                  onChange={() => update('delivery', d.id)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="checkout-city" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Місто *</label>
          <input
            id="checkout-city"
            value={form.city}
            onChange={e => update('city', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${errors.city ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-black/20`}
            placeholder="Ірпінь"
            autoComplete="address-level2"
          />
          {errors.city && <p data-error className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label htmlFor="checkout-address" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            {form.delivery === 'self' ? 'Адреса / примітка (опційно)' : 'Адреса доставки *'}
          </label>
          <input
            id="checkout-address"
            value={form.address}
            onChange={e => update('address', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${errors.address ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-black/20`}
            autoComplete="street-address"
            placeholder={form.delivery === 'self' ? 'Наприклад: зателефонуйте перед приїздом' : 'вул. Григорія Сковороди 11/7'}
          />
          {errors.address && <p data-error className="text-xs text-red-500 mt-1">{errors.address}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Коментар</label>
          <textarea
            value={form.comment}
            onChange={e => update('comment', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
            placeholder="Побажання до замовлення..."
          />
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 uppercase tracking-wider font-medium">Разом</span>
            <span className="text-xl font-bold">{cartTotal}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-full font-bold uppercase tracking-wider hover:bg-gray-800 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Відправка...' : 'Підтвердити замовлення'}
          </button>
          <p className="text-[10px] text-gray-400 text-center">Після відправки ми зв'яжемося з вами для підтвердження</p>
        </div>
      </form>
    </motion.div>
  );
};
