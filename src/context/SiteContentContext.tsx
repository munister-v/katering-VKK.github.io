import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface SiteContent {
  hero?: { address?: string; workingHours?: string; workingHoursShort?: string };
  about?: { title?: string; subtitle?: string; intro?: string; paragraph2?: string; footer?: string };
  delivery?: {
    title?: string;
    deliveryTitle?: string;
    deliveryText?: string;
    paymentTitle?: string;
    paymentText?: string;
    returnsTitle?: string;
    returnsText?: string;
  };
  contacts?: { title?: string; address?: string; workingHours?: string; phone?: string; email?: string };
  editorial?: {
    title?: string;
    linkText?: string;
    articles?: Array<{ id: number; title: string; category: string; description: string; gradient: string }>;
  };
  reviews?: {
    title?: string;
    items?: Array<{ id: number; name: string; rating: number; text: string; date: string }>;
  };
  categories?: {
    toys?: string;
    ownProduction?: string;
    seasonal?: string;
    promo?: string;
    books?: string;
    creativity?: string;
    boardGames?: string;
  };
  categoryGradients?: Record<string, string>;
}

const DEFAULT: SiteContent = {
  hero: { address: 'м. Ірпінь, вул. Григорія Сковороди 11/7', workingHours: '09:00 - 18:00', workingHoursShort: 'Щодня з 09:00 до 18:00' },
  about: {
    title: 'Маленький Всесвіт',
    subtitle: 'Книги та іграшки для дітей',
    intro: "Ми — невеликий магазин у Ірпені, де кожна книга та іграшка обрані з любов'ю. Наша місія — допомагати дітям відкривати світ через читання, гру та творчість.",
    paragraph2: "У нас ви знайдете дитячі книги різних жанрів: від казок та енциклопедій до розмальовок та навчальних видань. Іграшки — розвиваючі, інтерактивні, для хлопчиків та дівчаток. Є власне виробництво, настільні ігри та матеріали для творчості.",
    footer: "Зроблено з любов'ю в Ірпені",
  },
  delivery: {
    title: 'Доставка та оплата',
    deliveryTitle: 'Доставка',
    deliveryText: 'Самовивіз — безкоштовно з магазину за адресою: м. Ірпінь, вул. Григорія Сковороди 11/7. Режим роботи: щодня з 09:00 до 18:00.\n\nДоставка по Ірпеню — від 50 ₴. Мінімальне замовлення для доставки — 200 ₴.\n\nНова Пошта — відправлення протягом 1–2 робочих днів. Вартість за тарифами перевізника.\n\nУкрпошта — за тарифами перевізника. Термін доставки — 3–7 днів.',
    paymentTitle: 'Оплата',
    paymentText: 'Готівка — при самовивозі або доставці кур\'єром.\n\nКартка — Visa, Mastercard при отриманні або онлайн.\n\nОплата при отриманні — для доставки Нова Пошта та Укрпошта.',
    returnsTitle: 'Повернення',
    returnsText: 'Товар належної якості можна повернути протягом 14 днів з моменту отримання. Товар має зберегти товарний вигляд та упаковку.\n\nПри поверненні через Нова Пошта — вартість пересилки оплачує клієнт.',
  },
  contacts: {
    title: 'Контакти',
    address: 'м. Ірпінь, вул. Григорія Сковороди 11/7',
    workingHours: 'Щодня з 09:00 до 18:00',
    phone: '+38 (099) 123-45-67',
    email: 'hello@mvsesvit.ua',
  },
  editorial: {
    title: 'Журнал',
    linkText: 'Читати всі статті',
    articles: [
      { id: 1, title: 'Анімована книга: Подорож до зірок', category: 'Новинки', description: 'Пориньте у світ SS26 з нашою анімованою книгою. Історія про маленького астронавта.', gradient: 'linear-gradient(135deg, hsl(340, 75%, 60%) 0%, hsl(20, 85%, 65%) 100%)' },
      { id: 2, title: 'Колекція "Місячне Сяйво"', category: 'Натхнення', description: 'Колекція, що запрошує вас сповільнитися та відчути глибину космосу.', gradient: 'linear-gradient(135deg, hsl(230, 70%, 55%) 0%, hsl(270, 65%, 70%) 100%)' },
      { id: 3, title: 'Космічні пригоди', category: 'Для дітей', description: 'Колекція, що святкує допитливість, щоденні відкриття та мистецтво гри.', gradient: 'linear-gradient(135deg, hsl(160, 65%, 50%) 0%, hsl(190, 70%, 60%) 100%)' },
    ],
  },
  reviews: {
    title: 'Наші огляди',
    items: [
      { id: 1, name: 'Олена К.', rating: 5, text: 'Чудовий магазин! Книги якісні, дочка в захваті від енциклопедії про космос. Швидка доставка по Ірпеню.', date: 'Березень 2025' },
      { id: 2, name: 'Андрій М.', rating: 5, text: 'Замовляли конструктор та пазли — все прийшло швидко, упаковано акуратно. Діти грають щодня.', date: 'Лютий 2025' },
      { id: 3, name: 'Марія Т.', rating: 5, text: "Рекомендую! Великий вибір книг для дошкільнят, приємні ціни. Обов'язково повернемось.", date: 'Січень 2025' },
    ],
  },
  categories: {
    toys: 'Розвиваючі та інтерактивні іграшки для дітей: конструктори, пазли, мʼякі іграшки, набори для ролевих ігор. Від 0+ до шкільного віку.',
    ownProduction: 'Унікальні речі ручної роботи: деревʼяні іграшки, текстиль, декор, персоналізовані подарунки. Зроблено з любовʼю в Ірпені.',
    seasonal: 'Товари для пори року: сезонні новинки та особливі пропозиції.',
    promo: 'Знижки та спеціальні пропозиції. Акційні позиції з вигідними цінами.',
    books: 'Історії, що надихають',
    creativity: 'Розкрий свій талант',
    boardGames: 'Грайте разом',
  },
  categoryGradients: {
    'Книги': 'linear-gradient(135deg, hsl(10, 80%, 65%) 0%, hsl(35, 90%, 70%) 100%)',
    'Іграшки': 'linear-gradient(135deg, hsl(210, 80%, 60%) 0%, hsl(240, 70%, 70%) 100%)',
    'Власне виробництво': 'linear-gradient(135deg, hsl(40, 70%, 65%) 0%, hsl(50, 60%, 75%) 100%)',
    'Творчість': 'linear-gradient(135deg, hsl(290, 70%, 65%) 0%, hsl(320, 75%, 70%) 100%)',
    'Настільні ігри': 'linear-gradient(135deg, hsl(120, 60%, 55%) 0%, hsl(150, 65%, 65%) 100%)',
    'Сезонні товари': 'linear-gradient(135deg, hsl(180, 70%, 50%) 0%, hsl(200, 75%, 60%) 100%)',
    'Акційні позиції': 'linear-gradient(135deg, hsl(350, 80%, 55%) 0%, hsl(10, 90%, 65%) 100%)',
  },
};

interface SiteContentContextType {
  content: SiteContent;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextType | null>(null);

const SITE_CONTENT_URL = '/site-content.json';
const SITE_CONTENT_STORAGE_KEY = 'lumu_admin_site_content';

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT);
  const [loading, setLoading] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      const stored = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && typeof data === 'object') {
          setContent({ ...DEFAULT, ...data });
          return;
        }
      }
    } catch {
      // Fallback
    }
    try {
      const res = await fetch(`${SITE_CONTENT_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setContent({ ...DEFAULT, ...data });
          return;
        }
      }
    } catch {
      // Fallback to default
    }
    setContent(DEFAULT);
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <SiteContentContext.Provider value={{ content, loading, refetch: fetchContent }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  return ctx ?? { content: DEFAULT, loading: false, refetch: async () => {} };
}
