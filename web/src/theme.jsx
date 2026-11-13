import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const DEFAULT_BRANDING = {
  clinicName: 'Espaço Acolher',
  primaryColor: '#4f7f6b',
  backgroundType: 'color',
  backgroundColor: '#f3f5f1',
  fontKey: 'modern',
  logoUrl: null,
  backgroundUrl: null,
};

const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  refresh: async () => {},
});

export function applyBranding(branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--primary', branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  root.style.setProperty('--page-bg', branding.backgroundColor || DEFAULT_BRANDING.backgroundColor);
  root.dataset.font = branding.fontKey || 'modern';
  const hasImage = branding.backgroundType === 'image' && branding.backgroundUrl;
  root.dataset.bg = hasImage ? 'image' : 'color';
  root.style.setProperty('--page-bg-image', hasImage ? `url("${branding.backgroundUrl}")` : 'none');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', branding.primaryColor || '#4f7f6b');
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/public/branding');
      setBranding(data);
      applyBranding(data);
    } catch {
      applyBranding(DEFAULT_BRANDING);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, refresh, applyBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
export { DEFAULT_BRANDING };
