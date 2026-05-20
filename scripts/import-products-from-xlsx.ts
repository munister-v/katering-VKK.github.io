/**
 * Імпорт товарів з export_products_260311.xlsx
 * Конвертує в JSON та заливає на сайт (без фото)
 *
 * Використання:
 *   npx tsx scripts/import-products-from-xlsx.ts [шлях-до-xlsx]
 *   ADMIN_TOKEN=пароль npx tsx scripts/import-products-from-xlsx.ts --upload
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as fs from 'fs';
import * as path from 'path';

const SITE_CATEGORIES = ['Книги', 'Іграшки', 'Власне виробництво', 'Творчість', 'Настільні ігри'] as const;

const CATEGORY_MAP: Record<string, string> = {
  'Книги': 'Книги',
  'Книги Bookopt': 'Книги',
  'Ранок': 'Книги',
  'Іграшки 7': 'Іграшки',
  "Дерев'яні розвиваючі іграшки": 'Іграшки',
  "М'які іграшки": 'Іграшки',
  'Пазли і лего': 'Іграшки',
  'Ігри з липучками': 'Творчість',
  'ЛИПУЧКИ ПІД РЕАЛІЗАЦІЮ': 'Творчість',
  'Брелки': 'Власне виробництво',
  'Подарункові СЕРТИФІКАТИ': 'Настільні ігри',
  'TIGRES': 'Власне виробництво',
  'Ілля 3D': 'Власне виробництво',
  'ВІЛЬНИЙ ВІТЕР Мандрівець': 'Власне виробництво',
  'МАРИНА': 'Власне виробництво',
  'Настя БізіБорд': 'Власне виробництво',
  'Наташа': 'Власне виробництво',
  'Юля': 'Власне виробництво',
  'Яна Рюкзаки': 'Власне виробництво',
  'Ярина': 'Власне виробництво',
  'Китай': 'Іграшки',
};

const SKIP_CATEGORIES = new Set(['Головний екран']);

interface ExcelRow {
  'PosterID product_id (не змінювати!)'?: number;
  'Назва'?: string;
  'Категорія'?: string;
  'Ціна'?: number;
}

interface Product {
  id: number;
  article?: string;
  name: string;
  price: string;
  category: string;
  tag: string;
  units?: number;
  image?: string;
}

function parseFromName(rawName: string) {
  let name = String(rawName || '').trim();
  let article = '';
  let units = 1;

  const articleMatch = name.match(/\b(?:арт\.?|артикул|sku|код)\s*[:#№-]?\s*([A-Za-zА-Яа-яІіЇїЄєҐґ0-9._/-]{2,})/i)
    || name.match(/(?:^|[\s[(])(?:№|#)\s*([A-Za-zА-Яа-яІіЇїЄєҐґ0-9._/-]{2,})/i);
  if (articleMatch) {
    article = articleMatch[1].trim();
    name = name.replace(articleMatch[0], ' ');
  }

  const unitMatch = name.match(/(?:^|[\s,;])(?:x|х|×)\s*(\d{1,3})\s*(?:шт\.?|од\.?|pcs?)?\b/i)
    || name.match(/(?:^|[\s,;])(\d{1,3})\s*(?:шт\.?|од\.?|pcs?)\b/i);
  if (unitMatch) {
    const parsed = parseInt(unitMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) units = parsed;
    name = name.replace(unitMatch[0], ' ');
  }

  name = name.replace(/\s*[-–—|;/]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return { name: name || rawName.trim(), article, units };
}

function mapCategory(excelCat: string): string {
  const trimmed = String(excelCat || '').trim();
  if (SKIP_CATEGORIES.has(trimmed)) return '';
  return CATEGORY_MAP[trimmed] || 'Власне виробництво';
}

function normalizeProducts(rows: ExcelRow[]): Product[] {
  const products: Product[] = [];
  let id = 1;
  for (const row of rows) {
    const parsedName = parseFromName(String(row['Назва'] || '').trim());
    const name = parsedName.name;
    if (!name) continue;

    const excelCat = String(row['Категорія'] || '').trim();
    const category = mapCategory(excelCat);
    if (!category) continue;

    const priceNum = typeof row['Ціна'] === 'number' ? row['Ціна'] : parseInt(String(row['Ціна'] || '0').replace(/\s/g, ''), 10);
    if (isNaN(priceNum) || priceNum < 0) continue;

    products.push({
      id: id++,
      ...(parsedName.article && { article: parsedName.article }),
      name,
      price: `${priceNum.toLocaleString('uk-UA')} ₴`,
      category,
      tag: '',
      units: parsedName.units,
      // image — без фото поки
    });
  }
  return products;
}

async function main() {
  const args = process.argv.slice(2);
  const xlsxPath = args.find(a => !a.startsWith('--')) ||
    path.join(process.cwd(), 'export_products_260311.xlsx') ||
    path.join(process.env.HOME || '', 'Downloads', 'export_products_260311.xlsx');

  if (!fs.existsSync(xlsxPath)) {
    console.error('Файл не знайдено:', xlsxPath);
    console.error('Використання: npx tsx scripts/import-products-from-xlsx.ts [шлях/до/файлу.xlsx]');
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames[0];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  const products = normalizeProducts(rows);
  console.log(`Прочитано ${rows.length} рядків → ${products.length} товарів`);

  const outPath = path.join(process.cwd(), 'public', 'products.json');
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2), 'utf-8');
  console.log('✓ Збережено в', outPath);
  console.log('Завантажте JSON через адмін-панель (вкладка Товари → Автозавантажити товари).');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
