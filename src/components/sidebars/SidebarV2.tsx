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

const getMenuItems = (isEnglish: boolean) => [
  { title: isEnglish ? "Home" : "Inicio", url: "/", icon: Home, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
  { title: isEnglish ? "Students" : "Alumnos", url: "/alumnos", icon: Users, roles: ["admin", "asistente", "instructor", "recepcionista"] },
  { title: isEnglish ? "Categories" : "Categorías", url: "/niveles", icon: Award, roles: ["admin", "asistente", "instructor", "recepcionista"] },
  { title: isEnglish ? "Representatives" : "Representantes", url: "/representantes", icon: UserCircle, roles: ["admin", "asistente", "instructor", "recepcionista"] },
  { title: isEnglish ? "Schedules" : "Horarios", url: "/horarios", icon: Clock, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
  { title: isEnglish ? "Payments" : "Pagos", url: "/pagos", icon: DollarSign, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
  { title: isEnglish ? "Evaluations" : "Evaluaciones", url: "/evaluaciones", icon: FileText, roles: ["admin", "asistente", "instructor", "usuario"] },
  { title: isEnglish ? "Reports" : "Reportes", url: "/reportes", icon: BarChart3, roles: ["admin", "instructor"] },
  { title: isEnglish ? "Settings" : "Configuración", url: "/configuracion", icon: Settings, roles: ["admin", "asistente", "instructor", "recepcionista", "usuario"] },
  { title: isEnglish ? "Advanced Config." : "Config. Avanzada", url: "/configuracion-avanzada", icon: Sliders, roles: ["admin"] },
];

export function SidebarV2() {
  const { open } = useSidebar();
  const { user, loading } = useAuth();
  const { isEnglish } = useLanguage();
  
  // Filtrar menú según el rol del usuario
  let filteredMenuItems = getMenuItems(isEnglish);
  
  if (!loading && user) {
    const userRole = user.rol || 'usuario';
    filteredMenuItems = getMenuItems(isEnglish).filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(userRole);
    });
  } else {
    filteredMenuItems = getMenuItems(isEnglish).filter(item => item.title !== (isEnglish ? "Advanced Config." : "Config. Avanzada"));
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
        <SidebarGroup>
          {/* Header minimalista y elegante */}
          <div className="px-3 py-5">
            <SidebarGroupLabel className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-red-500 to-orange-600 p-2.5 rounded-xl shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl filter drop-shadow-lg">🥋</span>
                </div>
              </div>
              {open && (
                <div className="flex flex-col">
                  <span className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    DOJO
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 font-semibold tracking-widest uppercase">
                    Management System
                  </span>
                </div>
              )}
            </SidebarGroupLabel>
          </div>

          <SidebarGroupContent className="px-3 py-2">
            <SidebarMenu className="space-y-0.5">
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 rounded-xl border-l-4 border-white/30"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 rounded-xl hover:pl-2 border-l-4 border-transparent hover:border-red-500/30"
                      }
                    >
                      <item.icon className="h-5 w-5 stroke-[2.5]" />
                      <span className="font-semibold text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>

          {/* Footer minimalista */}
          {open && (
            <div className="mt-auto px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400 dark:text-gray-600 font-medium">v1.0.0</span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="text-gray-400 dark:text-gray-600 font-medium">2025</span>
              </div>
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

