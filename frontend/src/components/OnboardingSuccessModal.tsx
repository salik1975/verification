import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAppearance } from './contexts/AppearanceContext';
import { useReward } from 'react-rewards';

interface OnboardingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin: () => void;
  tenantName: string;
  adminUsername: string;
  adminEmail: string;
}



export default function OnboardingSuccessModal({
  isOpen,
  onClose,
  onGoToLogin,
  tenantName,
  adminUsername,
  adminEmail
}: OnboardingSuccessModalProps) {
  const { appearance, loading: appearanceLoading } = useAppearance();
  
  // React Rewards confetti setup - Left edge explosion
  const { reward: rewardLeft } = useReward('confettiLeft', 'confetti', {
    angle: 45,
    spread: 60,
    startVelocity: 55,
    elementCount: 100,
    elementSize: 10,
    lifetime: 800,
    decay: 0.94,
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FF1493', '#32CD32'],
    zIndex: 9999,
    position: 'fixed',
  });

  // React Rewards confetti setup - Right edge explosion
  const { reward: rewardRight } = useReward('confettiRight', 'confetti', {
    angle: 135,
    spread: 60,
    startVelocity: 55,
    elementCount: 100,
    elementSize: 10,
    lifetime: 800,
    decay: 0.94,
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FF1493', '#32CD32'],
    zIndex: 9999,
    position: 'fixed',
  });

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti explosions from both edges after a short delay - only once
      const timer = setTimeout(() => {
        rewardLeft();
        setTimeout(() => rewardRight(), 100);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rewardLeft, rewardRight]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
        {/* Confetti trigger elements positioned at screen edges */}
        <span id="confettiLeft" className="fixed left-0 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ width: 2, height: 2 }} />
        <span id="confettiRight" className="fixed right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ width: 2, height: 2 }} />

        <div className="bg-background max-w-md w-full rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-500 relative z-[65]">
          
          {/* Logo and Brand Name */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center justify-center gap-5 px-8 py-3 drop-shadow-lg">
            {appearanceLoading ? (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/60 animate-pulse shadow-md flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted-foreground/20 animate-pulse"></div>
                </div>
                <div className="h-10 w-40 bg-gradient-to-r from-muted to-muted/60 animate-pulse rounded-lg shadow-md"></div>
              </>
            ) : (
              <>
                {appearance?.productLogo ? (
                  <img
                    src={appearance.productLogo}
                    alt="Logo"
                    className="w-16 h-16 object-contain drop-shadow-md"
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
                    className="h-10 object-contain drop-shadow-md"
                  />
                ) : (
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {appearance?.productName || 'VeraFi.Me'}
                  </h1>
                )}
              </>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome to VeraFi!
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Your onboarding has been completed successfully
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Tenant Information */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Tenant Created</h3>
                <p className="text-lg font-bold text-primary">{tenantName}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">What's Next?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Use your username and email address with the password you created to sign in to your new tenant.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Your admin account has been created successfully</p>
                <p>• You can now access all features of your subscription</p>
                <p>• Start by exploring your dashboard</p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-2">
              <Button 
                onClick={onGoToLogin}
                className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <span>Go to Login</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
