
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

// Theme configuration with icons and display names
const themes = {
  light: { icon: Sun, name: "Light" },
  dark: { icon: Moon, name: "Dark" },
  system: { icon: Monitor, name: "System" },
};

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();
  
  const CurrentIcon = themes[theme as keyof typeof themes]?.icon || Sun;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-accent/10"
        >
          <CurrentIcon 
            className="h-8 w-8 text-foreground" 
            style={{ 
              filter: "brightness(0.95) contrast(1.2)"
            }}
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(themes).map(([key, { icon: Icon, name }]) => (
          <DropdownMenuItem 
            key={key}
            onClick={() => setTheme(key as "light" | "dark" | "system")}
            className="flex items-center gap-2"
          >
            <Icon className="h-4 w-4" />
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
