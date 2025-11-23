import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export type SidebarTheme = 'current' | 'v1' | 'v2' | 'classic';

interface ThemeConfig {
  tema_modo: 'light' | 'dark';
  tema_color_primario: string;
  tema_sidebar: SidebarTheme;
}

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig>({
    tema_modo: 'light',
    tema_color_primario: '#0ea5e9',
    tema_sidebar: 'current',
  });

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const config = await apiClient.getConfiguracion();
      
      const newTheme: ThemeConfig = {
        tema_modo: (config.tema_modo as 'light' | 'dark') || 'light',
        tema_color_primario: config.tema_color_primario || '#0ea5e9',
        tema_sidebar: (config.tema_sidebar as SidebarTheme) || 'current',
      };

      setTheme(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Error cargando tema:', error);
    }
  };

  const applyTheme = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    const body = document.body;

    // Aplicar modo claro/oscuro
    if (themeConfig.tema_modo === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

    // Aplicar color primario (convertir hex a HSL)
    const hsl = hexToHsl(themeConfig.tema_color_primario);
    if (hsl) {
      // Aplicar el color como variable CSS HSL
      root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      
      // Ajustar el foreground del primary según el modo
      if (themeConfig.tema_modo === 'dark') {
        root.style.setProperty('--primary-foreground', '240 10% 12%');
      } else {
        root.style.setProperty('--primary-foreground', '0 0% 98%');
      }
    }
  };

  const hexToHsl = (hex: string) => {
    // Convertir hex a RGB primero
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const setSidebarTheme = (newSidebarTheme: SidebarTheme) => {
    const newTheme = { ...theme, tema_sidebar: newSidebarTheme };
    setTheme(newTheme);
    // Guardar en localStorage para que sea inmediato
    localStorage.setItem('sidebar_theme', newSidebarTheme);
  };

  return { theme, loadTheme, setSidebarTheme };
};

