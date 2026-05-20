import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Heart, ShoppingBag, Menu, X, ChevronDown, Rocket, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { useSiteContent } from '../context/SiteContentContext';

interface SubcategoryDef {
  label: string;
  category: string;
  tag: string | null;
}

interface NavLinkDef {
  name: string;
  category: string;
  subcategories?: SubcategoryDef[];
}

const navLinks: NavLinkDef[] = [
  { 
    name: 'Книги', 
    category: 'Книги',
    subcategories: [
      { label: 'Підготовка до школи', category: 'Книги', tag: 'Підготовка до школи' },
      { label: 'Розмальовки', category: 'Книги', tag: 'Розмальовки' },
      { label: 'Наліпки', category: 'Книги', tag: 'Наліпки' },
      { label: 'Класика', category: 'Книги', tag: 'Класика' },
      { label: 'Пізнавальні', category: 'Книги', tag: 'Пізнавальні' },
      { label: 'Для малечі', category: 'Книги', tag: 'Для малечі' },
      { label: 'Бестселери', category: 'Книги', tag: 'Бестселер' },
    ]
  },
  { 
    name: 'Іграшки', 
    category: 'Іграшки',
    subcategories: [
      { label: 'Іграшки 0+', category: 'Іграшки', tag: '0+' },
      { label: 'Для дівчаток', category: 'Іграшки', tag: 'Для дівчаток' },
      { label: 'Для хлопчиків', category: 'Іграшки', tag: 'Для хлопчиків' },
      { label: 'Інтерактивні іграшки', category: 'Іграшки', tag: 'Інтерактивні' },
      { label: 'Розвиваючі іграшки', category: 'Іграшки', tag: 'Розвиваючі' },
      { label: 'Конструктори', category: 'Іграшки', tag: 'Конструктори' },
      { label: 'Пазли', category: 'Іграшки', tag: 'Пазли' },
      { label: 'Мʼякі іграшки', category: 'Іграшки', tag: 'Мʼякі іграшки' },
      { label: 'Рольові ігри', category: 'Іграшки', tag: 'Рольові ігри' },
      { label: 'Музичні', category: 'Іграшки', tag: 'Музичні' },
      { label: 'Наука', category: 'Іграшки', tag: 'Наука' },
    ]
  },
  { name: 'Власне виробництво', category: 'Власне виробництво' },
  { name: 'Творчість', category: 'Творчість' },
  { name: 'Настільні ігри', category: 'Настільні ігри' },
  { name: 'Сезонні товари', category: 'Сезонні товари' },
  { name: 'Акційні позиції', category: 'Акційні позиції' },
];

