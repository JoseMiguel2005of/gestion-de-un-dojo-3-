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

export function SidebarCurrent() {
  const { open } = useSidebar();
  const { user, loading } = useAuth();
  const { isEnglish } = useLanguage();
  
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
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 dark:from-black dark:via-indigo-950 dark:to-black">
        {/* Header compacto con diseño card */}
        <div className="m-3 mb-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 p-3 rounded-xl shadow-lg">
                <span className="text-2xl">🥋</span>
              </div>
              {open && (
                <div>
                  <h2 className="text-white font-black text-lg tracking-tight">DOJO</h2>
                  <p className="text-indigo-200 text-[10px] font-medium">Sistema de Gestión</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menú por secciones */}
        <div className="px-2 space-y-6">
          {filteredSections.map((section) => (
            <SidebarGroup key={section.label}>
              {open && (
                <SidebarGroupLabel className="px-3 mb-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
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
                              ? "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white font-bold shadow-xl shadow-purple-500/50 rounded-xl mx-1 backdrop-blur-sm"
                              : "text-indigo-200 hover:bg-white/10 hover:text-white hover:shadow-lg transition-all duration-300 rounded-xl mx-1 backdrop-blur-sm border border-transparent hover:border-white/20"
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="font-semibold">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>

        {/* Footer con badge */}
        {open && (
          <div className="mt-auto m-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-indigo-300 text-xs font-bold">Version 1.0.0</span>
                <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></div>
              </div>
              <p className="text-indigo-400 text-[10px] mt-1">© 2025 Dojo System</p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

