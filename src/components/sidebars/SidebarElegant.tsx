import { Home, Users, Award, UserCircle, FileText, BarChart3, Settings, Sliders, DollarSign, Clock } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { apiClient } from "@/lib/api";
import { useEffect, useState } from "react";

const getMenuSections = (isEnglish: boolean) => [
  {
    label: isEnglish ? "Main" : "Principal",
    items: [
      { title: isEnglish ? "Home" : "Inicio", url: "/", icon: Home, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
    ]
  },
  {
    label: isEnglish ? "Management" : "Gestión",
    items: [
      { title: isEnglish ? "Students" : "Alumnos", url: "/alumnos", icon: Users, roles: ["admin", "asistente", "instructor", "recepcionista"] },
      { title: isEnglish ? "Categories" : "Categorías", url: "/niveles", icon: Award, roles: ["admin", "asistente", "instructor", "recepcionista"] },
      { title: isEnglish ? "Representatives" : "Representantes", url: "/representantes", icon: UserCircle, roles: ["admin", "asistente", "instructor", "recepcionista"] },
      { title: isEnglish ? "Schedules" : "Horarios", url: "/horarios", icon: Clock, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
    ]
  },
  {
    label: isEnglish ? "Academic" : "Académico",
    items: [
      { title: isEnglish ? "Evaluations" : "Evaluaciones", url: "/evaluaciones", icon: FileText, roles: ["admin", "asistente", "instructor", "usuario"] },
      { title: isEnglish ? "Payments" : "Pagos", url: "/pagos", icon: DollarSign, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
      { title: isEnglish ? "Reports" : "Reportes", url: "/reportes", icon: BarChart3, roles: ["admin", "instructor"] },
    ]
  },
  {
    label: isEnglish ? "System" : "Sistema",
    items: [
      { title: isEnglish ? "Settings" : "Configuración", url: "/configuracion", icon: Settings, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
      { title: isEnglish ? "Advanced Config." : "Config. Avanzada", url: "/configuracion-avanzada", icon: Sliders, roles: ["admin"] },
    ]
  }
];

export function SidebarElegant() {
  const { open } = useSidebar();
  const { user, loading } = useAuth();
  const { isEnglish } = useLanguage();
  const [socialLinks, setSocialLinks] = useState({
    dojo_facebook: '',
    dojo_instagram: '',
    dojo_twitter: '',
    dojo_whatsapp: ''
  });

  useEffect(() => {
    const loadSocialLinks = async () => {
      try {
        const config = await apiClient.getConfiguracion();
        setSocialLinks({
          dojo_facebook: config.dojo_facebook || '',
          dojo_instagram: config.dojo_instagram || '',
          dojo_twitter: config.dojo_twitter || '',
          dojo_whatsapp: config.dojo_whatsapp || ''
        });
      } catch (error) {
        console.error('Error loading social links:', error);
      }
    };
    loadSocialLinks();
  }, []);
  
  // Filtrar secciones según el rol del usuario
  let filteredSections = getMenuSections(isEnglish);
  
  if (!loading && user) {
    const userRole = user.rol || 'usuario';
    
    filteredSections = getMenuSections(isEnglish).map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
      })
    })).filter(section => section.items.length > 0);
  } else {
    filteredSections = getMenuSections(isEnglish).map(section => ({
      ...section,
      items: section.items.filter(item => item.title !== (isEnglish ? "Advanced Config." : "Config. Avanzada"))
    })).filter(section => section.items.length > 0);
  }

  return (
    <Sidebar collapsible="icon" side="left" className="border-r border-gray-200 dark:border-gray-700">
      <SidebarContent className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        {/* Header elegante y clásico */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-2xl">🥋</span>
            </div>
            {open && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">DOJO</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                  {isEnglish ? "Management System" : "Sistema de Gestión"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menú por secciones con estilo clásico */}
        <div className="flex-1 overflow-y-auto py-4">
          {filteredSections.map((section) => (
            <SidebarGroup key={section.label} className="px-4 mb-6">
              {open && (
                <SidebarGroupLabel className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className={({ isActive }) =>
                            isActive
                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 font-medium border-l-4 border-amber-600 dark:border-amber-500 shadow-sm"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-amber-700 dark:hover:text-amber-400 transition-colors border-l-4 border-transparent"
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>

        {/* Footer elegante con redes sociales */}
        {open && (
          <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
            {/* Redes sociales */}
            {(socialLinks.dojo_facebook || socialLinks.dojo_instagram || socialLinks.dojo_twitter || socialLinks.dojo_whatsapp) && (
              <div className="flex items-center justify-center gap-4">
                {socialLinks.dojo_facebook && (
                  <a 
                    href={socialLinks.dojo_facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.076v-3.47h3.049V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.dojo_instagram && (
                  <a 
                    href={socialLinks.dojo_instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                    title="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.dojo_twitter && (
                  <a 
                    href={socialLinks.dojo_twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                    title="Twitter / X"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.dojo_whatsapp && (
                  <a 
                    href={socialLinks.dojo_whatsapp} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="WhatsApp"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">v1.0.0</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">© 2025 Dojo System</p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

