import React from 'react';
import { Hero } from '../components/Hero';
import { ProductGrid } from '../components/ProductGrid';
import { CategorySplit } from '../components/CategorySplit';
import { Reviews } from '../components/Reviews';
import { Editorial } from '../components/Editorial';
import { InstagramFeed } from '../components/InstagramFeed';

export const Home = () => (
  <>
    <Hero />
    <ProductGrid />
    <InstagramFeed />
    <CategorySplit />
    <Reviews />
    <Editorial />
  </>
);
