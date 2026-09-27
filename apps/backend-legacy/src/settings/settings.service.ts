import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

const DEFAULTS = {
  id: 'default',
  siteName: 'V19Plus',
  tagline: 'Stream Unlimited',
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: '#FF6B1A',
  footerText: '© 2026 V19Plus. All rights reserved.',
};

@Injectable()
export class SettingsService {
  constructor(private readonly firebase: FirebaseService) {}

  async getSettings() {
    const docRef = this.firebase.firestore.collection('settings').doc('default');
    const settings = await docRef.get();
    
    if (!settings.exists) {
      await docRef.set(DEFAULTS);
      return DEFAULTS;
    }
    
    return { id: 'default', ...settings.data() };
  }

  async updateSettings(data: Partial<typeof DEFAULTS>) {
    const docRef = this.firebase.firestore.collection('settings').doc('default');
    const settings = await docRef.get();

    if (!settings.exists) {
      const newData = { ...DEFAULTS, ...data };
      await docRef.set(newData);
      return newData;
    } else {
      await docRef.update(data as any);
      const updated = await docRef.get();
      return { id: 'default', ...updated.data() };
    }
  }
}

