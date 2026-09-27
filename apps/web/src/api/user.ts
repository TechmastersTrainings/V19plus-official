import api from './axios';

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  isKids: boolean;
}

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    api.put('/user/profile', data),
  listProfiles: () => api.get<Profile[]>('/user/profiles'),
  createProfile: (data: { name: string; avatarColor?: string; isKids?: boolean; pin?: string }) =>
    api.post<Profile>('/user/profiles', data),
  deleteProfile: (id: string) => api.delete(`/user/profiles/${id}`),
  listDevices: () => api.get<any[]>('/user/devices'),
  deleteDevice: (id: string) => api.delete(`/user/devices/${id}`),
};
