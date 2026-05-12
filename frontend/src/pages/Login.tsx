import { useState } from 'react';
import { useToast } from '../hooks/use-toast';
import WelcomePage from '../components/WelcomePage';
import LoginModal from '../components/LoginModal';
import SubscriptionPlanSelector from '../components/SubscriptionPlanSelector';

export default function Login() {
  const { toast } = useToast();
  
  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Modal handlers
  const handleShowLogin = () => {
    setShowLoginModal(true);
  };

  const handleCloseLogin = () => {
    setShowLoginModal(false);
  };

  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingComplete = () => {
    // Close onboarding and show login modal directly
    setShowOnboarding(false);
    setShowLoginModal(true);
    
    // Show success toast
    toast({
      title: "Welcome to VeraFi!",
      description: "Your tenant has been created successfully. Please sign in to continue.",
      variant: "default"
    });
  };


  return (
    <div className="min-h-screen bg-background">
      <WelcomePage 
        onLoginClick={handleShowLogin}
        onSignupClick={handleShowOnboarding}
      />
      
      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          isOpen={showLoginModal}
          onClose={handleCloseLogin}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <SubscriptionPlanSelector
          onPlanSelect={handleOnboardingComplete}
          onClose={handleCloseOnboarding}
          isDialog={true}
          mode="signup"
        />
      )}


    </div>
  );
} 