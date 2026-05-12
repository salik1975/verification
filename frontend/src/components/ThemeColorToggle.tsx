
import { useThemeColor } from "@/hooks/use-theme-color";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VscSymbolColor } from "react-icons/vsc";

// Color configuration with colors and display names
const colors = {
  lavender: { color: "#7287fd", name: "Lavender" },
  flamingo: { color: "#dd7878", name: "Flamingo" },
  teal: { color: "#179299", name: "Teal" },
  green: { color: "#40a02b", name: "Green" },
};

export function ThemeColorToggle() {
  const { themeColor, setThemeColor } = useThemeColor();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-accent/10"
        >
          <VscSymbolColor 
            className="h-8 w-8 text-foreground" 
            style={{ 
              filter: "brightness(0.95) contrast(1.2)"
            }}
          />
          <span className="sr-only">Change theme color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(colors).map(([key, { color, name }]) => (
          <DropdownMenuItem 
            key={key}
            onClick={() => setThemeColor(key as "lavender" | "flamingo" | "teal" | "green")}
            className="flex items-center gap-2"
          >
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
