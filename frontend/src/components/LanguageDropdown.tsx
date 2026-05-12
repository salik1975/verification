import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

// Language configuration with flags and display names
const languages = {
  en: { flag: "🇺🇸", name: "English (US)" },
  fr: { flag: "🇫🇷", name: "Français" },
  es: { flag: "🇪🇸", name: "Español" },
};

export function LanguageDropdown() {
  const { language, setLanguage } = useTranslation();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-9 px-3 bg-background border border-border text-foreground hover:bg-accent"
        >
          <span className="mr-2">{languages[language].flag}</span>
          <span className="font-medium">{languages[language].name}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(languages).map(([code, { flag, name }]) => (
          <DropdownMenuItem 
            key={code}
            onClick={() => setLanguage(code as "en" | "fr" | "es")}
            className="flex items-center gap-2"
          >
            <span>{flag}</span>
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
