import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, ImageIcon } from 'lucide-react';

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  gradient: string;
  link?: string;
  imageUrl?: string;
  active: boolean;
}

const BANNERS_KEY = 'lumu_admin_banners';

const DEFAULT_BANNERS: Banner[] = [
  { id: 1, title: 'Нова колекція книг', subtitle: 'Пізнавальні книги для дітей від 3 років', gradient: 'linear-gradient(135deg, hsl(340, 75%, 60%) 0%, hsl(20, 85%, 65%) 100%)', active: true },
  { id: 2, title: 'Іграшки зі знижкою', subtitle: 'До -30% на обрані товари', gradient: 'linear-gradient(135deg, hsl(230, 70%, 55%) 0%, hsl(270, 65%, 70%) 100%)', active: true },
];

function loadBanners(): Banner[] {
  try {
    const s = localStorage.getItem(BANNERS_KEY);
    if (s) {
      const data = JSON.parse(s);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  return DEFAULT_BANNERS;
}

function saveBanners(banners: Banner[]) {
  localStorage.setItem(BANNERS_KEY, JSON.stringify(banners));
}

export function BannersEditor() {
  const [banners, setBanners] = useState<Banner[]>(loadBanners);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { saveBanners(banners); }, [banners]);

  const addBanner = () => {
    const maxId = banners.reduce((m, b) => Math.max(m, b.id), 0);
    const newBanner: Banner = {
      id: maxId + 1,
      title: 'Новий банер',
      subtitle: 'Опис банера',
      gradient: 'linear-gradient(135deg, hsl(200, 70%, 55%) 0%, hsl(250, 65%, 65%) 100%)',
      active: true,
    };
    setBanners(prev => [...prev, newBanner]);
    setEditingId(newBanner.id);
  };

  const updateBanner = (id: number, updates: Partial<Banner>) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBanner = (id: number) => {
    if (confirm('Видалити банер?')) {
      setBanners(prev => prev.filter(b => b.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setBanners(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    if (idx >= banners.length - 1) return;
    setBanners(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{'Банери на головній'}</h2>
          <p className="text-sm text-gray-500">{'Налаштуйте слайдер на головній сторінці'}</p>
        </div>
        <button onClick={addBanner} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800">
          <Plus className="w-4 h-4" />
          {'Додати'}
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{'Банерів немає'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, idx) => (
            <div key={banner.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-stretch">
                <div
                  className="w-48 shrink-0 relative"
                  style={{ background: banner.gradient, minHeight: '100px' }}
                >
                  {banner.imageUrl && (
                    <img src={banner.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-end p-3">
                    {!banner.active && (
                      <span className="px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-bold">{'Неактивний'}</span>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{banner.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{banner.subtitle}</p>
                      {banner.link && <p className="text-xs text-violet-600 mt-1">{banner.link}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                      <button onClick={() => moveDown(idx)} disabled={idx === banners.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(editingId === banner.id ? null : banner.id)} className="p-1.5 rounded-lg hover:bg-gray-100"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => deleteBanner(banner.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {editingId === banner.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{'Заголовок'}</label>
                        <input value={banner.title} onChange={e => updateBanner(banner.id, { title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{'Підзаголовок'}</label>
                        <input value={banner.subtitle} onChange={e => updateBanner(banner.id, { subtitle: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{'Градієнт'}</label>
                        <input value={banner.gradient} onChange={e => updateBanner(banner.id, { gradient: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="linear-gradient(135deg, ...)" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{'Посилання'}</label>
                        <input value={banner.link || ''} onChange={e => updateBanner(banner.id, { link: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="/category/books" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{'Зображення (URL)'}</label>
                        <input value={banner.imageUrl || ''} onChange={e => updateBanner(banner.id, { imageUrl: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="https://..." />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={banner.active} onChange={e => updateBanner(banner.id, { active: e.target.checked })} className="rounded" />
                        <span className="text-sm text-gray-700">{'Активний'}</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
