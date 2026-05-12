import { cn } from "@/lib/utils";
import AcuCheckLogoIcon from "@/assets/AcuCheck-LogoIcon.png";
import { useIsDarkMode } from "@/components/ui/sidebar";
import { HelpCircle, LogOut } from "lucide-react"
import HelpImage from "@/assets/help_img.png" 
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarTrigger 
} from "@/components/ui/sidebar";

import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";
import { Home, User, Shield, Settings, Phone, FileText, ScrollText, Loader2, CreditCard, Building2, BarChart3 } from "lucide-react";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from '@/components/contexts/AuthContext';
import { useAppearance } from '@/components/contexts/AppearanceContext';
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed"
  const isDark = useIsDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { themeColor } = useThemeColor();
  const { user, logout } = useAuth();
  const { appearance, loading: appearanceLoading } = useAppearance();

  const getActiveGradient = (theme: string, isDark: boolean) => {
    // Determine which color to use based on theme selection
    let effectiveColor: string;
    
    if (theme === "lavender") {
      // Use backend color (no temporary override)
      effectiveColor = appearance.primaryColor;
    } else {
      // Use temporary theme color
      const themeColors = {
        flamingo: "#dd7878",
        teal: "#179299", 
        green: "#40a02b"
      };
      effectiveColor = themeColors[theme as keyof typeof themeColors] || appearance.primaryColor;
    }
    
    // Create gradient using the effective color
    return isDark
      ? `linear-gradient(0deg, ${effectiveColor} 0%, ${effectiveColor}dd 100%)`
      : `linear-gradient(0deg, ${effectiveColor} 0%, ${effectiveColor}dd 100%)`;
  };

  // Define all menu items with role requirements
  const allMenuItems = [
    {
      title: t("nav.verify"),
      icon: Shield,
      path: "/verification",
      roles: ['product_owner', 'admin', 'operator']
    },
    {
      title: t("nav.manage.id"),
      icon: FileText,
      path: "/manage-id",
      roles: ['product_owner', 'admin']
    },
    {
      title: t("nav.manage.config"),
      icon: Settings,
      path: "/manage-configuration",
      roles: ['product_owner', 'admin']
    },
    {
      title: "Usage Dashboard",
      icon: BarChart3,
      path: "/usage-dashboard",
      roles: ['product_owner', 'admin']
    },
    {
      title: "Manage Subscriptions",
      icon: CreditCard,
      path: "/manage-subscriptions",
      roles: ['product_owner']
    },
    {
      title: "Manage Tenants",
      icon: Building2,
      path: "/manage-tenants",
      roles: ['product_owner']
    },
    {
      title: t("nav.verification.logs"),
      icon: ScrollText,
      path: "/verification-logs",
      roles: ['product_owner', 'admin']
    }
  ];

  // Filter menu items based on user roles
  const menuItems = allMenuItems.filter(item => {
    if (!user || !user.roles) return false;
    
    // Check if user has any of the required roles for this menu item
    return item.roles.some(role => user.roles.includes(role));
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    // Only close sidebar on mobile, preserve state on desktop
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const firstActiveIndex = menuItems.findIndex(
    (item) => location.pathname === item.path || (item.path === '/verification' && location.pathname === '/')
  );
  const lastIndex = menuItems.length - 1;
  const lastActiveIndex = menuItems.findIndex(item => location.pathname === item.path || (item.path === '/verification' && location.pathname === '/'));

  let menuContent;
  if (!user) {
    menuContent = (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  } else {
    menuContent = (
      <SidebarMenu>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path || (item.path === '/verification' && location.pathname === '/');
          const isAboveActive =
            index < menuItems.length - 1 &&
            (location.pathname === menuItems[index + 1]?.path || (menuItems[index + 1]?.path === '/verification' && location.pathname === '/'));
          const isBelowActive =
            index > 0 && (location.pathname === menuItems[index - 1]?.path || (menuItems[index - 1]?.path === '/verification' && location.pathname === '/'));

          return (
            <SidebarMenuItem
              key={item.path}
              isActive={isActive}
              isAboveActive={isAboveActive}
              isBelowActive={isBelowActive}
            >
              <div style={isActive
                ? {
                    background: isDark
                      ? "linear-gradient(90deg, rgb(14 20 42) 0%, rgb(42 46 60) 100%)"
                      : state === "collapsed"
                      ? "linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 80%, rgb(234, 234, 241) 80%, rgb(234, 234, 241) 100%)"
                      : "linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(234, 234, 241, 1) 80%, rgba(234, 234, 241, 1) 100%)",
                    height: "100%",
                  }
                : undefined}>
                <div style={
                  isActive
                    ? {
                        width: '80%',
                        height: '100%',
                        borderTop: `1px solid ${
                          isDark
                            ? state === "collapsed" ? 'transparent':'#1b2238'
                            : state === "collapsed"
                            ? 'transparent'
                            : 'rgb(109 109 119 / 10%)'
                        }`,
                        borderLeft: `2px solid ${
                          isDark
                            ? '#1b2238'
                            : 'rgb(109 109 119 / 10%)'
                        }`,
                        borderBottom: `1px solid ${
                          isDark
                            ? state === "collapsed" ? 'transparent':'#1b2238'
                            : state === "collapsed"
                            ? 'transparent'
                            : 'rgb(109 109 119 / 10%)'
                        }`,
                        borderTopLeftRadius: '35px',
                        borderBottomLeftRadius: '35px',
                        position: 'relative',
                        marginLeft: state === "collapsed" ? '10px': '20px',
                        borderRight: '0',
                        padding: state === "collapsed" ? '0px 0px 5px 5px': '0px 0px 5px 10px',
                        background: isDark ? '#2a2e3c' : '#eaeaf1',
                      }
                    : undefined
                }>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.path)}
                    tooltip={item.title}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 transition-all duration-200",
                      isActive
                        ? "text-white font-medium rounded-[15px] px-8 py-2 mt-2 mb-2 ml-1 mr-1 shadow-inner transform translate-y-0.5"
                        : "rounded-md"
                    )}
                    style={
                      isActive
                        ? {
                            background: getActiveGradient(themeColor, isDark),
                            border: "none",
                            boxShadow: `
                              inset 0 2px 4px rgba(255, 255, 255, 0.4),
                              inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                              0 0.7em 1.5em -0.5em rgba(100, 120, 207, 0.6)
                            `,
                            width: "100%",
                            padding: "20px 10px",
                            letterSpacing: "0.05em",
                            borderRadius: "20em",
                            color: "white",
                            fontSize: ".9em",
                            position: "relative",
                          }
                        : {}
                    }
                  >
                    <item.icon
                      className={cn("size-5 shrink-0", isActive ? "text-white" : "")}
                    />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </div>
              </div>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-n p-0 mr-5">
      <SidebarHeader className="bg-white dark:bg-[#0e142a] rounded-tr-[35px]"  style={
        firstActiveIndex === 0 
          ? { borderBottomRightRadius: "35px" }
          : { borderBottomRightRadius: "0" }
      }>
        <div className="w-full flex items-center justify-between h-18 p-0 px-4 pb-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:gap-0 cursor-pointer" onClick={() => navigate("/")}>
            {appearanceLoading ? (
              // Show loading skeleton while appearance data is loading
              <>
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                <div className="h-6 w-20 bg-muted animate-pulse rounded data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden"></div>
              </>
            ) : (
              <>
                <img
                  src={appearance.productLogo}
                  alt="Logo"
                  className={`object-contain ${isCollapsed ? 'w-13 h-13 pt-3' : 'w-11 h-11'}`}
                />
                {appearance.hasNameImage ? (
                  <img
                    src={appearance.productNameImage}
                    alt="Brand Name"
                    className="h-7 object-contain data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden"
                  />
                ) : (
                  <h1 className="font-poppins font-bold text-xl data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">
                    VeraFi.Me
                  </h1>
                )}
              </>
            )}
          </div>
          {state !== "collapsed" && (
            <SidebarTrigger className="mr-2 my-2" />
          )}
        </div>
        {state === "collapsed" && (
          <div className="flex justify-center pb-3">
            <SidebarTrigger className="ml-0" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <div>
          {menuContent}
        </div>
      </SidebarContent>
      <div
        className="flex-grow bg-white dark:bg-[#0e142a] overflow-hidden"
        style={
          lastActiveIndex === lastIndex && !user
            ? { borderBottomRightRadius: "35px" }
            : undefined
        }/>
      <SidebarFooter className={cn(
        "rounded-br-[35px] bg-white dark:bg-[#0e142a]",
        !isCollapsed && "p-5"
      )}>
        {isCollapsed ? (
          <div className="flex justify-center py-4">
            <button
              className="rounded-full hover:bg-[#7b8ee2] w-10 h-10 flex items-center justify-center shadow-lg"
              style={{
                boxShadow: `
                  inset 0 2px 4px rgba(255, 255, 255, 0.4),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                  0 0.7em 1.5em -0.5em rgba(100, 120, 207, 0.6)
                `,
                background: getActiveGradient(themeColor, isDark),
              }}
              onClick={() => navigate("/help")}
            >
              <HelpCircle className="text-white w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="rounded-[20px] p-3 flex flex-col items-start justify-start text-left bg-[#eff2ff] dark:bg-[#2e3655] h-[200px] overflow-hidden relative">
            <h1 className="text-base font-semibold mb-2 self-start">
              {t("nav.support.help")}
            </h1>
            <button
              className="self-start w-[60%]"
              style={{
                background: getActiveGradient(themeColor, isDark),
                border: "none",
                boxShadow: `
                  inset 0 2px 4px rgba(255, 255, 255, 0.4),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                  0 0.7em 1.5em -0.5em rgba(100, 120, 207, 0.6)
                `,
                padding: "10px ",
                letterSpacing: "0.05em",
                borderRadius: "20em",
                color: "white",
                fontSize: ".85em",
              }}
              onClick={() => navigate("/help")}
            >
              {t("nav.quick.help")}
            </button>
            <img
              src={HelpImage}
              alt="Contact Support"
              className="absolute bottom-0 left-0 right-0 mx-auto w-[60%]"
            />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
