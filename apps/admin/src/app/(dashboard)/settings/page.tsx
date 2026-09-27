'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/admin';
import toast from 'react-hot-toast';
import { Settings, Image as ImageIcon, Palette, Globe } from 'lucide-react';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await adminApi.getSettings()).data,
  });

  const [form, setForm] = useState({
    siteName: '',
    tagline: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#FF6B1A',
    footerText: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        siteName: settings.siteName || '',
        tagline: settings.tagline || '',
        logoUrl: settings.logoUrl || '',
        faviconUrl: settings.faviconUrl || '',
        primaryColor: settings.primaryColor || '#FF6B1A',
        footerText: settings.footerText || '',
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateSettings({
        siteName: form.siteName,
        tagline: form.tagline,
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
        primaryColor: form.primaryColor,
        footerText: form.footerText,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      // Invalidate frontend site-settings queries
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Site settings saved successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to save settings';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#141414] w-1/4 rounded" />
        <div className="h-4 bg-[#141414] w-2/5 rounded" />
        <div className="space-y-4 pt-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 bg-[#141414] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Site Settings</h1>
        <p className="text-gray-400">Configure global branding, styling theme colors, metadata, and platform assets.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-6"
      >
        {/* Branding Section */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <Globe className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-white text-lg">Branding & Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field
              label="Site Name"
              value={form.siteName}
              onChange={(v) => setForm({ ...form, siteName: v })}
              required
            />
            <Field
              label="Tagline"
              value={form.tagline}
              onChange={(v) => setForm({ ...form, tagline: v })}
              required
            />
          </div>
        </div>

        {/* Media Assets Section */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <ImageIcon className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-white text-lg">Platform Media Assets</h2>
          </div>

          <div className="space-y-5">
            <Field
              label="Logo URL"
              value={form.logoUrl}
              onChange={(v) => setForm({ ...form, logoUrl: v })}
              placeholder="e.g. https://domain.com/logo.png"
            />
            <Field
              label="Favicon URL"
              value={form.faviconUrl}
              onChange={(v) => setForm({ ...form, faviconUrl: v })}
              placeholder="e.g. https://domain.com/favicon.ico"
            />

            {form.logoUrl && (
              <div className="p-4 bg-[#0f0f0f] rounded-xl border border-[#222] w-fit">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Logo Image Preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Look and Feel */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <Palette className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-white text-lg">Theme & Styling</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                Primary Brand Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-14 h-12 rounded-xl cursor-pointer bg-transparent border-none p-0 outline-none shrink-0"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="flex-1 bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                Footer Copyright Text
              </label>
              <textarea
                value={form.footerText}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                rows={3}
                className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-red-600/15"
          >
            {mutation.isPending ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
      />
    </div>
  );
}