export const Navbar = () => {
  const { cartCount, setCartOpen, favCount, setFavOpen, setSearchOpen, navigateToCategory, navigateToSubcategory } = useStore();
  const { content } = useSiteContent();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (category: string) => {
    navigateToCategory(category);
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
  };

  const handleSubClick = (sub: SubcategoryDef) => {
    if (sub.tag) {
      navigateToSubcategory(sub.category, sub.tag);
    } else {
      navigateToCategory(sub.category);
    }
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileCategory = (name: string) => {
    setMobileExpanded(mobileExpanded === name ? null : name);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-xl text-black py-4 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border-b border-white/20' 
            : 'bg-transparent text-white py-6'
        }`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-full relative">
          <Link to="/" className="flex items-center gap-3 group z-50 relative">
             <div className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 ${isScrolled ? 'bg-black text-white' : 'bg-white/10 text-white backdrop-blur-md border border-white/20'}`}>
               <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-500" />
             </div>
            <div className="flex flex-col">
              <span className={`font-black tracking-tighter text-lg leading-none uppercase ${isScrolled ? 'text-black' : 'text-white'}`}>
                Маленький
              </span>
              <span className={`font-light tracking-[0.2em] text-xs leading-none uppercase ${isScrolled ? 'text-gray-500' : 'text-white/70'}`}>
                Всесвіт
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {navLinks.map((link) => (
              <div 
                key={link.name} 
                className="relative group h-full flex items-center"
                onMouseEnter={() => setActiveDropdown(link.name)}
              >
                <button
                  onClick={() => handleNavClick(link.category)}
                  className={`relative py-2 text-sm font-bold tracking-widest uppercase transition-colors duration-300 ${
                    activeDropdown === link.name 
                      ? 'text-[var(--color-bobo-yellow)]' 
                      : isScrolled ? 'text-gray-800 hover:text-black' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {link.name}
                  <span className={`absolute -bottom-1 left-0 w-full h-[2px] bg-[var(--color-bobo-yellow)] transform scale-x-0 transition-transform duration-300 origin-center ${activeDropdown === link.name ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
                </button>
                
                <AnimatePresence>
                  {link.subcategories && activeDropdown === link.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 pt-2 min-w-[220px]"
                      onMouseEnter={() => setActiveDropdown(link.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      <div className="bg-white text-black shadow-lg rounded-lg py-2 border border-gray-100">
                        <button
                          onClick={() => handleNavClick(link.category)}
                          className="block w-full text-left px-4 py-2.5 text-sm font-bold text-black hover:bg-gray-50 transition-colors"
                        >
                          Дивитися все
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        {link.subcategories.map((sub) => (
                          <button
                            key={sub.label}
                            onClick={() => handleSubClick(sub)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
                          >
                            {sub.label}
                          </button>
                        ))}
                        {link.name === 'Іграшки' && content.categories?.toys?.trim() && (
                          <>
                            <div className="h-px bg-gray-100 my-1" />
                            <p className="px-4 py-2 text-xs text-gray-500 leading-relaxed line-clamp-2" title={content.categories.toys}>
                              {content.categories.toys}
                            </p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSearchOpen(true)}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isScrolled ? 'text-black hover:bg-black/5' : 'text-white'}`}
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setFavOpen(true)}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors relative hidden sm:block ${isScrolled ? 'text-black hover:bg-black/5' : 'text-white'}`}
              >
                <Heart className="w-5 h-5" />
                {favCount > 0 && (
                  <motion.span
                    key={favCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full"
                  >
                    {favCount > 99 ? '99+' : favCount}
                  </motion.span>
                )}
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors relative ${isScrolled ? 'text-black hover:bg-black/5' : 'text-white'}`}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--color-bobo-yellow)] text-black text-[10px] font-bold flex items-center justify-center rounded-full"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </button>
              <Link
                to="/admin"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs uppercase tracking-wider transition-all ${isScrolled ? 'bg-black text-white hover:bg-gray-800' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-md border border-white/20'}`}
                title="Адмін-панель"
              >
                <Settings className="w-4 h-4" />
                Адмін
              </Link>
              <Link
                to="/admin"
                className={`sm:hidden p-2 rounded-full hover:bg-white/10 transition-colors ${isScrolled ? 'text-black hover:bg-black/5' : 'text-white'}`}
                title="Адмін-панель"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button 
                className={`lg:hidden p-2 rounded-full hover:bg-white/10 transition-colors ${isScrolled ? 'text-black hover:bg-black/5' : 'text-white'}`}
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#0f172a] text-white overflow-hidden"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>

            <div className="p-6 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-yellow-300" />
                <h2 className="font-black text-lg uppercase tracking-wider">Маленький Всесвіт</h2>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
              {navLinks.map((link) => (
                <div key={link.name} className="flex flex-col border-b border-white/5 last:border-0">
                  <div 
                    className="flex items-center justify-between py-4 cursor-pointer group"
                    onClick={() => {
                      if (link.subcategories) {
                        toggleMobileCategory(link.name);
                      } else {
                        handleNavClick(link.category);
                      }
                    }}
                  >
                    <button 
                      onClick={(e) => {
                        if (!link.subcategories) return;
                        e.stopPropagation();
                        handleNavClick(link.category);
                      }}
                      className={`text-xl font-medium transition-colors ${mobileExpanded === link.name ? 'text-[var(--color-bobo-yellow)]' : 'group-hover:text-[var(--color-bobo-yellow)]'}`}
                    >
                      {link.name}
                    </button>
                    {link.subcategories && (
                      <div className={`p-1 rounded-full transition-all ${mobileExpanded === link.name ? 'bg-[var(--color-bobo-yellow)] text-black rotate-180' : 'bg-white/10'}`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {link.subcategories && mobileExpanded === link.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pb-4 flex flex-col gap-3">
                          <button
                            onClick={() => handleNavClick(link.category)}
                            className="py-2 text-[var(--color-bobo-yellow)] font-bold flex items-center gap-2 text-base"
                          >
                            <span className="w-1 h-1 bg-yellow-300 rounded-full"></span>
                            Дивитися все
                          </button>
                          {link.subcategories.map((sub) => (
                            <button 
                              key={sub.label}
                              onClick={() => handleSubClick(sub)}
                              className="py-2 text-gray-300 hover:text-white flex items-center gap-2 text-base text-left"
                            >
                              <span className="w-1 h-1 bg-[var(--color-bobo-yellow)] rounded-full"></span>
                              {sub.label}
                            </button>
                          ))}
                          {link.name === 'Іграшки' && content.categories?.toys?.trim() && (
                            <p className="py-2 text-sm text-gray-400 leading-relaxed line-clamp-2 pl-5">
                              {content.categories.toys}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              
              <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-2">
                <Link to="/delivery" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-gray-300 hover:text-white text-base">
                  Доставка та оплата
                </Link>
                <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-gray-300 hover:text-white text-base">
                  Про нас
                </Link>
                <Link to="/contacts" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-gray-300 hover:text-white text-base">
                  Контакти
                </Link>
              </div>
              
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={() => { setSearchOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full bg-white/10 text-white py-4 rounded-xl font-bold uppercase tracking-wide hover:bg-white/20 transition-colors flex items-center justify-center gap-3 border border-white/10"
                >
                  <Search className="w-5 h-5" />
                  Пошук
                </button>
                <button
                  onClick={() => { setFavOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full bg-white/10 text-white py-4 rounded-xl font-bold uppercase tracking-wide hover:bg-white/20 transition-colors flex items-center justify-center gap-3 border border-white/10"
                >
                  <Heart className="w-5 h-5" />
                  Обране {favCount > 0 && `(${favCount})`}
                </button>
                <button
                  onClick={() => { setCartOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full bg-[var(--color-bobo-yellow)] text-black py-4 rounded-xl font-bold uppercase tracking-wide hover:brightness-110 transition-colors flex items-center justify-center gap-3"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Кошик {cartCount > 0 && `(${cartCount})`}
                </button>
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full bg-white/10 text-white py-4 rounded-xl font-bold uppercase tracking-wide hover:bg-white/20 transition-colors flex items-center justify-center gap-3 border border-white/10"
                >
                  <Settings className="w-5 h-5" />
                  Адмін-панель
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
