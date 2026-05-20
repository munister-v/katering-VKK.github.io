import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Product } from '../../data/products';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

function priceNumber(p: Product) {
  return parseInt(String(p.price || '').replace(/\s/g, '').replace('₴', ''), 10) || 0;
}

function productUnits(p: Product) {
  return typeof p.units === 'number' && p.units >= 0 ? p.units : 1;
}

const PALETTE = [
  'rgba(139,92,246,0.8)',
  'rgba(59,130,246,0.8)',
  'rgba(16,185,129,0.8)',
  'rgba(245,158,11,0.8)',
  'rgba(239,68,68,0.8)',
  'rgba(168,85,247,0.8)',
  'rgba(6,182,212,0.8)',
  'rgba(251,146,60,0.8)',
];

export function AnalyticsCharts({ products }: { products: Product[] }) {
  const categoryData = useMemo(() => {
    const map: Record<string, { count: number; units: number; value: number }> = {};
    products.forEach(p => {
      const cat = p.category || 'Інше';
      map[cat] = map[cat] || { count: 0, units: 0, value: 0 };
      map[cat].count += 1;
      map[cat].units += productUnits(p);
      map[cat].value += priceNumber(p) * productUnits(p);
    });
    const entries = Object.entries(map).sort((a, b) => b[1].count - a[1].count);
    return {
      labels: entries.map(e => e[0]),
      counts: entries.map(e => e[1].count),
      values: entries.map(e => e[1].value),
      units: entries.map(e => e[1].units),
    };
  }, [products]);

  const priceDistribution = useMemo(() => {
    const ranges = [
      { label: '0–100 ₴', min: 0, max: 100 },
      { label: '101–300 ₴', min: 101, max: 300 },
      { label: '301–500 ₴', min: 301, max: 500 },
      { label: '501–1000 ₴', min: 501, max: 1000 },
      { label: '1000+ ₴', min: 1001, max: Infinity },
    ];
    const counts = ranges.map(r => products.filter(p => {
      const pr = priceNumber(p);
      return pr >= r.min && pr <= r.max;
    }).length);
    return { labels: ranges.map(r => r.label), counts };
  }, [products]);

  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => priceNumber(b) * productUnits(b) - priceNumber(a) * productUnits(a))
      .slice(0, 10);
  }, [products]);

  const qualityData = useMemo(() => {
    const withImage = products.filter(p => p.image).length;
    const withDesc = products.filter(p => String(p.description ?? '').trim()).length;
    const withArticle = products.filter(p => String(p.article ?? '').trim()).length;
    return {
      labels: ['З фото', 'Без фото', 'З описом', 'Без опису', 'З артикулом', 'Без артикулу'],
      values: [withImage, products.length - withImage, withDesc, products.length - withDesc, withArticle, products.length - withArticle],
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{'Товари по категоріях'}</h3>
          <Doughnut
            data={{
              labels: categoryData.labels,
              datasets: [{
                data: categoryData.counts,
                backgroundColor: PALETTE.slice(0, categoryData.labels.length),
                borderWidth: 2,
                borderColor: '#fff',
              }],
            }}
            options={{
              responsive: true,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
            }}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{'Вартість по категоріях'}</h3>
          <Bar
            data={{
              labels: categoryData.labels,
              datasets: [{
                label: 'Сума (₴)',
                data: categoryData.values,
                backgroundColor: PALETTE.slice(0, categoryData.labels.length),
                borderRadius: 8,
              }],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { callback: v => Number(v).toLocaleString('uk-UA') + ' ₴' } } },
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{'Розподіл цін'}</h3>
          <Bar
            data={{
              labels: priceDistribution.labels,
              datasets: [{
                label: 'Кількість товарів',
                data: priceDistribution.counts,
                backgroundColor: 'rgba(139,92,246,0.7)',
                borderRadius: 8,
              }],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            }}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{'Якість карток'}</h3>
          <Bar
            data={{
              labels: qualityData.labels,
              datasets: [{
                data: qualityData.values,
                backgroundColor: ['#10b981', '#ef4444', '#10b981', '#ef4444', '#10b981', '#ef4444'],
                borderRadius: 8,
              }],
            }}
            options={{
              responsive: true,
              indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{'Топ-10 товарів за вартістю (ціна × юніти)'}</h3>
        <Bar
          data={{
            labels: topProducts.map(p => (p.name.length > 30 ? p.name.slice(0, 27) + '…' : p.name)),
            datasets: [{
              label: 'Вартість (₴)',
              data: topProducts.map(p => priceNumber(p) * productUnits(p)),
              backgroundColor: 'rgba(59,130,246,0.7)',
              borderRadius: 8,
            }],
          }}
          options={{
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { callback: v => Number(v).toLocaleString('uk-UA') + ' ₴' } } },
          }}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{'Юніти по категоріях'}</h3>
        <Line
          data={{
            labels: categoryData.labels,
            datasets: [{
              label: 'Юнітів',
              data: categoryData.units,
              borderColor: 'rgba(139,92,246,1)',
              backgroundColor: 'rgba(139,92,246,0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 6,
              pointBackgroundColor: 'rgba(139,92,246,1)',
            }],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          }}
        />
      </div>
    </div>
  );
}
