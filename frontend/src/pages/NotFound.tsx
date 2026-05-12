
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function NotFound() {
  const location = useLocation();
  // Remove the base URL from the displayed path
  const path = location.pathname.replace(import.meta.env.VITE_BASE_URL || '', '');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Page Not Found</p>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist: {path}
        </p>
        <div className="space-x-4">
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
