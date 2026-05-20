import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Save, Plus, Trash2, X, Loader2, LogOut, ChevronDown, ChevronRight, BookOpen, Gamepad2, Palette, Sparkles, Dice5, ExternalLink, Search, CheckCircle, FileText, Download, Upload, BarChart3, AlertTriangle, ArrowUpDown, Eye, FileWarning, Filter, ImageIcon, LayoutGrid, List, Pencil, PackageCheck, GripVertical, Undo2, Redo2, Package, Image as ImageLucide, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useSiteContent } from '../context/SiteContentContext';
import { useStore } from '../store';
import { getProductGradient } from '../data/products';
import type { Product } from '../data/products';
import { categories } from '../data/products';
import { ProductImage } from '../components/ProductImage';
import { resolveImageUrl } from '../utils/imageUrl';
import { AnalyticsCharts } from '../components/admin/AnalyticsCharts';
import { OrdersManager } from '../components/admin/OrdersManager';
import { BannersEditor } from '../components/admin/BannersEditor';
import { InstagramManager } from '../components/admin/InstagramManager';
import { formatProductMeta, normalizeImportedProduct, normalizeProductForStorage, parseDelimitedProducts, parseProductDetailsFromName, productArticle, productDisplayName, productUnits } from '../utils/productImport';

const ADMIN_CATEGORIES = categories.filter(c => c !== 'Всі' && c !== 'Хіт продажу');
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Книги': <BookOpen className="w-5 h-5" />,
  'Іграшки': <Gamepad2 className="w-5 h-5" />,
  'Власне виробництво': <Sparkles className="w-5 h-5" />,
  'Творчість': <Palette className="w-5 h-5" />,
  'Настільні ігри': <Dice5 className="w-5 h-5" />,
  'Інше': <Sparkles className="w-5 h-5" />,
};

const ADMIN_KEY = 'lumu_admin';
const PRODUCTS_STORAGE_KEY = 'lumu_admin_products';
const SITE_CONTENT_STORAGE_KEY = 'lumu_admin_site_content';
const ADMIN_PASSWORD = 'tmUVDy4pb%pWyr4h';

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const exportDate = () => new Date().toISOString().slice(0, 10);

function downloadAdminFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function priceNumber(product: Pick<Product, 'price'>) {
  return parseInt(String(product.price || '').replace(/\s/g, '').replace('₴', ''), 10) || 0;
}

function productExportPayload(products: Product[]) {
  return products.map(product => {
    const p = normalizeProductForStorage(product);
    return ({
    id: Number(p.id),
    ...(productArticle(p) && { article: productArticle(p) }),
    name: String(p.name || '').trim(),
    price: String(p.price || '').trim(),
    category: String(p.category || 'Книги'),
    tag: String(p.tag || '').trim(),
    units: productUnits(p),
    ...(p.description && { description: String(p.description).trim() }),
    ...(p.image && { image: String(p.image) }),
  });
  });
}

function categorySummary(products: Product[]) {
  return products.reduce<Record<string, { count: number; units: number; sum: number; withImage: number; withArticle: number; withDescription: number }>>((acc, p) => {
    const cat = String(p.category || 'Інше');
    const units = productUnits(p);
    acc[cat] = acc[cat] || { count: 0, units: 0, sum: 0, withImage: 0, withArticle: 0, withDescription: 0 };
    acc[cat].count += 1;
    acc[cat].units += units;
    acc[cat].sum += priceNumber(p) * units;
    if (p.image) acc[cat].withImage += 1;
    if (productArticle(p)) acc[cat].withArticle += 1;
    if (String(p.description ?? '').trim()) acc[cat].withDescription += 1;
    return acc;
  }, {});
}

function productRows(products: Product[]) {
  return products.map(product => {
    const p = normalizeProductForStorage(product);
    const units = productUnits(p);
    return [
      p.id,
      productArticle(p),
      productDisplayName(p),
      p.category,
      p.tag,
      p.price,
      units,
      priceNumber(p) * units,
      p.description ?? '',
      p.image ?? '',
    ];
  });
}

function buildProductsCsv(products: Product[]) {
  return [
    ['id', 'article', 'name', 'category', 'tag', 'price', 'units', 'line_total', 'description', 'image'].map(csvCell).join(','),
    ...productRows(products).map(row => row.map(csvCell).join(',')),
  ].join('\n');
}

function buildCategoryCsv(products: Product[]) {
  const rows = Object.entries(categorySummary(products))
    .map(([cat, info]) => [cat, info.count, info.units, info.sum, info.withArticle, info.withImage, info.withDescription])
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  return [
    ['category', 'products', 'units', 'estimated_total', 'with_article', 'with_image', 'with_description'].map(csvCell).join(','),
    ...rows.map(row => row.map(csvCell).join(',')),
  ].join('\n');
}

function buildIssuesCsv(products: Product[]) {
  const rows = products
    .map(product => {
      const p = normalizeProductForStorage(product);
      const issues = [
        !productArticle(p) ? 'no_article' : '',
        !p.image ? 'no_image' : '',
        !String(p.description ?? '').trim() ? 'no_description' : '',
      ].filter(Boolean);
      return { p, issues };
    })
    .filter(row => row.issues.length > 0)
    .map(({ p, issues }) => [p.id, productArticle(p), productDisplayName(p), p.category, p.price, productUnits(p), issues.join('; ')]);
  return [
    ['id', 'article', 'name', 'category', 'price', 'units', 'issues'].map(csvCell).join(','),
    ...rows.map(row => row.map(csvCell).join(',')),
  ].join('\n');
}

function buildFullReportCsv(products: Product[]) {
  return [
    buildProductsCsv(products),
    '',
    buildCategoryCsv(products),
    '',
    buildIssuesCsv(products),
  ].join('\n');
}

function buildStatsJson(products: Product[]) {
  const categories = categorySummary(products);
  const productsWithoutArticle = products.filter(p => !productArticle(p)).map(p => p.id);
  const productsWithoutImage = products.filter(p => !p.image).map(p => p.id);
  const productsWithoutDescription = products.filter(p => !String(p.description ?? '').trim()).map(p => p.id);
  const totalUnits = products.reduce((sum, p) => sum + productUnits(p), 0);
  const estimatedTotal = products.reduce((sum, p) => sum + priceNumber(p) * productUnits(p), 0);
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      products: products.length,
      categories: Object.keys(categories).length,
      units: totalUnits,
      estimatedTotal,
      tagged: products.filter(p => String(p.tag || '').trim()).length,
      withArticle: products.length - productsWithoutArticle.length,
      withImage: products.length - productsWithoutImage.length,
      withDescription: products.length - productsWithoutDescription.length,
    },
    categories,
    quality: {
      productsWithoutArticle,
      productsWithoutImage,
      productsWithoutDescription,
    },
  };
}

function escapeReportHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPrintableReportHtml(products: Product[]) {
  const stats = buildStatsJson(products);
  const categories = Object.entries(categorySummary(products)).sort((a, b) => b[1].count - a[1].count);
  const issueRows = buildIssuesCsv(products).split('\n').slice(1).filter(Boolean).length;
  const productTable = productRows(products).map(row => `
    <tr>
      <td>${escapeReportHtml(row[0])}</td>
      <td>${escapeReportHtml(row[1])}</td>
      <td>${escapeReportHtml(row[2])}</td>
      <td>${escapeReportHtml(row[3])}</td>
      <td>${escapeReportHtml(row[4])}</td>
      <td>${escapeReportHtml(row[5])}</td>
      <td>${escapeReportHtml(row[6])}</td>
      <td>${escapeReportHtml(row[7])}</td>
    </tr>
  `).join('');
  const categoryTable = categories.map(([cat, info]) => `
    <tr>
      <td>${escapeReportHtml(cat)}</td>
      <td>${info.count}</td>
      <td>${info.units}</td>
      <td>${formatAdminMoney(info.sum)}</td>
      <td>${info.withArticle}</td>
      <td>${info.withImage}</td>
      <td>${info.withDescription}</td>
    </tr>
  `).join('');
  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Lumu report ${exportDate()}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111827; font-size: 11px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 18px 0 8px; }
    .muted { color: #6b7280; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #f9fafb; }
    .label { color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
    .value { font-size: 18px; font-weight: 800; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #e5e7eb; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #111827; color: white; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; }
    tbody tr:nth-child(even) { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Lumu admin report</h1>
  <div class="muted">Згенеровано: ${escapeReportHtml(new Date().toLocaleString('uk-UA'))}</div>
  <div class="cards">
    <div class="card"><div class="label">Товарів</div><div class="value">${stats.totals.products}</div></div>
    <div class="card"><div class="label">Категорій</div><div class="value">${stats.totals.categories}</div></div>
    <div class="card"><div class="label">Юнітів</div><div class="value">${stats.totals.units}</div></div>
    <div class="card"><div class="label">Оцінка</div><div class="value">${formatAdminMoney(stats.totals.estimatedTotal)}</div></div>
  </div>
  <h2>Статистика категорій</h2>
  <table>
    <thead><tr><th>Категорія</th><th>Товари</th><th>Юніти</th><th>Сума</th><th>З артикулом</th><th>З фото</th><th>З описом</th></tr></thead>
    <tbody>${categoryTable}</tbody>
  </table>
  <h2>Таблиця товарів</h2>
  <div class="muted">Проблемних рядків: ${issueRows}</div>
  <table>
    <thead><tr><th>ID</th><th>Артикул</th><th>Назва</th><th>Категорія</th><th>Тег</th><th>Ціна</th><th>Юніти</th><th>Сума</th></tr></thead>
    <tbody>${productTable}</tbody>
  </table>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body>
</html>`;
}

export const Admin = () => {
  const { products, loading, refetch } = useProducts();
  const { content: siteContent, refetch: refetchSiteContent } = useSiteContent();
  const { showToast } = useStore();
  const [auth, setAuth] = useState<{ token: string } | null>(() => {
    try {
      const s = sessionStorage.getItem(ADMIN_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'products' | 'sections' | 'analytics' | 'orders' | 'banners' | 'instagram'>('dashboard');

  // undo/redo history
  const [history, setHistory] = useState<Product[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const pushHistory = useCallback((snapshot: Product[]) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(JSON.parse(JSON.stringify(snapshot)));
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    if (prev) {
      setLocalProducts(prev);
      setHistoryIndex(i => i - 1);
      hasLocalChangesRef.current = true;
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    if (next) {
      setLocalProducts(next);
      setHistoryIndex(i => i + 1);
      hasLocalChangesRef.current = true;
    }
  }, [history, historyIndex]);

  // Drag & drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const skipSyncRef = useRef(false);
  const hasLocalChangesRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<number, string>>({});



  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    if (hasLocalChangesRef.current) return;
    const list = Array.isArray(products) ? products : [];
    setLocalProducts(list);
  }, [products]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Drag & drop handler
  const handleDragDrop = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    pushHistory(localProducts);
    setLocalProducts(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
    hasLocalChangesRef.current = true;
    setDragIdx(null);
    setDragOverIdx(null);
  }, [localProducts, pushHistory]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setLoginError('Введіть пароль');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    await new Promise(r => setTimeout(r, 300));
    if (password.trim() === ADMIN_PASSWORD) {
      const token = 'local-' + Date.now();
      sessionStorage.setItem(ADMIN_KEY, JSON.stringify({ token }));
      setAuth({ token });
      setPassword('');
    } else {
      setLoginError('Невірний пароль');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY);
    setAuth(null);
    setEditing(null);
    setSaveError('');
  };

  const handleSaveProduct = (updated: Product) => {
    pushHistory(localProducts);
    hasLocalChangesRef.current = true;
    setLocalProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setNewProductIds(prev => { const s = new Set(prev); s.delete(updated.id); return s; });
    setEditing(null);
  };

  const [newProductIds, setNewProductIds] = useState<Set<number>>(new Set());
  const productsList = Array.isArray(products) ? products : [];
  const totalProducts = localProducts.length;
  const hasUnsaved = useMemo(() => {
    const orig = JSON.stringify(productsList.map(p => ({ id: p.id, article: p.article, name: p.name, price: p.price, category: p.category, tag: p.tag, units: p.units, description: p.description, image: p.image })));
    const curr = JSON.stringify(localProducts.map(p => ({ id: p.id, article: p.article, name: p.name, price: p.price, category: p.category, tag: p.tag, units: p.units, description: p.description, image: p.image })));
    return orig !== curr;
  }, [productsList, localProducts]);

  const handleAddProduct = (category: string) => {
    pushHistory(localProducts);
    hasLocalChangesRef.current = true;
    const maxId = localProducts.reduce((m, p) => Math.max(m, p.id), 0);
    const newId = maxId + 1;
    const newProduct: Product = {
      id: newId,
      article: '',
      name: 'Новий товар',
      price: '100 ₴',
      category,
      tag: '',
      units: 1,
      description: '',
    };
    setLocalProducts(prev => [...prev, newProduct]);
    setNewProductIds(prev => new Set(prev).add(newId));
    setEditing(newProduct);
  };

  const handleDeleteProduct = (id: number, name?: string) => {
    const label = name ? `«${name.length > 40 ? name.slice(0, 40) + '…' : name}»` : 'цей товар';
    if (confirm(`Видалити товар ${label}?`)) {
      pushHistory(localProducts);
      hasLocalChangesRef.current = true;
      setNewProductIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      setLocalProducts(prev => prev.filter(p => p.id !== id));
      setEditing(null);
    }
  };

  const handleExportProducts = () => {
    downloadAdminFile(JSON.stringify(productExportPayload(localProducts), null, 2), `products-${exportDate()}.json`, 'application/json;charset=utf-8');
    showToast('Товари JSON вигружено');
  };

  const handleExportReport = () => {
    downloadAdminFile('\uFEFF' + buildFullReportCsv(localProducts), `lumu-full-report-${exportDate()}.csv`, 'text/csv;charset=utf-8');
    showToast('Повний звіт CSV вигружено');
  };

  const handleExportProductsCsv = () => {
    downloadAdminFile('\uFEFF' + buildProductsCsv(localProducts), `products-table-${exportDate()}.csv`, 'text/csv;charset=utf-8');
    showToast('Товари CSV вигружено');
  };

  const handleExportStatsJson = () => {
    downloadAdminFile(JSON.stringify(buildStatsJson(localProducts), null, 2), `lumu-stats-${exportDate()}.json`, 'application/json;charset=utf-8');
    showToast('Статистику JSON вигружено');
  };

  const handleExportCategoriesCsv = () => {
    downloadAdminFile('\uFEFF' + buildCategoryCsv(localProducts), `category-stats-${exportDate()}.csv`, 'text/csv;charset=utf-8');
    showToast('Статистику категорій CSV вигружено');
  };

  const handleExportIssuesCsv = () => {
    downloadAdminFile('\uFEFF' + buildIssuesCsv(localProducts), `product-issues-${exportDate()}.csv`, 'text/csv;charset=utf-8');
    showToast('Проблемні товари CSV вигружено');
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const productsSheet = XLSX.utils.aoa_to_sheet([
      ['id', 'article', 'name', 'category', 'tag', 'price', 'units', 'line_total', 'description', 'image'],
      ...productRows(localProducts),
    ]);
    const categorySheet = XLSX.utils.aoa_to_sheet([
      ['category', 'products', 'units', 'estimated_total', 'with_article', 'with_image', 'with_description'],
      ...Object.entries(categorySummary(localProducts)).map(([cat, info]) => [cat, info.count, info.units, info.sum, info.withArticle, info.withImage, info.withDescription]),
    ]);
    const issuesSheet = XLSX.utils.aoa_to_sheet([
      ['id', 'article', 'name', 'category', 'price', 'units', 'issues'],
      ...localProducts
        .map(normalizeProductForStorage)
        .map(p => ({
          p,
          issues: [
            !productArticle(p) ? 'no_article' : '',
            !p.image ? 'no_image' : '',
            !String(p.description ?? '').trim() ? 'no_description' : '',
          ].filter(Boolean),
        }))
        .filter(row => row.issues.length > 0)
        .map(({ p, issues }) => [p.id, productArticle(p), productDisplayName(p), p.category, p.price, productUnits(p), issues.join('; ')]),
    ]);
    const stats = buildStatsJson(localProducts);
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['metric', 'value'],
      ['generatedAt', stats.generatedAt],
      ['products', stats.totals.products],
      ['categories', stats.totals.categories],
      ['units', stats.totals.units],
      ['estimatedTotal', stats.totals.estimatedTotal],
      ['tagged', stats.totals.tagged],
      ['withArticle', stats.totals.withArticle],
      ['withImage', stats.totals.withImage],
      ['withDescription', stats.totals.withDescription],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, productsSheet, 'Products');
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Categories');
    XLSX.utils.book_append_sheet(wb, issuesSheet, 'Issues');
    XLSX.writeFile(wb, `lumu-products-report-${exportDate()}.xlsx`);
    showToast('Excel XLSX вигружено');
  };

  const handleExportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) {
      setSaveError('Браузер заблокував PDF-вікно. Дозвольте pop-ups для адмінки.');
      return;
    }
    win.document.open();
    win.document.write(buildPrintableReportHtml(localProducts));
    win.document.close();
    showToast('PDF звіт відкрито для друку/збереження');
  };

  const [imageFetchProgress, setImageFetchProgress] = useState<{ done: number; total: number; running: boolean }>({ done: 0, total: 0, running: false });

  const handleAutoFetchImages = async () => {
    const productsWithoutImage = localProducts.filter(p => !p.image);
    if (productsWithoutImage.length === 0) {
      showToast('Усі товари вже мають фото', 'info');
      return;
    }
    const batchSize = Math.min(productsWithoutImage.length, 50);
    const batch = productsWithoutImage.slice(0, batchSize);
    setImageFetchProgress({ done: 0, total: batch.length, running: true });
    pushHistory(localProducts);
    let found = 0;
    const updatedProducts = [...localProducts];

    for (let i = 0; i < batch.length; i++) {
      const product = batch[i];
      const searchName = product.name.replace(/\s*\d{4,}\s*/g, '').trim();
      try {
        const query = encodeURIComponent(searchName + ' купити');
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.google.com/search?q=' + query + '&tbm=isch&udm=2')}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const html = await res.text();
          const imgMatches = html.match(/\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)",\d+,\d+\]/gi);
          if (imgMatches && imgMatches.length > 0) {
            for (const m of imgMatches) {
              const urlMatch = m.match(/"(https?:\/\/[^"]+)"/);
              if (urlMatch) {
                const imgUrl = urlMatch[1];
                if (!imgUrl.includes('google') && !imgUrl.includes('gstatic') && imgUrl.length < 500) {
                  const idx = updatedProducts.findIndex(p => p.id === product.id);
                  if (idx >= 0) {
                    updatedProducts[idx] = { ...updatedProducts[idx], image: imgUrl };
                    found++;
                  }
                  break;
                }
              }
            }
          }
        }
      } catch {}
      setImageFetchProgress({ done: i + 1, total: batch.length, running: true });
      await new Promise(r => setTimeout(r, 300));
    }

    setLocalProducts(updatedProducts);
    hasLocalChangesRef.current = true;
    setImageFetchProgress({ done: batch.length, total: batch.length, running: false });
    showToast(`Знайдено фото для ${found} з ${batch.length} товарів. Натисніть «Зберегти».`);
  };

  const handleExtractArticles = () => {
    const normalized = localProducts.map(normalizeProductForStorage);
    const changed = normalized.filter((p, idx) => {
      const original = localProducts[idx];
      return productArticle(p) !== String(original.article ?? '').trim() || p.name !== original.name || productUnits(p) !== productUnits(original);
    }).length;
    if (changed === 0) {
      showToast('Артикули вже впорядковані', 'info');
      return;
    }
    hasLocalChangesRef.current = true;
    setLocalProducts(normalized);
    showToast(`Витягнуто артикули у ${changed} товарах. Натисніть «Зберегти в GitHub».`);
  };

  const handleImportProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setSaveError('Не вдалося прочитати файл');
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try {
        const data = JSON.parse(text);
        const source = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : null;
        if (!source) {
          setSaveError('JSON має бути масивом товарів або обʼєктом { products: [...] }');
          return;
        }
        const valid = source
          .map((p: Partial<Product>, i: number) => p && typeof p === 'object' ? normalizeImportedProduct(p, i, 'Книги') : null)
          .filter((p: Product | null): p is Product => Boolean(p));
        if (valid.length === 0) {
          setSaveError('У файлі немає валідних товарів');
          return;
        }
        const withUniqueIds = valid.map((p, idx) => ({ ...p, id: idx + 1 }));
        hasLocalChangesRef.current = true;
        setLocalProducts(withUniqueIds);
        setNewProductIds(new Set());
        setSaveError('');
        showToast(`Завантажено ${withUniqueIds.length} товарів. Натисніть «Зберегти в GitHub».`);
      } catch {
        const parsed = parseDelimitedProducts(text, 'Книги').map((p, idx) => ({ ...p, id: idx + 1 }));
        if (parsed.length === 0) {
          setSaveError('Не вдалося прочитати файл: JSON, CSV або TXT з назвами товарів');
          return;
        }
        hasLocalChangesRef.current = true;
        setLocalProducts(parsed);
        setNewProductIds(new Set());
        setSaveError('');
        showToast(`Автозавантажено ${parsed.length} товарів. Артикул/ціна/юніти перенесені в поля.`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSaveAll = async () => {
    if (saving) return;
    setSaveError('');
    setSaving(true);
    try {
      const payload = productExportPayload(localProducts);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(payload));
      setNewProductIds(new Set());
      skipSyncRef.current = true;
      hasLocalChangesRef.current = false;
      refetch().catch(() => {});
      showToast('Збережено локально');
    } catch (err) {
      setSaveError((err as Error).message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen pt-12 px-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-8">
            <ExternalLink className="w-4 h-4" />
            На головну
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center shadow-sm">
              <Lock className="w-7 h-7 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Адмін-панель</h1>
              <p className="text-sm text-gray-500">Редагування товарів</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Пароль адміністратора"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Увійти
            </button>
          </form>
          <p className="mt-4 text-xs text-gray-400 text-center">
            Локальна адмін-панель
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 z-10 -mx-6 px-6 py-4 mb-8 bg-white/95 backdrop-blur-md border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl flex-wrap">
                <button onClick={() => setAdminTab('dashboard')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${adminTab === 'dashboard' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  <BarChart3 className="w-4 h-4" />
                  Дашборд
                </button>
                <button onClick={() => setAdminTab('products')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${adminTab === 'products' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  Товари
                </button>
                <button onClick={() => setAdminTab('analytics')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${adminTab === 'analytics' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  <BarChart3 className="w-4 h-4" />
                  Аналітика
                </button>
                <button onClick={() => setAdminTab('orders')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${adminTab === 'orders' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  <ShoppingCart className="w-4 h-4" />
                  Замовлення
                </button>
                <button onClick={() => setAdminTab('sections')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${adminTab === 'sections' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  <FileText className="w-4 h-4" />
                  Розділи
                </button>
                <button onClick={() => setAdminTab('banners')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${adminTab === 'banners' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  <ImageLucide className="w-4 h-4" />
                  Банери
                </button>
                <button onClick={() => setAdminTab('instagram')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${adminTab === 'instagram' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>
                  Instagram
                </button>
              </div>
              {adminTab === 'products' && <span className="text-sm text-gray-500">{totalProducts} товарів</span>}
              {hasUnsaved && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">Є зміни</span>}
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" target="_blank" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black px-3 py-2 rounded-lg hover:bg-gray-100">
                <ExternalLink className="w-4 h-4" />
                На сайт
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black px-3 py-2 rounded-lg hover:bg-gray-100">
                <LogOut className="w-4 h-4" />
                Вийти
              </button>
              {adminTab === 'products' && (
                <div className="flex items-center gap-2">
                  <button onClick={undo} disabled={historyIndex <= 0} title="Скасувати (Ctrl+Z)" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all">
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Повторити (Ctrl+Y)" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all">
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Зберегти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {saveError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start justify-between gap-3">
            <span>{saveError}</span>
            <button onClick={() => setSaveError('')} className="p-1 hover:bg-red-100 rounded-lg shrink-0" title="Закрити">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {adminTab === 'products' && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button onClick={handleExportProducts} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Вигрузити JSON
            </button>
            <button onClick={handleExportReport} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              Повний звіт CSV
            </button>
            <button onClick={handleExportProductsCsv} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Товари CSV
            </button>
            <button onClick={handleExportStatsJson} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <BarChart3 className="w-4 h-4" />
              Статистика JSON
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Excel XLSX
            </button>
            <button onClick={handleExportPdf} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              PDF звіт
            </button>
            <button onClick={handleExtractArticles} className="flex items-center gap-2 text-sm text-violet-700 hover:text-violet-900 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100">
              <Sparkles className="w-4 h-4" />
              Витягнути артикули
            </button>
            <button
              onClick={handleAutoFetchImages}
              disabled={imageFetchProgress.running}
              className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
            >
              {imageFetchProgress.running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageLucide className="w-4 h-4" />}
              {imageFetchProgress.running ? `Пошук фото ${imageFetchProgress.done}/${imageFetchProgress.total}...` : 'Автопошук фото'}
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              Автозавантажити товари
              <input ref={importInputRef} type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" className="hidden" onChange={handleImportProducts} />
            </label>

          </div>
        )}

        {adminTab === 'dashboard' ? (
          <AdminDashboard
            localProducts={localProducts}
            hasUnsaved={hasUnsaved}
            onOpenProducts={() => setAdminTab('products')}
            onOpenSections={() => setAdminTab('sections')}
            onExportProducts={handleExportProducts}
            onExportProductsCsv={handleExportProductsCsv}
            onExportReport={handleExportReport}
            onExportStatsJson={handleExportStatsJson}
            onExportCategoriesCsv={handleExportCategoriesCsv}
            onExportIssuesCsv={handleExportIssuesCsv}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onExtractArticles={handleExtractArticles}
          />
        ) : adminTab === 'analytics' ? (
          <AnalyticsCharts products={localProducts} />
        ) : adminTab === 'orders' ? (
          <OrdersManager />
        ) : adminTab === 'banners' ? (
          <BannersEditor />
        ) : adminTab === 'instagram' ? (
          <InstagramManager />
        ) : adminTab === 'sections' ? (
          <SiteContentEditor
            content={siteContent}
            onSave={refetchSiteContent}
          />
        ) : loading ? (
          <div className="py-16 space-y-4">
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse max-w-[75%]" />
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse max-w-[50%]" />
            <div className="grid gap-3 mt-8">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <AdminSections
            localProducts={localProducts}
            imagePreviews={imagePreviews}
            newProductIds={newProductIds}
            onEdit={setEditing}
            onDelete={handleDeleteProduct}
            onAdd={handleAddProduct}
            getProductGradient={getProductGradient}
            dragIdx={dragIdx}
            dragOverIdx={dragOverIdx}
            onDragStart={setDragIdx}
            onDragOver={setDragOverIdx}
            onDrop={handleDragDrop}
          />
        )}
      </div>

      <AnimatePresence>
        {editing && (
        <ProductEditModal
          product={editing}
          onSave={(p) => { setImagePreviews(prev => { const next = { ...prev }; delete next[p.id]; return next; }); handleSaveProduct(p); }}
          onDelete={() => handleDeleteProduct(editing.id, editing.name)}
          onClose={() => { if (editing) setImagePreviews(prev => { const next = { ...prev }; delete next[editing.id]; return next; }); setEditing(null); }}
          onFormChange={(updated) => {
            hasLocalChangesRef.current = true;
            setLocalProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
            setEditing(updated);
          }}
          onImagePreview={(productId, dataUrl) => setImagePreviews(prev => dataUrl ? { ...prev, [productId]: dataUrl } : (() => { const next = { ...prev }; delete next[productId]; return next; })())}
        />
        )}
      </AnimatePresence>
    </div>
  );
};

function formatAdminMoney(value: number) {
  return value.toLocaleString('uk-UA') + ' ₴';
}

function AdminDashboard({
  localProducts,
  hasUnsaved,
  onOpenProducts,
  onOpenSections,
  onExportProducts,
  onExportProductsCsv,
  onExportReport,
  onExportStatsJson,
  onExportCategoriesCsv,
  onExportIssuesCsv,
  onExportExcel,
  onExportPdf,
  onExtractArticles,
}: {
  localProducts: Product[];
  hasUnsaved: boolean;
  onOpenProducts: () => void;
  onOpenSections: () => void;
  onExportProducts: () => void;
  onExportProductsCsv: () => void;
  onExportReport: () => void;
  onExportStatsJson: () => void;
  onExportCategoriesCsv: () => void;
  onExportIssuesCsv: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExtractArticles: () => void;
}) {
  const stats = useMemo(() => {
    const categoriesMap = localProducts.reduce<Record<string, { count: number; units: number; value: number }>>((acc, p) => {
      const cat = String(p.category || 'Інше');
      const price = parseInt(String(p.price || '').replace(/\s/g, '').replace('₴', ''), 10) || 0;
      const units = productUnits(p);
      acc[cat] = acc[cat] || { count: 0, units: 0, value: 0 };
      acc[cat].count += 1;
      acc[cat].units += units;
      acc[cat].value += price * units;
      return acc;
    }, {});
    const categoryRows = Object.keys(categoriesMap)
      .map(cat => ({ category: cat, ...categoriesMap[cat] }))
      .sort((a, b) => b.count - a.count);
    const noArticle = localProducts.filter(p => !productArticle(p)).length;
    const noImage = localProducts.filter(p => !p.image).length;
    const noDescription = localProducts.filter(p => !String(p.description ?? '').trim()).length;
    const totalUnits = localProducts.reduce((sum, p) => sum + productUnits(p), 0);
    const totalValue = categoryRows.reduce((sum, row) => sum + row.value, 0);
    const tagged = localProducts.filter(p => String(p.tag || '').trim()).length;
    return { categoryRows, noArticle, noImage, noDescription, totalUnits, totalValue, tagged };
  }, [localProducts]);



  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950 text-white p-6 shadow-xl overflow-hidden relative">
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-violet-200 mb-2">Lumu admin</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Дашборд товарів</h1>
            <p className="text-sm text-white/60 mt-2 max-w-xl">Швидкий зріз каталогу та заповненості карток.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onExtractArticles} className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-400 transition-colors">Витягнути артикули</button>
            <button onClick={onOpenProducts} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-violet-100 transition-colors">До товарів</button>
            <button onClick={onOpenSections} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 transition-colors">Розділи сайту</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Товарів" value={localProducts.length.toLocaleString('uk-UA')} hint={`${stats.categoryRows.length} категорій`} />
        <DashboardCard label="Юнітів" value={stats.totalUnits.toLocaleString('uk-UA')} hint="за полем units" />
        <DashboardCard label="Оціночна сума" value={formatAdminMoney(stats.totalValue)} hint="ціна × юніти" />
        <DashboardCard label="З тегами" value={stats.tagged.toLocaleString('uk-UA')} hint="хіти, акції, новинки" />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Вигрузки та статистика</h2>
            <p className="text-sm text-gray-500">Окремі файли для обліку, Excel/Google Sheets, контролю якості та повторного імпорту.</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 self-start sm:self-auto">{localProducts.length.toLocaleString('uk-UA')} товарів</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExportAction title="Excel XLSX" hint="Summary, Products, Categories, Issues" onClick={onExportExcel} />
          <ExportAction title="PDF звіт" hint="відкриває друк, можна зберегти як PDF" onClick={onExportPdf} />
          <ExportAction title="Повний звіт CSV" hint="товари, категорії, проблемні картки" onClick={onExportReport} />
          <ExportAction title="Товари JSON" hint="для резервної копії та імпорту" onClick={onExportProducts} />
          <ExportAction title="Товари CSV" hint="таблиця товарів для Excel/Sheets" onClick={onExportProductsCsv} />
          <ExportAction title="Статистика JSON" hint="підсумки, категорії, quality списки" onClick={onExportStatsJson} />
          <ExportAction title="Категорії CSV" hint="товари, юніти, сума, заповненість" onClick={onExportCategoriesCsv} />
          <ExportAction title="Проблемні товари CSV" hint="без артикула, фото або опису" onClick={onExportIssuesCsv} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Категорії</h2>
            <span className="text-xs text-gray-400">топ за кількістю товарів</span>
          </div>
          <div className="space-y-3">
            {stats.categoryRows.slice(0, 7).map(row => {
              const pct = localProducts.length ? Math.round((row.count / localProducts.length) * 100) : 0;
              return (
                <div key={row.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{row.category}</span>
                    <span className="text-gray-500">{row.count} товарів · {row.units} од.</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Контроль якості</h2>
          <div className="space-y-3">
            <DashboardWarning label="Без артикула" value={stats.noArticle} />
            <DashboardWarning label="Без фото" value={stats.noImage} />
            <DashboardWarning label="Без опису" value={stats.noDescription} />
            {hasUnsaved && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-100">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm font-medium">Є незбережені зміни. Натисни «Зберегти» у вкладці товарів.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border p-4 bg-emerald-50 text-emerald-700 border-emerald-100">
        <p className="text-sm font-bold">Локальний режим</p>
        <p className="text-xs mt-1 opacity-80">Дані зберігаються в браузері (localStorage). Використовуйте «Вигрузити JSON» для резервної копії.</p>
      </div>
    </div>
  );
}

function DashboardCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}

function ExportAction({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left p-4 rounded-2xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-violet-200 hover:shadow-md transition-all"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <Download className="w-4 h-4 text-violet-600 group-hover:translate-y-0.5 transition-transform" />
        {title}
      </span>
      <span className="block text-xs text-gray-500 mt-1 leading-relaxed">{hint}</span>
    </button>
  );
}

function DashboardWarning({ label, value }: { label: string; value: number }) {
  const isOk = value === 0;
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${isOk ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-black">{value.toLocaleString('uk-UA')}</span>
    </div>
  );
}

const TAG_PRESETS = ['Хіт продажу', 'Сезонні', 'Акція', 'New', 'Розмальовки', 'Наліпки', 'Подарунковий набір', ''];

type ProductQualityFilter = 'all' | 'new' | 'tagged' | 'no-article' | 'no-image' | 'no-description';
type ProductSortMode = 'name' | 'price-desc' | 'price-asc' | 'units-desc' | 'id-desc';
type ProductViewMode = 'cards' | 'table';

function productQualityIssues(product: Product) {
  return [
    !productArticle(product) ? 'Без артикула' : '',
    !product.image ? 'Без фото' : '',
    !String(product.description ?? '').trim() ? 'Без опису' : '',
  ].filter(Boolean);
}

function productMatchesQuality(product: Product, quality: ProductQualityFilter, newProductIds: Set<number>) {
  if (quality === 'all') return true;
  if (quality === 'new') return newProductIds.has(product.id);
  if (quality === 'tagged') return Boolean(String(product.tag || '').trim());
  if (quality === 'no-article') return !productArticle(product);
  if (quality === 'no-image') return !product.image;
  if (quality === 'no-description') return !String(product.description ?? '').trim();
  return true;
}

function sortProductsForAdmin(items: Product[], sortBy: ProductSortMode) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortBy === 'price-desc') return priceNumber(b) - priceNumber(a) || a.id - b.id;
    if (sortBy === 'price-asc') return priceNumber(a) - priceNumber(b) || a.id - b.id;
    if (sortBy === 'units-desc') return productUnits(b) - productUnits(a) || a.id - b.id;
    if (sortBy === 'id-desc') return b.id - a.id;
    return productDisplayName(a).localeCompare(productDisplayName(b), 'uk') || a.id - b.id;
  });
  return sorted;
}

const fieldClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 outline-none text-base leading-relaxed transition-colors';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

function AdminField({ label, value, onChange, multiline, rows = 6, hint, maxLength }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number; hint?: string; maxLength?: number }) {
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          className={`${fieldClass} resize-y min-h-[120px]`}
          placeholder="Введі текст..."
        />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} className={fieldClass} placeholder="Введі текст..." />
      )}
      {maxLength && <p className="text-xs text-gray-400 mt-1">{value.length}/{maxLength}</p>}
    </div>
  );
}

function AdminSection({ id, title, isOpen, onToggle, children }: { id: string; title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span className="text-gray-400">{isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</span>
      </button>
      {isOpen && <div className="px-6 pb-6 pt-0 space-y-4 border-t border-gray-100">{children}</div>}
    </section>
  );
}

function SiteContentEditor({ content, onSave }: {
  content: import('../context/SiteContentContext').SiteContent;
  onSave: () => void;
}) {
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(content)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const prevContentRef = useRef<string>('');

  useEffect(() => {
    const key = JSON.stringify(content);
    if (prevContentRef.current !== key) {
      prevContentRef.current = key;
      setForm(JSON.parse(JSON.stringify(content)));
    }
  }, [content]);

  const handleSave = async () => {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(form));
      setOk(true);
      onSave();
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    hero: true, about: true, delivery: true, contacts: true, categories: true, editorial: true, reviews: true,
  });
  const toggleSection = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {ok && <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm">Збережено</div>}

      <AdminSection id="hero" title="Головна (Hero)" isOpen={expanded.hero ?? true} onToggle={() => toggleSection('hero')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Адреса" value={form.hero?.address ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, hero: { ...p.hero, address: v } }))} />
          <AdminField label="Години (коротко)" value={form.hero?.workingHours ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, hero: { ...p.hero, workingHours: v } }))} />
          <AdminField label="Години (повно)" value={form.hero?.workingHoursShort ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, hero: { ...p.hero, workingHoursShort: v } }))} />
        </div>
      </AdminSection>

      <AdminSection id="about" title="Про нас" isOpen={expanded.about ?? true} onToggle={() => toggleSection('about')}>
        <AdminField label="Заголовок" value={form.about?.title ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, about: { ...p.about, title: v } }))} />
        <AdminField label="Підзаголовок" value={form.about?.subtitle ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, about: { ...p.about, subtitle: v } }))} />
        <AdminField label="Вступ" value={form.about?.intro ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, about: { ...p.about, intro: v } }))} multiline rows={4} hint="Абзаци через Enter" />
        <AdminField label="Другий абзац" value={form.about?.paragraph2 ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, about: { ...p.about, paragraph2: v } }))} multiline rows={4} hint="Абзаци через Enter" />
        <AdminField label="Футер" value={form.about?.footer ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, about: { ...p.about, footer: v } }))} />
      </AdminSection>

      <AdminSection id="delivery" title="Доставка та оплата" isOpen={expanded.delivery ?? true} onToggle={() => toggleSection('delivery')}>
        <AdminField label="Заголовок сторінки" value={form.delivery?.title ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, title: v } }))} />
        <AdminField label="Заголовок «Доставка»" value={form.delivery?.deliveryTitle ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, deliveryTitle: v } }))} />
        <AdminField label="Текст доставки" value={form.delivery?.deliveryText ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, deliveryText: v } }))} multiline rows={8} hint="Абзаци через Enter" />
        <AdminField label="Заголовок «Оплата»" value={form.delivery?.paymentTitle ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, paymentTitle: v } }))} />
        <AdminField label="Текст оплати" value={form.delivery?.paymentText ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, paymentText: v } }))} multiline rows={6} hint="Абзаци через Enter" />
        <AdminField label="Заголовок «Повернення»" value={form.delivery?.returnsTitle ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, returnsTitle: v } }))} />
        <AdminField label="Текст повернення" value={form.delivery?.returnsText ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, delivery: { ...p.delivery, returnsText: v } }))} multiline rows={6} hint="Абзаци через Enter" />
      </AdminSection>

      <AdminSection id="contacts" title="Контакти" isOpen={expanded.contacts ?? true} onToggle={() => toggleSection('contacts')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Заголовок" value={form.contacts?.title ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, contacts: { ...p.contacts, title: v } }))} />
          <AdminField label="Адреса" value={form.contacts?.address ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, contacts: { ...p.contacts, address: v } }))} />
          <AdminField label="Режим роботи" value={form.contacts?.workingHours ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, contacts: { ...p.contacts, workingHours: v } }))} />
          <AdminField label="Телефон" value={form.contacts?.phone ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, contacts: { ...p.contacts, phone: v } }))} />
          <AdminField label="Email" value={form.contacts?.email ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, contacts: { ...p.contacts, email: v } }))} />
        </div>
      </AdminSection>

      <AdminSection id="categories" title="Карточки категорій" isOpen={expanded.categories ?? true} onToggle={() => toggleSection('categories')}>
        <p className="text-sm text-gray-500 mb-4">Описи та градієнти для карток категорій на головній сторінці.</p>
        {[
          { key: 'books', label: 'Книги' },
          { key: 'toys', label: 'Іграшки' },
          { key: 'ownProduction', label: 'Власне виробництво' },
          { key: 'creativity', label: 'Творчість' },
          { key: 'boardGames', label: 'Настільні ігри' },
          { key: 'seasonal', label: 'Сезонні товари' },
          { key: 'promo', label: 'Акційні позиції' },
        ].map(({ key, label }) => (
          <div key={key} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 mb-4 space-y-3">
            <h4 className="text-sm font-bold text-gray-700">{label}</h4>
            <AdminField label="Опис" value={form.categories?.[key as keyof typeof form.categories] ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, categories: { ...p.categories, [key]: v } }))} multiline rows={2} hint="До 300 символів" maxLength={300} />
            <AdminField label="Градієнт" value={form.categoryGradients?.[label] ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, categoryGradients: { ...p.categoryGradients, [label]: v } }))} hint="linear-gradient(135deg, hsl(...) 0%, hsl(...) 100%)" />
          </div>
        ))}
      </AdminSection>

      <AdminSection id="editorial" title="Журнал (Editorial)" isOpen={expanded.editorial ?? true} onToggle={() => toggleSection('editorial')}>
        <AdminField label="Заголовок" value={form.editorial?.title ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, editorial: { ...p.editorial, title: v } }))} />
        <AdminField label="Текст посилання" value={form.editorial?.linkText ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, editorial: { ...p.editorial, linkText: v } }))} />
        <div className="pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Статті журналу</h3>
            <button
              type="button"
              onClick={() => setForm((p: typeof form) => {
                const arts = p.editorial?.articles ?? [];
                const nextId = Math.max(0, ...arts.map((a: { id: number }) => a.id)) + 1;
                return { ...p, editorial: { ...p.editorial, articles: [...arts, { id: nextId, title: 'Нова стаття', category: 'Новинки', description: '', gradient: 'linear-gradient(135deg, hsl(200, 70%, 55%) 0%, hsl(250, 65%, 65%) 100%)' }] } };
              })}
              className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              <Plus className="w-4 h-4" />
              Додати статтю
            </button>
          </div>
          <div className="space-y-4">
            {(form.editorial?.articles ?? []).map((art, i) => (
              <div key={art.id} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Стаття {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setForm((p: typeof form) => ({ ...p, editorial: { ...p.editorial, articles: (p.editorial?.articles ?? []).filter((_, j) => j !== i) } }))}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="Видалити"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <AdminField label="Назва" value={art.title} onChange={v => setForm((p: typeof form) => ({
                  ...p, editorial: { ...p.editorial, articles: (p.editorial?.articles ?? []).map((a, j) => j === i ? { ...a, title: v } : a) }
                }))} />
                <AdminField label="Категорія" value={art.category} onChange={v => setForm((p: typeof form) => ({
                  ...p, editorial: { ...p.editorial, articles: (p.editorial?.articles ?? []).map((a, j) => j === i ? { ...a, category: v } : a) }
                }))} />
                <AdminField label="Опис" value={art.description} onChange={v => setForm((p: typeof form) => ({
                  ...p, editorial: { ...p.editorial, articles: (p.editorial?.articles ?? []).map((a, j) => j === i ? { ...a, description: v } : a) }
                }))} multiline rows={3} />
                <AdminField label="Градієнт" value={art.gradient ?? ''} onChange={v => setForm((p: typeof form) => ({
                  ...p, editorial: { ...p.editorial, articles: (p.editorial?.articles ?? []).map((a, j) => j === i ? { ...a, gradient: v } : a) }
                }))} hint="Наприклад: linear-gradient(135deg, hsl(340, 75%, 60%) 0%, hsl(20, 85%, 65%) 100%)" />
              </div>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection id="reviews" title="Відгуки" isOpen={expanded.reviews ?? true} onToggle={() => toggleSection('reviews')}>
        <AdminField label="Заголовок" value={form.reviews?.title ?? ''} onChange={v => setForm((p: typeof form) => ({ ...p, reviews: { ...p.reviews, title: v } }))} />
        <div className="pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Карточки відгуків</h3>
            <button
              type="button"
              onClick={() => setForm((p: typeof form) => {
                const items = p.reviews?.items ?? [];
                const nextId = Math.max(0, ...items.map((it: { id: number }) => it.id)) + 1;
                return { ...p, reviews: { ...p.reviews, items: [...items, { id: nextId, name: 'Новий відгук', rating: 5, text: '', date: new Date().toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }) }] } };
              })}
              className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              <Plus className="w-4 h-4" />
              Додати відгук
            </button>
          </div>
          <div className="space-y-4">
            {(form.reviews?.items ?? []).map((item, i) => (
              <div key={item.id} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Відгук {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setForm((p: typeof form) => ({ ...p, reviews: { ...p.reviews, items: (p.reviews?.items ?? []).filter((_, j) => j !== i) } }))}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="Видалити"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminField label="Імʼя" value={item.name} onChange={v => setForm((p: typeof form) => ({
                    ...p, reviews: { ...p.reviews, items: (p.reviews?.items ?? []).map((it, j) => j === i ? { ...it, name: v } : it) }
                  }))} />
                  <AdminField label="Дата" value={item.date} onChange={v => setForm((p: typeof form) => ({
                    ...p, reviews: { ...p.reviews, items: (p.reviews?.items ?? []).map((it, j) => j === i ? { ...it, date: v } : it) }
                  }))} />
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Рейтинг (1–5)</label>
                    <select
                      value={String(item.rating ?? 5)}
                      onChange={e => setForm((p: typeof form) => ({
                        ...p, reviews: { ...p.reviews, items: (p.reviews?.items ?? []).map((it, j) => j === i ? { ...it, rating: parseInt(e.target.value, 10) || 5 } : it) }
                      }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/20"
                    >
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                    </select>
                  </div>
                </div>
                <AdminField label="Текст відгуку" value={item.text} onChange={v => setForm((p: typeof form) => ({
                  ...p, reviews: { ...p.reviews, items: (p.reviews?.items ?? []).map((it, j) => j === i ? { ...it, text: v } : it) }
                }))} multiline rows={4} />
              </div>
            ))}
          </div>
        </div>
      </AdminSection>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-800 transition-colors">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Зберегти розділи
        </button>
      </div>
    </div>
  );
}

function AdminSections({
  localProducts,
  imagePreviews = {},
  newProductIds = new Set(),
  onEdit,
  onDelete,
  onAdd,
  getProductGradient,
  dragIdx,
  dragOverIdx,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  localProducts: Product[];
  imagePreviews?: Record<number, string>;
  newProductIds?: Set<number>;
  onEdit: (p: Product) => void;
  onDelete: (id: number, name?: string) => void;
  onAdd: (category: string) => void;
  getProductGradient: (id: number, category: string) => string;
  dragIdx: number | null;
  dragOverIdx: number | null;
  onDragStart: (idx: number | null) => void;
  onDragOver: (idx: number | null) => void;
  onDrop: (from: number, to: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_CATEGORIES.map(c => [c, true]))
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Всі');
  const [qualityFilter, setQualityFilter] = useState<ProductQualityFilter>('all');
  const [sortBy, setSortBy] = useState<ProductSortMode>('name');
  const [viewMode, setViewMode] = useState<ProductViewMode>('cards');

  const categoryOptions = useMemo(() => {
    const values = new Set<string>([...ADMIN_CATEGORIES, ...localProducts.map(p => String(p.category || '').trim() || 'Інше'), 'Інше']);
    return ['Всі', ...Array.from(values).filter(Boolean)];
  }, [localProducts]);

  const qualityCounts = useMemo(() => ({
    all: localProducts.length,
    new: localProducts.filter(p => newProductIds.has(p.id)).length,
    tagged: localProducts.filter(p => String(p.tag || '').trim()).length,
    noArticle: localProducts.filter(p => !productArticle(p)).length,
    noImage: localProducts.filter(p => !p.image).length,
    noDescription: localProducts.filter(p => !String(p.description ?? '').trim()).length,
  }), [localProducts, newProductIds]);

  const byCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    const targets = categoryFilter === 'Всі' ? categoryOptions.filter(c => c !== 'Всі') : [categoryFilter];
    for (const c of targets) map[c] = [];
    const q = search.trim().toLowerCase();
    for (const p of localProducts) {
      const cat = String(p.category || '').trim() || 'Інше';
      if (categoryFilter !== 'Всі' && cat !== categoryFilter) continue;
      if (!productMatchesQuality(p, qualityFilter, newProductIds)) continue;
      const haystack = [
        productDisplayName(p),
        productArticle(p),
        p.tag,
        p.price,
        p.category,
        p.description,
        String(p.id),
      ].join(' ').toLowerCase();
      if (q && !haystack.includes(q)) continue;
      if (map[cat]) map[cat].push(p);
      else if (categoryFilter === 'Всі') map[cat] = [p];
    }
    for (const c of Object.keys(map)) {
      map[c] = sortProductsForAdmin(map[c], sortBy);
    }
    return map;
  }, [localProducts, categoryFilter, categoryOptions, qualityFilter, newProductIds, search, sortBy]);

  const toggle = (cat: string) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  const catsToShow = useMemo(() => {
    const list = categoryFilter === 'Всі' ? categoryOptions.filter(c => c !== 'Всі') : [categoryFilter];
    return list.filter(cat => (byCategory[cat]?.length ?? 0) > 0 || categoryFilter !== 'Всі');
  }, [byCategory, categoryFilter, categoryOptions]);

  const totalFiltered = useMemo(() => catsToShow.reduce((s, c) => s + (byCategory[c]?.length ?? 0), 0), [catsToShow, byCategory]);
  const hasActiveFilters = search.trim() || categoryFilter !== 'Всі' || qualityFilter !== 'all' || sortBy !== 'name';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-900">Каталог товарів</h2>
              <p className="text-sm text-gray-500 mt-1">Пошук, аудит якості, швидке редагування і зручний табличний режим для великих списків.</p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`h-10 px-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'cards' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                aria-label="Показати картками"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Картки</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`h-10 px-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'table' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                aria-label="Показати таблицею"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Таблиця</span>
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Пошук: назва, артикул, ціна, тег, опис..."
                className="w-full h-12 pl-10 pr-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-gray-50/50 text-base"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Очистити пошук">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <label className="relative">
              <span className="sr-only">Категорія</span>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full h-12 pl-10 pr-8 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium"
              >
                {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">Сортування</span>
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as ProductSortMode)}
                className="w-full h-12 pl-10 pr-8 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium"
              >
                <option value="name">Назва A-Z</option>
                <option value="price-desc">Ціна: дорожчі</option>
                <option value="price-asc">Ціна: дешевші</option>
                <option value="units-desc">Юніти: більше</option>
                <option value="id-desc">Нові ID зверху</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <QualityButton active={qualityFilter === 'all'} icon={<PackageCheck className="w-4 h-4" />} label="Всі" value={qualityCounts.all} onClick={() => setQualityFilter('all')} />
            <QualityButton active={qualityFilter === 'new'} icon={<Sparkles className="w-4 h-4" />} label="Нові" value={qualityCounts.new} onClick={() => setQualityFilter('new')} />
            <QualityButton active={qualityFilter === 'tagged'} icon={<Eye className="w-4 h-4" />} label="З тегом" value={qualityCounts.tagged} onClick={() => setQualityFilter('tagged')} />
            <QualityButton active={qualityFilter === 'no-article'} icon={<FileWarning className="w-4 h-4" />} label="Без артикула" value={qualityCounts.noArticle} onClick={() => setQualityFilter('no-article')} />
            <QualityButton active={qualityFilter === 'no-image'} icon={<ImageIcon className="w-4 h-4" />} label="Без фото" value={qualityCounts.noImage} onClick={() => setQualityFilter('no-image')} />
            <QualityButton active={qualityFilter === 'no-description'} icon={<FileText className="w-4 h-4" />} label="Без опису" value={qualityCounts.noDescription} onClick={() => setQualityFilter('no-description')} />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setCategoryFilter('Всі'); setQualityFilter('all'); setSortBy('name'); }}
                className="shrink-0 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-500 hover:text-gray-900 hover:border-gray-300"
              >
                Скинути
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
            <span>Показано <b className="text-gray-900">{totalFiltered.toLocaleString('uk-UA')}</b> з {localProducts.length.toLocaleString('uk-UA')} товарів</span>
            <span className="text-xs text-gray-400">Клік по картці або рядку відкриває редагування</span>
          </div>
        </div>
      </div>

      {totalFiltered === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-14 px-6 text-center">
          <p className="text-lg font-bold text-gray-900">Нічого не знайдено</p>
          <p className="text-sm text-gray-500 mt-1">Змініть пошук або фільтри, щоб повернути товари в список.</p>
        </div>
      )}

      {catsToShow.map(cat => {
        const items = byCategory[cat] ?? [];
        const isOpen = expanded[cat] ?? true;
        const icon = CATEGORY_ICONS[cat];
        return (
          <motion.section
            key={cat}
            initial={false}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-gray-50/80 transition-colors">
              <button
                type="button"
                onClick={() => toggle(cat)}
                className="flex flex-1 items-center gap-4 text-left min-w-0"
                aria-expanded={isOpen}
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{cat}</h2>
                  <p className="text-sm text-gray-500">{items.length} товарів</p>
                </div>
                <span className="text-gray-400 shrink-0">
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAdd(cat)}
                className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Додати</span>
              </button>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    {items.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="mb-2">Немає товарів у цьому розділі</p>
                        <button
                          onClick={() => onAdd(cat)}
                          className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Додати перший товар
                        </button>
                      </div>
                    ) : viewMode === 'table' ? (
                      <ProductAdminTable
                        products={items}
                        imagePreviews={imagePreviews}
                        newProductIds={newProductIds}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <AnimatePresence mode="popLayout">
                        {items.map(product => {
                          const globalIdx = localProducts.indexOf(product);
                          const productForDisplay = imagePreviews[product.id] ? { ...product, image: imagePreviews[product.id] } : product;
                          const isNew = newProductIds.has(product.id);
                          const isDragging = dragIdx === globalIdx;
                          const isDragOver = dragOverIdx === globalIdx;
                          return (
                            <div
                              key={product.id}
                              draggable
                              onDragStart={() => onDragStart(globalIdx)}
                              onDragOver={e => { e.preventDefault(); onDragOver(globalIdx); }}
                              onDrop={e => { e.preventDefault(); if (dragIdx !== null) onDrop(dragIdx, globalIdx); }}
                              onDragEnd={() => { onDragStart(null); onDragOver(null); }}
                              className={`relative ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'ring-2 ring-violet-500 ring-offset-2 rounded-2xl' : ''}`}
                            >
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <ProductAdminCard
                                product={product}
                                productForDisplay={productForDisplay}
                                isNew={isNew}
                                gradient={getProductGradient(product.id, product.category)}
                                onEdit={onEdit}
                                onDelete={onDelete}
                              />
                            </div>
                          );
                        })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        );
      })}
    </div>
  );
}

function QualityButton({ active, icon, label, value, onClick }: { active: boolean; icon: React.ReactNode; label: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 h-10 px-3 rounded-xl border text-sm font-bold flex items-center gap-2 transition-colors ${active ? 'bg-gray-950 text-white border-gray-950' : 'bg-white text-gray-600 border-gray-200 hover:text-gray-950 hover:border-gray-300'}`}
    >
      {icon}
      <span>{label}</span>
      <span className={`tabular-nums text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'}`}>{value}</span>
    </button>
  );
}

