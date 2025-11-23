import { useEffect, useState } from "react";
import { SidebarCurrent } from "./sidebars/SidebarCurrent";
import { SidebarV1 } from "./sidebars/SidebarV1";
import { SidebarV2 } from "./sidebars/SidebarV2";
import { SidebarClassic } from "./sidebars/SidebarClassic";
import { SidebarElegant } from "./sidebars/SidebarElegant";
import type { SidebarTheme } from "@/hooks/useTheme";

export function AppSidebar() {
  const [sidebarTheme, setSidebarTheme] = useState<SidebarTheme>('elegant');
  
  // Si no hay tema guardado, usar 'elegant' como predeterminado
  useEffect(() => {
    const savedTheme = localStorage.getItem('sidebar_theme') as SidebarTheme;
    if (!savedTheme) {
      setSidebarTheme('elegant');
      localStorage.setItem('sidebar_theme', 'elegant');
    }
  }, []);

  useEffect(() => {
    // Cargar tema desde localStorage al inicio
    const savedTheme = localStorage.getItem('sidebar_theme') as SidebarTheme;
    if (savedTheme && ['v1', 'v2', 'classic', 'elegant', 'current'].includes(savedTheme)) {
      setSidebarTheme(savedTheme);
    } else {
      // Si no hay tema guardado o es inválido, usar 'elegant' como predeterminado
      setSidebarTheme('elegant');
      localStorage.setItem('sidebar_theme', 'elegant');
    }

    // Escuchar cambios en el tema (disparados desde Configuracion.tsx cuando se carga la BD)
    const handleThemeChange = (e: CustomEvent<SidebarTheme>) => {
      const newTheme = e.detail;
      if (newTheme && ['v1', 'v2', 'classic', 'elegant', 'current'].includes(newTheme)) {
        setSidebarTheme(newTheme);
        localStorage.setItem('sidebar_theme', newTheme);
      }
    };

    window.addEventListener('sidebar-theme-change' as any, handleThemeChange);
    return () => {
      window.removeEventListener('sidebar-theme-change' as any, handleThemeChange);
    };
  }, []);

  // Renderizar el sidebar correspondiente
  switch (sidebarTheme) {
    case 'v1':
      return <SidebarV1 />;
    case 'v2':
      return <SidebarV2 />;
    case 'classic':
      return <SidebarClassic />;
    case 'elegant':
      return <SidebarElegant />;
    case 'current':
      return <SidebarCurrent />;
    default:
      return <SidebarElegant />;
  }
}
