import { useAuth } from "@/components/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fallback to dummy data if user is not available
  const displayName = user?.name || "Nella Vita";
  const displayRole = user?.roles?.[0] || "Admin";
  
  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Capitalize first letter of role
  const capitalizeRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-auto p-1 hover:bg-accent/10 rounded-lg transition-all duration-200 group"
        >
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="font-semibold text-foreground text-sm group-hover:text-accent-foreground transition-colors">
                {displayName}
              </div>
              <div className="text-muted-foreground text-xs group-hover:text-accent-foreground/70 transition-colors">
                {capitalizeRole(displayRole)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all duration-200">
              <span className="text-white text-xl font-bold">
                {getInitials(displayName)}
              </span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
