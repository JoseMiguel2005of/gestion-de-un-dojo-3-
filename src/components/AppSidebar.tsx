import { useEffect, useState } from "react";
import { SidebarCurrent } from "./sidebars/SidebarCurrent";
import { SidebarV1 } from "./sidebars/SidebarV1";
import { SidebarV2 } from "./sidebars/SidebarV2";
import { SidebarClassic } from "./sidebars/SidebarClassic";
import type { SidebarTheme } from "@/hooks/useTheme";

export function AppSidebar() {
  const [sidebarTheme, setSidebarTheme] = useState<SidebarTheme>('current');

  useEffect(() => {
    // Cargar tema desde localStorage
    const savedTheme = localStorage.getItem('sidebar_theme') as SidebarTheme;
    if (savedTheme) {
      setSidebarTheme(savedTheme);
    }

    // Escuchar cambios en el tema
    const handleThemeChange = (e: CustomEvent<SidebarTheme>) => {
      setSidebarTheme(e.detail);
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
    case 'current':
    default:
      return <SidebarCurrent />;
  }
}
