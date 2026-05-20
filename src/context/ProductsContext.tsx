import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Product } from '../data/products';
import { allProducts as staticProducts, categories, getProductGradient, parsePrice } from '../data/products';

export { categories, getProductGradient, parsePrice };

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

const PRODUCTS_URL = '/products.json';
const PRODUCTS_STORAGE_KEY = 'lumu_admin_products';

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(staticProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }
    try {
      const res = await fetch(`${PRODUCTS_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback to static
    }
    setProducts(staticProducts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts().finally(() => setLoading(false));
  }, [fetchProducts]);

  useEffect(() => {
    const onFocus = () => {
      if (window.location.pathname === '/admin') return;
      fetchProducts();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchProducts]);

  return (
    <ProductsContext.Provider value={{ products, loading, error, refetch: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
