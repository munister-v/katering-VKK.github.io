import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Instagram, Save, ExternalLink } from 'lucide-react';
import type { InstagramPost } from '../InstagramFeed';

const POSTS_KEY = 'lumu_instagram_posts';
const INSTAGRAM_URL = 'https://www.instagram.com/malyenkyi.vsesvit_/';

function loadPosts(): InstagramPost[] {
  try {
    const s = localStorage.getItem(POSTS_KEY);
    if (s) {
      const data = JSON.parse(s);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  return [];
}

function savePosts(posts: InstagramPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

export function InstagramManager() {
  const [posts, setPosts] = useState<InstagramPost[]>(loadPosts);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    savePosts(posts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addPost = () => {
    const id = Date.now().toString(36);
    setPosts(prev => [...prev, {
      id,
      imageUrl: '',
      caption: 'Новий пост',
      link: INSTAGRAM_URL,
      likes: 0,
      comments: 0,
    }]);
  };

  const updatePost = (id: string, updates: Partial<InstagramPost>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePost = (id: string) => {
    if (confirm('Видалити пост?')) {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleImageFile = async (postId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updatePost(postId, { imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-purple-600" />
            Instagram пости
          </h2>
          <p className="text-sm text-gray-500">{'Управління постами на головній сторінці. Перші 6 постів відображаються на сайті.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-black border border-gray-200 hover:bg-gray-50">
            <ExternalLink className="w-4 h-4" />
            Instagram
          </a>
          <button onClick={addPost} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700">
            <Plus className="w-4 h-4" />
            {'Додати'}
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800">
            <Save className="w-4 h-4" />
            {saved ? 'Збережено!' : 'Зберегти'}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 rounded-2xl border-2 border-dashed border-gray-200">
          <Instagram className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{'Постів немає. Додайте перший пост!'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, idx) => (
            <div key={post.id} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${idx < 6 ? 'border-purple-200' : 'border-gray-200 opacity-60'}`}>
              <div className="aspect-square relative bg-gradient-to-br from-purple-100 to-pink-100">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Instagram className="w-10 h-10 text-purple-300" />
                  </div>
                )}
                {idx < 6 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold">#{idx + 1}</span>
                )}
                <button onClick={() => deletePost(post.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <label className="text-xs font-bold text-gray-500">{'Зображення'}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(post.id, f); e.target.value = ''; }}
                    className="w-full text-xs mt-0.5"
                  />
                  <input
                    value={post.imageUrl || ''}
                    onChange={e => updatePost(post.id, { imageUrl: e.target.value })}
                    placeholder="URL або data URL"
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">{'Підпис'}</label>
                  <input
                    value={post.caption}
                    onChange={e => updatePost(post.id, { caption: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">{'Посилання'}</label>
                  <input
                    value={post.link || ''}
                    onChange={e => updatePost(post.id, { link: e.target.value })}
                    placeholder={INSTAGRAM_URL}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">{'❤️ Лайки'}</label>
                    <input
                      type="number"
                      value={post.likes ?? 0}
                      onChange={e => updatePost(post.id, { likes: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">{'💬 Коментарі'}</label>
                    <input
                      type="number"
                      value={post.comments ?? 0}
                      onChange={e => updatePost(post.id, { comments: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