function ProductAdminCard({ product, productForDisplay, isNew, gradient, onEdit, onDelete }: {
  product: Product;
  productForDisplay: Product;
  isNew: boolean;
  gradient: string;
  onEdit: (p: Product) => void;
  onDelete: (id: number, name?: string) => void;
}) {
  const issues = productQualityIssues(product);
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={() => onEdit(product)}
      className="relative overflow-hidden rounded-xl bg-gray-50/80 hover:bg-white border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all min-h-[132px] cursor-pointer group"
      title="Редагувати товар"
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: gradient }} />
      <div className="p-4 pl-5 flex gap-3">
        <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden bg-white shadow-sm aspect-square border border-gray-100">
          <ProductImage product={productForDisplay} className="w-full h-full" imgClassName="w-full h-full object-cover" letterSize="xs" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-bold text-gray-900 leading-snug line-clamp-2">{productDisplayName(product)}</p>
                {isNew && <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-full">Новий</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1 truncate">#{product.id}{formatProductMeta(product) ? ` · ${formatProductMeta(product)}` : ''}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onEdit(product); }}
                className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-violet-700 hover:border-violet-200 flex items-center justify-center"
                aria-label="Редагувати товар"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onDelete(product.id, product.name); }}
                className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-100 flex items-center justify-center"
                aria-label="Видалити товар"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="px-2 py-1 rounded-lg bg-white border border-gray-100 text-xs font-bold text-gray-900">{product.price}</span>
            <span className="px-2 py-1 rounded-lg bg-white border border-gray-100 text-xs font-medium text-gray-600">{productUnits(product)} од.</span>
            {product.tag && <span className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">{product.tag}</span>}
          </div>
          {issues.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {issues.map(issue => <span key={issue} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-semibold">{issue}</span>)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProductAdminTable({ products, imagePreviews, newProductIds, onEdit, onDelete }: {
  products: Product[];
  imagePreviews: Record<number, string>;
  newProductIds: Set<number>;
  onEdit: (p: Product) => void;
  onDelete: (id: number, name?: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left font-bold">Товар</th>
            <th className="px-4 py-3 text-left font-bold">Артикул</th>
            <th className="px-4 py-3 text-left font-bold">Ціна</th>
            <th className="px-4 py-3 text-left font-bold">Юніти</th>
            <th className="px-4 py-3 text-left font-bold">Тег</th>
            <th className="px-4 py-3 text-left font-bold">Якість</th>
            <th className="px-4 py-3 text-right font-bold">Дії</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map(product => {
            const productForDisplay = imagePreviews[product.id] ? { ...product, image: imagePreviews[product.id] } : product;
            const issues = productQualityIssues(product);
            return (
              <tr key={product.id} onClick={() => onEdit(product)} className="hover:bg-violet-50/40 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                      <ProductImage product={productForDisplay} className="w-full h-full" imgClassName="w-full h-full object-cover" letterSize="xs" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 truncate max-w-[280px]">{productDisplayName(product)}</p>
                        {newProductIds.has(product.id) && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Новий</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">#{product.id} · {product.category}{formatProductMeta(product) ? ` · ${formatProductMeta(product)}` : ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{productArticle(product) || '—'}</td>
                <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">{product.price}</td>
                <td className="px-4 py-3 text-gray-600 tabular-nums">{productUnits(product)}</td>
                <td className="px-4 py-3 text-gray-600">{product.tag || '—'}</td>
                <td className="px-4 py-3">
                  {issues.length === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      OK
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {issues.map(issue => <span key={issue} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">{issue}</span>)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onEdit(product); }}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-violet-700 hover:border-violet-200 inline-flex items-center justify-center"
                      aria-label="Редагувати товар"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onDelete(product.id, product.name); }}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-100 inline-flex items-center justify-center"
                      aria-label="Видалити товар"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductEditModal({ product, onSave, onDelete, onClose, onFormChange, onImagePreview }: {
  product: Product; onSave: (p: Product) => void; onDelete?: () => void; onClose: () => void;
  onFormChange?: (p: Product) => void;
  onImagePreview?: (productId: number, dataUrl: string | null) => void;
}) {
  const [form, setForm] = useState<Product>(() => ({ ...normalizeProductForStorage(product), units: productUnits(product) }));
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState('');
  const [validationError, setValidationError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ ...normalizeProductForStorage(product), units: productUnits(product) });
    setPreviewDataUrl(null);
    setImgError('');
    setValidationError('');
  }, [product.id]);

  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [product.id]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const resizeAndEncode = (file: File, maxW = 400, maxH = 400, quality = 0.65): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const r = Math.min(maxW / width, maxH / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Невірне зображення'));
      };
      img.src = url;
    });
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    setImgError('');
    setLoading(true);
    try {
      const dataUrl = await resizeAndEncode(file);
      const updated = { ...form, image: dataUrl };
      setForm(updated);
      setPreviewDataUrl(dataUrl);
      onFormChange?.(updated);
      onImagePreview?.(product.id, dataUrl);
    } catch (err) {
      setImgError((err as Error).message || 'Помилка');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setValidationError('');
    const name = String(form.name || '').trim();
    if (!name) {
      setValidationError('Введіть назву товару');
      return;
    }
    let price = String(form.price || '').trim();
    if (!price) {
      setValidationError('Введіть ціну');
      return;
    }
    const priceNum = parseInt(price.replace(/\s/g, '').replace('₴', ''), 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError('Невірний формат ціни (наприклад: 450 ₴)');
      return;
    }
    if (!price.includes('₴')) price = priceNum + ' ₴';
    const units = productUnits(form);
    onSave(normalizeProductForStorage({ ...form, article: productArticle(form) || undefined, name, price, units }));
    onClose();
  };

  const applyParsedName = () => {
    const parsed = parseProductDetailsFromName(form.name);
    const updated = {
      ...form,
      name: parsed.name || form.name,
      article: form.article || parsed.article,
      units: productUnits({ units: parsed.units }),
      price: parsed.price || form.price,
    };
    setForm(updated);
    onFormChange?.(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(); } }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="bg-gradient-to-br from-violet-50 to-white px-6 py-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Редагувати товар</h2>
            <div className="flex items-center gap-1">
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                  title="Видалити товар"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">#{product.id} · {form.category}</p>
        </div>
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="flex gap-4 items-start">
            <div className="shrink-0">
              {form.image ? (
                <div className="relative group">
                  <img src={previewDataUrl || (form.image.startsWith('data:') ? form.image : (resolveImageUrl(form.image) || form.image))} alt="" className="w-24 h-24 object-cover rounded-xl border-2 border-gray-100 shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.background = '#f3f4f6'; (e.target as HTMLImageElement).alt = '…'; }} />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...form, image: undefined };
                      setForm(updated);
                      setPreviewDataUrl(null);
                      onFormChange?.(updated);
                      onImagePreview?.(product.id, null);
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Видалити фото"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-200">Фото</div>
              )}
              <label className="mt-2 block">
                <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={loading} />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 hover:bg-violet-200 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-70">
                  {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Завантаження…</> : 'Обрати фото'}
                </span>
              </label>
              <p className="mt-1 text-[10px] text-gray-400">Фото зберігається разом з товаром</p>
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Назва</label>
                  <button
                    type="button"
                    onClick={applyParsedName}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-700"
                    title="Витягнути артикул, ціну та юніти з назви"
                  >
                    Розкласти з назви
                  </button>
                </div>
                <input
                  ref={nameInputRef}
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  placeholder="Назва товару"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Артикул</label>
                  <input
                    value={form.article ?? ''}
                    onChange={e => setForm(p => ({ ...p, article: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    placeholder="SKU / код"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Юніти</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={productUnits(form)}
                    onChange={e => setForm(p => ({ ...p, units: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ціна</label>
                  <input
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    placeholder="450 ₴"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Категорія</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                  >
                    {[...ADMIN_CATEGORIES, 'Інше'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Опис</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  maxLength={300}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-y min-h-[80px]"
                  placeholder="Короткий опис товару (до 300 символів)"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">{(form.description ?? '').length}/300</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Тег</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TAG_PRESETS.filter(Boolean).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tag: p.tag === t ? '' : t }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${form.tag === t ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  value={form.tag}
                  onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  placeholder="Або введі свій тег..."
                />
              </div>
            </div>
          </div>
          {imgError && (
            <p className={`text-xs px-3 py-2 rounded-lg ${imgError.includes('Збережено') ? 'text-amber-700 bg-amber-50' : 'text-red-500 bg-red-50'}`}>
              {imgError}
            </p>
          )}
          {validationError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{validationError}</p>}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400 hidden sm:inline">Ctrl+Enter — зберегти</span>
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-6 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Скасувати
            </button>
            <button
              onClick={handleSave}
              className="flex-1 min-w-[120px] bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Зберегти
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
