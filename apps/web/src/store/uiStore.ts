import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  activeGenre: string | null;
  detailModal: { open: boolean; slug: string | null };
  toggleSidebar: () => void;
  setActiveGenre: (genre: string | null) => void;
  openDetail: (slug: string) => void;
  closeDetail: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  activeGenre: null,
  detailModal: { open: false, slug: null },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveGenre: (genre) => set({ activeGenre: genre }),
  openDetail: (slug) => set({ detailModal: { open: true, slug } }),
  closeDetail: () => set({ detailModal: { open: false, slug: null } }),
}));
