
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { ThemeColorToggle } from "@/components/ThemeColorToggle";
import { LanguageDropdown } from "@/components/LanguageDropdown";
import { UserProfile } from "@/components/UserProfile";

export function AppHeader() {
  return (
    <div className="w-full">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 ml-auto ">
          <ThemeColorToggle />
          <ThemeModeToggle />
          <LanguageDropdown />
          <UserProfile />
        </div>
      </div>
    </div>
  );
}
