import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, MapPin, Clock, Rocket, Phone, Mail, Heart, Send, ArrowUpRight, Sparkles, Settings } from 'lucide-react';
import { useStore } from '../store';
import { useSiteContent } from '../context/SiteContentContext';

export const Footer = () => {
  const { navigateToCategory } = useStore();
  const { content } = useSiteContent();

  return (
    <footer className="relative overflow-hidden">
      {/* CTA Banner */}
      <div className="relative bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 py-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" />
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
              style={{
                top: `${10 + (i * 11) % 80}%`,
                left: `${5 + (i * 13) % 90}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-white/80 text-xs font-bold uppercase tracking-widest mb-6 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            Будьте в курсі
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            Приєднуйтесь до<br />
            <span className="text-[var(--color-bobo-yellow)]">Маленького Всесвіту</span>
          </h2>
          <p className="text-white/70 text-base md:text-lg max-w-md mx-auto mb-10 font-light">
            Космічні новини, ексклюзивні знижки та натхнення для творчості
          </p>
          <div className="w-full max-w-lg mx-auto relative">
            <input
              type="email"
              placeholder="Ваш email..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-6 pr-40 py-4.5 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 focus:border-white/40 transition-all text-sm"
            />
            <button className="absolute right-1.5 top-1.5 bottom-1.5 bg-[var(--color-bobo-yellow)] text-black px-7 rounded-full font-bold hover:brightness-110 transition-all uppercase tracking-wider text-xs flex items-center gap-2 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] active:scale-[0.98]">
              <Send className="w-3.5 h-3.5" />
              Підписатися
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="bg-[#0a0f1e] text-white pt-20 pb-0 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-900/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">

          {/* Top: Logo + quick category links */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-black text-xl tracking-tighter uppercase block leading-none">Маленький</span>
                <span className="font-light tracking-[0.25em] text-[10px] uppercase text-gray-400 block">Всесвіт</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Книги', 'Іграшки', 'Творчість', 'Настільні ігри', 'Власне виробництво', 'Сезонні товари', 'Акційні позиції'].map(cat => {
                const desc = cat === 'Іграшки' ? content.categories?.toys?.trim() : cat === 'Власне виробництво' ? content.categories?.ownProduction?.trim() : cat === 'Сезонні товари' ? content.categories?.seasonal?.trim() : cat === 'Акційні позиції' ? content.categories?.promo?.trim() : null;
                return (
                  <button
                    key={cat}
                    onClick={() => navigateToCategory(cat)}
                    title={desc ?? undefined}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all border border-white/5 hover:border-white/10"
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-14" />

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 lg:gap-x-12 mb-16">
            <div className="flex flex-col gap-5">
              <h4 className="text-xs uppercase text-purple-400 tracking-[0.2em] font-bold">Магазин</h4>
              <nav className="flex flex-col gap-3">
                {[
                  { label: 'Книги', cat: 'Книги', title: '' },
                  { label: 'Іграшки', cat: 'Іграшки', title: content.categories?.toys?.trim() ?? '' },
                  { label: 'Власне виробництво', cat: 'Власне виробництво', title: content.categories?.ownProduction?.trim() ?? '' },
                  { label: 'Творчість', cat: 'Творчість', title: '' },
                  { label: 'Настільні ігри', cat: 'Настільні ігри', title: '' },
                  { label: 'Хіт продажу', cat: 'Хіт продажу', title: '' },
                  { label: 'Сезонні товари', cat: 'Сезонні товари', title: content.categories?.seasonal?.trim() ?? '' },
                  { label: 'Акційні позиції', cat: 'Акційні позиції', title: content.categories?.promo?.trim() ?? '' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => navigateToCategory(item.cat)}
                    title={item.title || undefined}
                    className="text-gray-400 hover:text-white transition-colors text-sm text-left group flex items-center gap-1.5"
                  >
                    {item.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex flex-col gap-5">
              <h4 className="text-xs uppercase text-purple-400 tracking-[0.2em] font-bold">Про нас</h4>
              <nav className="flex flex-col gap-3">
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors text-sm group flex items-center gap-1.5">
                  Про нас
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link to="/contacts" className="text-gray-400 hover:text-white transition-colors text-sm group flex items-center gap-1.5">
                  Контакти
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link to="/#reviews" className="text-gray-400 hover:text-white transition-colors text-sm group flex items-center gap-1.5">
                  Наші огляди
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-5">
              <h4 className="text-xs uppercase text-purple-400 tracking-[0.2em] font-bold">Клієнтам</h4>
              <nav className="flex flex-col gap-3">
                <Link to="/delivery" className="text-gray-400 hover:text-white transition-colors text-sm group flex items-center gap-1.5">
                  Доставка та оплата
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link to="/delivery" className="text-gray-400 hover:text-white transition-colors text-sm group flex items-center gap-1.5">
                  Повернення та обмін
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-5">
              <h4 className="text-xs uppercase text-purple-400 tracking-[0.2em] font-bold">Контакти</h4>
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-start gap-3 text-gray-400 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    <MapPin className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-gray-300 block leading-relaxed">м. Ірпінь</span>
                    <span className="text-gray-500 text-xs">вул. Григорія Сковороди 11/7</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-gray-300 block">Щодня</span>
                    <span className="text-gray-500 text-xs">09:00 — 18:00</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    <Phone className="w-4 h-4 text-purple-400" />
                  </div>
                  <a href="tel:+380991234567" className="text-gray-300 hover:text-white transition-colors">
                    +38 (099) 123-45-67
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-400 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    <Mail className="w-4 h-4 text-purple-400" />
                  </div>
                  <a href="mailto:hello@mvsesvit.ua" className="text-gray-300 hover:text-white transition-colors">
                    hello@mvsesvit.ua
                  </a>
                </div>

                <div className="flex gap-3 mt-2">
                  {[
                    { icon: Instagram, href: 'https://www.instagram.com/malyenkyi.vsesvit_/', label: 'Instagram' },
                    { icon: Facebook, href: '#', label: 'Facebook' },
                    { icon: Youtube, href: '#', label: 'YouTube' },
                  ].map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 text-gray-400 hover:text-white"
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/5 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              © 2026 Маленький Всесвіт. Зроблено з
              <Heart className="w-3 h-3 text-red-400 fill-red-400 inline" />
              в Ірпені
            </p>
            <div className="flex items-center gap-6">
              <div className="flex gap-2">
                {['VISA', 'MC', 'GPay'].map(pm => (
                  <div key={pm} className="h-7 px-3 bg-white/5 rounded-md flex items-center justify-center text-[10px] font-bold text-gray-500 tracking-wider border border-white/5">
                    {pm}
                  </div>
                ))}
              </div>
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 text-xs font-bold uppercase tracking-wider"
                aria-label="Адмін-панель"
              >
                <Settings className="w-4 h-4" />
                Адмін
              </Link>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/5"
                aria-label="Scroll to top"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 12V4M4 7l4-4 4 4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Giant Background Text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[35%] w-full text-center pointer-events-none select-none overflow-hidden">
          <h1 className="text-[18vw] font-black text-white/[0.015] tracking-tighter uppercase leading-none whitespace-nowrap">
            МАЛЕНЬКИЙ ВСЕСВІТ
          </h1>
        </div>
      </div>
    </footer>
  );
};
