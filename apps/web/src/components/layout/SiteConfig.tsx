import { useEffect } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function SiteConfig() {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;
    document.title = settings.siteName;
    if (settings.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
    document.documentElement.style.setProperty('--v-orange', settings.primaryColor);
  }, [settings]);

  return null;
}
