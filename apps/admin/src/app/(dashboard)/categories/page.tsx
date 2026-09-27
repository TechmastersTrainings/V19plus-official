'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Category } from '../../../api/admin';
import toast from 'react-hot-toast';
import { FolderTree, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', icon: '🎬', sortOrder: 0, isActive: true });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => (await adminApi.listCategories()).data,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      // Auto-generate slug from name if not present or editing
      const payload = {
        ...form,
        slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };
      return editing
        ? adminApi.updateCategory(editing.id, payload)
        : adminApi.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      // Invalidate frontend portal query as well
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editing ? 'Category updated successfully' : 'Category created successfully');
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to save category';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: () => toast.error('Failed to delete category'),
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', icon: '🎬', sortOrder: 0, isActive: true });
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder, isActive: cat.isActive });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Categories</h1>
        <p className="text-gray-400 font-normal">Manage the browse genres and category filters displayed inside the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Category Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="bg-[#141414] rounded-2xl p-6 border border-[#222] space-y-5 lg:sticky lg:top-8"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <FolderTree className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-white text-lg">
              {editing ? 'Edit Category' : 'Create Category'}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                placeholder="e.g. Science Fiction, Anime"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                Icon (Emoji)
              </label>
              <input
                type="text"
                placeholder="🎬"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer pt-2 group">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4.5 h-4.5 text-red-600 bg-[#0f0f0f] border-[#222] rounded focus:ring-red-500 focus:ring-offset-[#0f0f0f] focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                Publish this category (Active)
              </span>
            </label>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
            >
              {editing ? 'Update' : 'Create'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 bg-[#222] hover:bg-[#2a2a2a] text-gray-300 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Categories List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-[#141414] border border-[#222] rounded-2xl p-8 text-center text-gray-500">
              <FolderTree className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="font-semibold text-white">No categories found</p>
              <p className="text-xs text-gray-500 mt-1">Create one on the left to start organizing your library.</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between bg-[#141414] rounded-2xl px-5 py-4 border border-[#222] hover:border-[#333] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0f0f0f] border border-[#222] rounded-xl flex items-center justify-center text-2xl shadow-sm">
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">{cat.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>Order: {cat.sortOrder}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        {cat.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-gray-600" />
                            Hidden
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this category?')) {
                        deleteMutation.mutate(cat.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
