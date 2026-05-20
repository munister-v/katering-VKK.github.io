import React, { useState, useEffect } from 'react';
import { Instagram, ExternalLink, Heart, MessageCircle } from 'lucide-react';

export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  link: string;
  likes?: number;
  comments?: number;
  date?: string;
}

const INSTAGRAM_URL = 'https://www.instagram.com/malyenkyi.vsesvit_/';
const POSTS_KEY = 'lumu_instagram_posts';

const DEFAULT_POSTS: InstagramPost[] = [
  {
    id: '1',
    imageUrl: '/images/instagram/insta-1.jpg',
    caption: 'Нові надходження іграшок вже в наявності! ✨',
    link: 'https://www.instagram.com/malyenkyi.vsesvit_/reel/DWn9J1zDRhl/',
    likes: 42,
    comments: 5,
  },
  {
    id: '2',
    imageUrl: '/images/instagram/insta-2.jpg',
    caption: 'Ебру Арт — мистецтво на воді для дітей 🎨',
    link: 'https://www.instagram.com/malyenkyi.vsesvit_/reel/DUBl2kbDbgO/',
    likes: 38,
    comments: 3,
  },
  {
    id: '3',
    imageUrl: '/images/instagram/insta-3.jpg',
    caption: 'Розмальовки та творчі набори 🖍️',
    link: 'https://www.instagram.com/malyenkyi.vsesvit_/reel/DVL6b0EjL0Z/',
    likes: 56,
    comments: 8,
  },
  {
    id: '4',
    imageUrl: '/images/instagram/insta-4.jpg',
    caption: 'Подарунки для діток на будь-який вік 🎁',
    link: 'https://www.instagram.com/malyenkyi.vsesvit_/reel/DYMq8R2NI5h/',
    likes: 31,
    comments: 2,
  },
  {
    id: '5',
    imageUrl: '/images/instagram/insta-5.jpg',
    caption: 'Завітайте до нас — нова колекція! 🌟',
    link: 'https://www.instagram.com/malyenkyi.vsesvit_/reel/DWytrJljRoi/',
    likes: 45,
    comments: 6,
  },
  {
    id: '6',
    imageUrl: '/images/instagram/insta-6.jpg',
    caption: 'Дерев\'яні іграшки ручної роботи 🪵',
    link: 'https://www.instagram.com/malyenkyi.vsesvit_/reel/DWjdWbWjOmF/',
    likes: 29,
    comments: 4,
  },
];

function loadPosts(): InstagramPost[] {
  try {
    const s = localStorage.getItem(POSTS_KEY);
    if (s) {
      const data = JSON.parse(s);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  return DEFAULT_POSTS;
}

export function InstagramFeed() {
  const [posts] = useState<InstagramPost[]>(loadPosts);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-sm font-bold mb-4">
            <Instagram className="w-4 h-4" />
            @malyenkyi.vsesvit_
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            {'Ми в Instagram'}
          </h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            {'Слідкуйте за новинками, акціями та надхненням у нашому Instagram'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {posts.slice(0, 6).map(post => {
            const hasImgError = imgErrors.has(post.id);
            return (
              <a
                key={post.id}
                href={post.link || INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-200 to-pink-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onMouseEnter={() => setHoveredId(post.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {!hasImgError && post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.caption}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={() => setImgErrors(prev => new Set(prev).add(post.id))}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                    <Instagram className="w-10 h-10 text-white/60" />
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 ${hoveredId === post.id ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs line-clamp-2 mb-2">{post.caption}</p>
                    {(post.likes || post.comments) && (
                      <div className="flex items-center gap-3 text-white/80 text-xs">
                        {post.likes != null && (
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {post.likes}
                          </span>
                        )}
                        {post.comments != null && (
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {post.comments}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Instagram className="w-5 h-5" />
            {'Підписатися в Instagram'}
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>
        </div>
      </div>
    </section>
  );
}
