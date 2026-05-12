import { useAppearance } from './contexts/AppearanceContext';
import { Button } from './ui/button';
import { UserPlus, LogIn, Sparkles, Shield, Zap } from 'lucide-react';

interface WelcomePageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export default function WelcomePage({ onLoginClick, onSignupClick }: WelcomePageProps) {
  const { appearance, loading: appearanceLoading } = useAppearance();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Logo and Brand Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            {appearanceLoading ? (
              <>
                {/* Logo skeleton */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/60 animate-pulse shadow-lg flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted-foreground/20 animate-pulse"></div>
                </div>
                {/* Brand name skeleton */}
                <div className="h-10 w-48 bg-gradient-to-r from-muted to-muted/60 animate-pulse rounded-lg shadow-lg"></div>
              </>
            ) : (
              <>
                {appearance?.productLogo ? (
                  <img
                    src={appearance.productLogo}
                    alt="Logo"
                    className="w-16 h-16 object-contain drop-shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">V</span>
                  </div>
                )}
                {appearance?.hasNameImage && appearance?.productNameImage ? (
                  <img
                    src={appearance.productNameImage}
                    alt="Brand Name"
                    className="h-10 object-contain drop-shadow-lg"
                  />
                ) : (
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {appearance?.productName || 'VeraFi.Me'}
                  </h1>
                )}
              </>
            )}
          </div>
          
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            Identity Verification Platform
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Secure, fast, and reliable document verification with advanced biometric authentication
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Shield className="w-6 h-6 text-primary mb-2" />
              <span className="text-xs font-medium text-foreground">Secure</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Zap className="w-6 h-6 text-primary mb-2" />
              <span className="text-xs font-medium text-foreground">Fast</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="w-6 h-6 text-primary mb-2" />
              <span className="text-xs font-medium text-foreground">Reliable</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={onSignupClick}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
          >
            <UserPlus className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            Get Started
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
            </div>
          </div>

          <Button 
            onClick={onLoginClick}
            variant="outline"
            className="w-full h-12 text-base font-semibold border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300 transform hover:scale-105 group"
          >
            <LogIn className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
            Already have an account? Login
          </Button>
        </div>

        {/* Footer text */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Trusted by organizations worldwide for secure identity verification
          </p>
        </div>
      </div>
    </div>
  );
}
