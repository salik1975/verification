import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Check, Star, Eye, EyeOff, X, Shield, Globe, Zap, Activity, CreditCard, Lock } from 'lucide-react';
import { useAppearance } from './contexts/AppearanceContext';
import { subscriptionService, SubscriptionTier, SubscriptionService, SubscriptionPlanResponse } from '../services/subscriptionService';
import { tenantService, TenantOnboardingRequest, TenantOnboardingValidationError } from '../services/tenantService';
import { useToast } from '../hooks/use-toast';
import OnboardingSuccessModal from './OnboardingSuccessModal';
import { DatePicker } from './ui/date-picker';

interface PricingPlan {
  tier: SubscriptionTier;
  service: SubscriptionService;
  totalPrice: number;
}

interface SubscriptionPlanSelectorProps {
  onPlanSelect: (plan: PricingPlan) => void;
  onClose: () => void;
  isDialog?: boolean;
  mode?: 'signup' | 'renewal' | 'upgrade';
  currentPlan?: {
    tier: string;
    service: string;
    price: number;
  };
  skipToPayment?: boolean; // New prop to skip directly to payment form
  // New props for renew/upgrade modes
  currentSubscription?: {
    tier_id: number;
    service_id: number;
    tier_name: string;
    service_name: string;
    price: number;
  };
}

export default function SubscriptionPlanSelector({ 
  onPlanSelect, 
  onClose, 
  isDialog = false, 
  mode = 'signup',
  currentPlan,
  skipToPayment = false,
  currentSubscription
}: SubscriptionPlanSelectorProps) {
  const { appearance, loading: appearanceLoading } = useAppearance();
  const { toast } = useToast();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [selectedService, setSelectedService] = useState<SubscriptionService | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState<{
    tenantName: string;
    adminUsername: string;
    adminEmail: string;
  } | null>(null);
  
  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingEmail: ''
  });
  const [paymentErrors, setPaymentErrors] = useState<{ [key: string]: string }>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Ref for payment form section to enable auto-scroll
  const paymentFormRef = useRef<HTMLDivElement>(null);
  
  // Form data for onboarding
  const [formData, setFormData] = useState({
    tenantName: '',
    adminName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    confirmPassword: '',
    subscriptionStartDate: ''
  });

  // Renewal form data
  const [renewalData, setRenewalData] = useState({
    startDate: '',
    startOption: 'continue' as 'continue' | 'custom' // 'continue' or 'custom'
  });

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
    noEmailUsername: false
  });


  // Check if all form fields are filled
  const isFormComplete = () => {
    return formData.tenantName.trim() !== '' &&
           formData.adminName.trim() !== '' &&
           formData.adminEmail.trim() !== '' &&
           formData.adminUsername.trim() !== '' &&
           formData.adminPassword.trim() !== '' &&
           formData.confirmPassword.trim() !== '' &&
           formData.subscriptionStartDate.trim() !== '' &&
           Object.values(passwordValidation).every(Boolean) &&
           formData.adminPassword === formData.confirmPassword;
  };

  // Password strength validation
  const validatePassword = (password: string) => {
    const email = formData.adminEmail.toLowerCase();
    const username = formData.adminUsername.toLowerCase();
    const passwordLower = password.toLowerCase();
    
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noEmailUsername: !email.includes(passwordLower) && !username.includes(passwordLower) && 
                      !passwordLower.includes(email) && !passwordLower.includes(username)
    });
  };

  // Fetch subscription data from API
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        const data = await subscriptionService.getSubscriptionPlans();
        setSubscriptionData(data);
        
        // Handle different modes
        if (data) {
          if (skipToPayment) {
            // Skip to payment mode - select default service and tier
            const defaultService = data.services[0];
            const defaultTier = data.tiers[0];
            
            if (defaultService && defaultTier) {
              setSelectedService(defaultService);
              setSelectedTier(defaultTier);
              setShowPaymentForm(true);
            }
          } else if (mode === 'renewal' && currentSubscription) {
            // Renew mode - set current subscription and show payment form directly
            const currentService = data.services.find(s => s.service_id === currentSubscription.service_id);
            const currentTier = data.tiers.find(t => t.tier_id === currentSubscription.tier_id);
            
            if (currentService && currentTier) {
              setSelectedService(currentService);
              setSelectedTier(currentTier);
              setShowPaymentForm(true);
            }
          }
        }
      } catch (err) {
        setError('Failed to load subscription plans');
        console.error('Error fetching subscription data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionData();
  }, [skipToPayment, mode, currentSubscription]);

  // Auto-scroll to payment form when it becomes visible
  useEffect(() => {
    if (showPaymentForm && paymentFormRef.current) {
      // Small delay to ensure the element is rendered
      setTimeout(() => {
        paymentFormRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [showPaymentForm]);

  const handlePlanSelect = async () => {
    if (!selectedTier || !selectedService || !subscriptionData) {
      toast({
        title: "Error",
        description: "Please select a plan first",
        variant: "destructive"
      });
      return;
    }

    // Show payment form instead of proceeding directly
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedTier || !selectedService || !subscriptionData) {
      toast({
        title: "Error",
        description: "Please select a plan first",
        variant: "destructive"
      });
      return;
    }

    // Validate payment form
    const paymentValidationErrors: { [key: string]: string } = {};
    
    if (!paymentData.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
      paymentValidationErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    if (!paymentData.expiryDate.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)) {
      paymentValidationErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }
    
    if (!paymentData.cvv.match(/^\d{3,4}$/)) {
      paymentValidationErrors.cvv = 'Please enter a valid CVV';
    }
    
    if (!paymentData.cardholderName.trim()) {
      paymentValidationErrors.cardholderName = 'Please enter the cardholder name';
    }
    
    if (!paymentData.billingEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      paymentValidationErrors.billingEmail = 'Please enter a valid email address';
    }
    
    if (Object.keys(paymentValidationErrors).length > 0) {
      setPaymentErrors(paymentValidationErrors);
      toast({
        title: "Payment Error",
        description: "Please fix the errors in the payment form",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingPayment(true);
    setPaymentErrors({});

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate payment success (90% success rate for demo)
      const isPaymentSuccessful = Math.random() > 0.1;
      
      if (!isPaymentSuccessful) {
        throw new Error('Payment failed. Please try again with a different card.');
      }

             // If payment is successful, handle based on mode
       if (mode === 'signup') {
         await proceedWithOnboarding();
       } else {
         // For renew/upgrade modes, just complete the payment
         toast({
           title: mode === 'renewal' ? "Renewal Successful" : "Upgrade Successful",
           description: mode === 'renewal' 
             ? "Your subscription has been renewed successfully!" 
             : "Your subscription has been upgraded successfully!",
           variant: "default"
         });
         onClose();
       }
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Payment processing failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const proceedWithOnboarding = async () => {
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      // Prepare onboarding data
      const onboardingData: TenantOnboardingRequest = {
        tenant_name: formData.tenantName,
        admin_name: formData.adminName,
        admin_email: formData.adminEmail,
        admin_username: formData.adminUsername,
        admin_password: formData.adminPassword,
        subscription_tier_id: selectedTier.tier_id,
        subscription_service_id: selectedService.service_id,
        subscription_start_date: formData.subscriptionStartDate
      };

      // First validate with backend
      const validationResponse = await tenantService.validateTenantOnboarding(onboardingData);
      
      if (validationResponse.errors && validationResponse.errors.length > 0) {
        // Map backend validation errors to field errors
        const backendErrors: { [key: string]: string } = {};
        validationResponse.errors.forEach((error: TenantOnboardingValidationError) => {
          // Map backend field names to frontend field names
          const fieldMap: { [key: string]: string } = {
            'tenant_name': 'tenantName',
            'admin_name': 'adminName',
            'admin_email': 'adminEmail',
            'admin_username': 'adminUsername',
            'admin_password': 'adminPassword',
            'subscription_tier_id': 'subscription_tier_id',
            'subscription_service_id': 'subscription_service_id'
          };
          
          const frontendField = fieldMap[error.field] || error.field;
          backendErrors[frontendField] = error.message;
        });
        
        setFieldErrors(backendErrors);
        
        // Show general error toast
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive"
        });
        return;
      }

      // If validation passes, proceed with onboarding
      const response = await tenantService.onboardTenant(onboardingData);

             // Store onboarding result and show success modal
       setOnboardingResult({
         tenantName: response.tenant_name,
         adminUsername: response.admin_username,
         adminEmail: response.admin_email
       });
       handleOnboardingSuccess();

    } catch (error: any) {
      console.error('Onboarding error:', error);
      
      if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
        // Handle validation errors from FastAPI
        const backendErrors: { [key: string]: string } = {};
        error.response.data.detail.forEach((err: any) => {
          const fieldMap: { [key: string]: string } = {
            'tenant_name': 'tenantName',
            'admin_name': 'adminName',
            'admin_email': 'adminEmail',
            'admin_username': 'adminUsername',
            'admin_password': 'adminPassword',
            'subscription_start_date': 'subscriptionStartDate'
          };
          
          // Extract field name from the location array
          const fieldPath = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : '';
          const frontendField = fieldMap[fieldPath] || fieldPath;
          backendErrors[frontendField] = err.msg;
        });
        
        setFieldErrors(backendErrors);
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive"
        });
      } else if (error.response?.data?.errors) {
        // Handle validation errors from other formats
        const backendErrors: { [key: string]: string } = {};
        error.response.data.errors.forEach((err: any) => {
          const fieldMap: { [key: string]: string } = {
            'tenant_name': 'tenantName',
            'admin_name': 'adminName',
            'admin_email': 'adminEmail',
            'admin_username': 'adminUsername',
            'admin_password': 'adminPassword',
            'subscription_start_date': 'subscriptionStartDate'
          };
          
          const frontendField = fieldMap[err.field] || err.field;
          backendErrors[frontendField] = err.message;
        });
        
        setFieldErrors(backendErrors);
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive"
        });
      } else {
        // Handle general errors
        toast({
          title: "Onboarding Failed",
          description: error.response?.data?.detail || "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriceForSelection = (tierId: number, serviceId: number) => {
    return subscriptionData?.pricing_matrix[tierId]?.[serviceId] || 0;
  };

  // Calculate renewal dates and info
  const getRenewalInfo = () => {
    if (!currentSubscription) return null;
    
    // For demo purposes, assume current subscription ends in 18 days (from mock data)
    const currentEndDate = new Date();
    currentEndDate.setDate(currentEndDate.getDate() + 18); // 18 days from now
    const daysLeft = Math.ceil((currentEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    let newStartDate: Date;
    let newEndDate: Date;
    
    if (renewalData.startOption === 'continue') {
      // Start renewal when current subscription ends
      newStartDate = new Date(currentEndDate);
      newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1); // Add 1 month
    } else {
      // Use custom start date
      newStartDate = new Date(renewalData.startDate);
      newEndDate = new Date(renewalData.startDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1); // Add 1 month
    }
    
    return {
      currentEndDate,
      daysLeft,
      newStartDate,
      newEndDate,
      newDaysRemaining: Math.ceil((newEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };
  };

  const handleTierChange = () => {
    setSelectedTier(null);
  };

  const handleServiceChange = () => {
    setSelectedService(null);
    setSelectedTier(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Validate password when password field changes
    if (field === 'adminPassword') {
      validatePassword(value);
    }
  };

  const handleRenewalInputChange = (field: string, value: string) => {
    setRenewalData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentInputChange = (field: string, value: string) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
    
    // Clear payment field error when user starts typing
    if (paymentErrors[field]) {
      setPaymentErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ 
      ...prev, 
      adminPassword: password,
      confirmPassword: password 
    }));
    validatePassword(password);
  };

  const resetForm = () => {
    setFormData({
      tenantName: '',
      adminName: '',
      adminEmail: '',
      adminUsername: '',
      adminPassword: '',
      confirmPassword: '',
      subscriptionStartDate: ''
    });
    setRenewalData({
      startDate: '',
      startOption: 'continue'
    });
    setPasswordValidation({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      symbol: false,
      noEmailUsername: false
    });
    setFieldErrors({});
    setPaymentData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      billingEmail: ''
    });
    setPaymentErrors({});
    setShowPaymentForm(false);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setOnboardingResult(null);
    onClose();
  };

  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    setOnboardingResult(null);
    onClose();
    // Call onPlanSelect to notify parent component that onboarding is complete
    if (onPlanSelect) {
      onPlanSelect({
        tier: selectedTier!,
        service: selectedService!,
        totalPrice: getPriceForSelection(selectedTier?.tier_id || 0, selectedService?.service_id || 0)
      });
    }
  };

  const handleOnboardingSuccess = () => {
    // Just show the success modal - don't close the form yet
    setShowSuccessModal(true);
  };

  // Get header text based on mode and skipToPayment
  const getHeaderText = () => {
    // If skipping to payment, show payment-specific header
    if (skipToPayment) {
      return {
        title: 'Payment Information',
        subtitle: 'Complete your subscription with secure payment'
      };
    }
    
    switch (mode) {
      case 'renewal':
        return {
          title: 'Renew Your Subscription',
          subtitle: 'Choose to renew your current plan or explore other options'
        };
      case 'upgrade':
        return {
          title: 'Upgrade Your Subscription',
          subtitle: 'Explore higher tiers and additional services to meet your growing needs'
        };
      default:
        return {
          title: 'Choose your subscription plan',
          subtitle: 'Select the perfect plan for your verification needs'
        };
    }
  };

  const headerText = getHeaderText();

  // Helper function to get service icon and color
  const getServiceDetails = (serviceName: string) => {
    if (!serviceName) {
      return { 
        icon: Activity, 
        color: 'from-gray-200 to-slate-300', 
        bgColor: 'bg-gray-100/30', 
        borderColor: 'border-gray-300/40',
        iconBg: 'from-gray-400 to-slate-500',
        iconColor: 'text-white'
      };
    }
    
    if (serviceName.toLowerCase().includes('document')) {
      return { 
        icon: Shield, 
        color: 'from-green-200 to-emerald-300', 
        bgColor: 'bg-green-100/30', 
        borderColor: 'border-green-300/40',
        iconBg: 'from-green-400 to-emerald-500',
        iconColor: 'text-white'
      };
    } else if (serviceName.toLowerCase().includes('sms') || serviceName.toLowerCase().includes('email')) {
      return { 
        icon: Globe, 
        color: 'from-blue-200 to-cyan-300', 
        bgColor: 'bg-blue-100/30', 
        borderColor: 'border-blue-300/40',
        iconBg: 'from-blue-400 to-cyan-500',
        iconColor: 'text-white'
      };
    } else if (serviceName.toLowerCase().includes('bundle')) {
      return { 
        icon: Zap, 
        color: 'from-purple-200 to-pink-300', 
        bgColor: 'bg-purple-100/30', 
        borderColor: 'border-purple-300/40',
        iconBg: 'from-purple-400 to-pink-500',
        iconColor: 'text-white'
      };
    }
    return { 
      icon: Activity, 
      color: 'from-gray-200 to-slate-300', 
      bgColor: 'bg-gray-100/30', 
      borderColor: 'border-gray-300/40',
      iconBg: 'from-gray-400 to-slate-500',
      iconColor: 'text-white'
    };
  };

  // Helper function to get tier icon and color
  const getTierDetails = (tierName: string) => {
    if (!tierName) {
      return { 
        icon: Activity, 
        color: 'from-blue-200 to-purple-300', 
        bgColor: 'bg-blue-100/30', 
        borderColor: 'border-blue-300/40',
        iconBg: 'from-blue-400 to-purple-500',
        iconColor: 'text-white'
      };
    }
    
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return { 
          icon: Shield, 
          color: 'from-amber-200 to-orange-300', 
          bgColor: 'bg-amber-100/30', 
          borderColor: 'border-amber-300/40',
          iconBg: 'from-amber-400 to-orange-500',
          iconColor: 'text-white'
        };
      case 'silver':
        return { 
          icon: Star, 
          color: 'from-slate-200 to-gray-300', 
          bgColor: 'bg-slate-100/30', 
          borderColor: 'border-slate-300/40',
          iconBg: 'from-slate-400 to-gray-500',
          iconColor: 'text-white'
        };
      case 'gold':
        return { 
          icon: Zap, 
          color: 'from-yellow-200 to-amber-300', 
          bgColor: 'bg-yellow-100/30', 
          borderColor: 'border-yellow-300/40',
          iconBg: 'from-yellow-400 to-amber-500',
          iconColor: 'text-white'
        };
      default:
        return { 
          icon: Activity, 
          color: 'from-blue-200 to-purple-300', 
          bgColor: 'bg-blue-100/30', 
          borderColor: 'border-blue-300/40',
          iconBg: 'from-blue-400 to-purple-500',
          iconColor: 'text-white'
        };
    }
  };

  // Get data from API or show loading
  const { tiers = [], services = [], pricing_matrix = {} } = subscriptionData || {};

  return (
    <>
      <div className={isDialog ? "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" : "w-full"}>
        <div className={`bg-background ${isDialog ? "max-w-7xl w-full rounded-lg" : "w-full rounded-lg"} ${isDialog ? "min-h-[40vh] max-h-[90vh]" : "max-h-[90vh]"} overflow-visible ${isDialog ? "animate-in slide-in-from-bottom-4 duration-500 relative" : "relative"} shadow-2xl`}>
        {/* Logo and Brand Name - Positioned at top center, center on edge of box */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center justify-center gap-5 px-8 py-3 drop-shadow-lg">
            {appearanceLoading ? (
              <>
                {/* Logo skeleton */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/60 animate-pulse shadow-md flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted-foreground/20 animate-pulse"></div>
                </div>
                {/* Brand name skeleton */}
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

        {/* Scrollable content container */}
        <div className="max-h-[calc(90vh-2rem)] overflow-y-auto rounded-lg">
          {/* Header with close button */}
          <div className="p-6 pt-10 border-b bg-gradient-to-r from-background to-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  {headerText.title}
                </h2>
                <p className="text-muted-foreground mt-2">{headerText.subtitle}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 rounded-full w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 pt-4">
                         {/* Service Selection - Show when no tier is selected and not in renew mode */}
             {!selectedTier && mode !== 'renewal' && (
              <div className={`mb-6 transition-all duration-700 ease-in-out ${
                selectedService ? 'opacity-60 scale-95 hover:opacity-100 hover:scale-100' : 'opacity-100 scale-100'
              }`}>
                <h3 className="text-xl font-semibold mb-4 text-foreground">Select Service Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    // Loading placeholders for services
                                         <>
                       {[1, 2, 3].map((index) => (
                         <Card key={`loading-service-${index}`} className="border-2 border-border animate-pulse min-h-[280px]">
                           <CardHeader className="pb-3">
                             <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-lg bg-muted animate-pulse"></div>
                               <div className="flex-1">
                                 <div className="h-5 bg-muted rounded animate-pulse mb-2"></div>
                                 <div className="h-3 bg-muted rounded animate-pulse"></div>
                               </div>
                             </div>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className="space-y-3 mb-4">
                               <div className="h-16 bg-muted rounded animate-pulse"></div>
                             </div>
                             <div className="space-y-2">
                               {[1, 2, 3].map((featureIndex) => (
                                 <div key={featureIndex} className="flex items-center text-sm">
                                   <div className="w-4 h-4 bg-muted rounded mr-2 animate-pulse"></div>
                                   <div className="h-3 bg-muted rounded flex-1 animate-pulse"></div>
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       ))}
                     </>
                  ) : error ? (
                    // Error state for services
                    <div className="col-span-3 flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="text-red-500 mb-4">Failed to load services</p>
                        <Button onClick={() => window.location.reload()}>Retry</Button>
                      </div>
                    </div>
                                     ) : (
                     // Actual service data - sorted by minimum price
                     services
                       .map(service => {
                         const minPrice = Math.min(...Object.values(pricing_matrix).map(tier => tier[service.service_id] || 0));
                         return { service, minPrice };
                       })
                       .sort((a, b) => a.minPrice - b.minPrice)
                       .map(({ service }, index) => {
                         const serviceDetails = getServiceDetails(service.service_name);
                         const IconComponent = serviceDetails?.icon || Activity;
                         
                         return (
                        <Card 
                          key={service.service_id} 
                          className={`group relative overflow-hidden border-2 ${serviceDetails.borderColor} ${serviceDetails.bgColor} shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-200 transform hover:scale-102 hover:-translate-y-1 animate-in slide-in-from-bottom-2 duration-200 cursor-pointer ${
                            selectedService?.service_id === service.service_id 
                              ? 'ring-2 ring-primary border-primary shadow-lg scale-105' 
                              : 'hover:border-primary/50'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => setSelectedService(service)}
                        >
                          {/* Gradient Background */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${serviceDetails.color} opacity-5 group-hover:opacity-10 transition-opacity duration-200`} />
                          
                          <CardHeader className="relative z-10 pb-3">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${serviceDetails?.iconBg || 'from-gray-400 to-slate-500'} flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-105`}>
                                <IconComponent className={`w-5 h-5 ${serviceDetails?.iconColor || 'text-white'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight break-words">
                                  {service.service_name}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">
                                  Service Type
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="relative z-10 space-y-3">
                            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                              <div className="text-xl font-bold text-foreground mb-1">
                                Starting from ${Math.min(...Object.values(pricing_matrix).map(tier => tier[service.service_id] || 0))}
                                <span className="text-sm font-normal text-muted-foreground">/month</span>
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                ${(Math.min(...Object.values(pricing_matrix).map(tier => tier[service.service_id] || 0)) * 12).toFixed(0)}/year
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {service.service_description}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              {service.service_name.toLowerCase().includes('document') && (
                                <>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Document upload & verification
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Face matching & liveness detection
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Critical fields validation
                                  </div>
                                </>
                              )}
                              {service.service_name.toLowerCase().includes('sms') && (
                                <>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    SMS verification
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Email verification
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    OTP management
                                  </div>
                                </>
                              )}
                              {service.service_name.toLowerCase().includes('bundle') && (
                                <>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    All Document ID features
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    All SMS/Email features
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Unified dashboard
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}

                         {/* Tier Selection - Show after service is selected, hide when tier is selected, and not in renew mode */}
             {selectedService && !selectedTier && mode !== 'renewal' && (
              <div className="mb-6 animate-in slide-in-from-bottom-4 duration-700 ease-out">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Select Plan Tier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    // Loading placeholders for tiers
                                         <>
                       {[1, 2, 3].map((index) => (
                         <Card key={`loading-tier-${index}`} className="border-2 border-border animate-pulse relative min-h-[280px]">
                           <CardHeader className="pb-3">
                             <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-lg bg-muted animate-pulse"></div>
                               <div className="flex-1">
                                 <div className="h-5 bg-muted rounded animate-pulse mb-2"></div>
                                 <div className="h-3 bg-muted rounded animate-pulse"></div>
                               </div>
                             </div>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className="space-y-3 mb-4">
                               <div className="h-16 bg-muted rounded animate-pulse"></div>
                             </div>
                             <div className="space-y-2">
                               {[1, 2, 3, 4].map((featureIndex) => (
                                 <div key={featureIndex} className="flex items-center text-sm">
                                   <div className="w-4 h-4 bg-muted rounded mr-2 animate-pulse"></div>
                                   <div className="h-3 bg-muted rounded flex-1 animate-pulse"></div>
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       ))}
                     </>
                  ) : error ? (
                    // Error state for tiers
                    <div className="col-span-3 flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="text-red-500 mb-4">Failed to load tiers</p>
                        <Button onClick={() => window.location.reload()}>Retry</Button>
                      </div>
                    </div>
                                     ) : (
                     // Actual tier data - sorted by price for selected service
                     tiers
                       .map(tier => {
                         const price = selectedService ? getPriceForSelection(tier.tier_id, selectedService.service_id) : 0;
                         return { tier, price };
                       })
                       .sort((a, b) => a.price - b.price)
                       .map(({ tier }, index) => {
                         const price = selectedService ? getPriceForSelection(tier.tier_id, selectedService.service_id) : 0;
                         const tierDetails = getTierDetails(tier.tier_name);
                         const IconComponent = tierDetails?.icon || Activity;
                         const isPopular = tier.tier_name.toLowerCase() === 'silver';
                         
                         return (
                        <Card 
                          key={tier.tier_id} 
                          className={`group relative overflow-visible border-2 ${tierDetails.borderColor} ${tierDetails.bgColor} shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-200 transform hover:scale-102 hover:-translate-y-1 animate-in slide-in-from-bottom-2 duration-200 cursor-pointer ${
                            selectedTier?.tier_id === tier.tier_id 
                              ? 'ring-2 ring-primary border-primary shadow-lg scale-105' 
                              : 'hover:border-primary/50'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => setSelectedTier(tier)}
                        >
                          {/* Gradient Background */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${tierDetails.color} opacity-5 group-hover:opacity-10 transition-opacity duration-200`} />
                          
                          {isPopular && (
                            <Badge className="absolute -top-3 -right-3 bg-primary text-primary-foreground animate-pulse z-20 px-2 py-1 text-xs font-medium shadow-lg">
                              <Star className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                          
                          <CardHeader className="relative z-10 pb-3">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tierDetails?.iconBg || 'from-gray-400 to-slate-500'} flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-105`}>
                                <IconComponent className={`w-5 h-5 ${tierDetails?.iconColor || 'text-white'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight break-words">
                                  {tier.tier_name}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">
                                  Up to {tier.max_reports} verifications per month
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="relative z-10 space-y-3">
                            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Monthly Price</span>
                                <span className="text-xl font-bold text-foreground">${price}</span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">per month</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                ${(price * 12).toFixed(0)}/year
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {selectedService.service_name}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                Up to {tier.max_reports} verifications
                              </div>
                              {tier.tier_name.toLowerCase() === 'bronze' && (
                                <>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Basic support
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Standard features
                                  </div>
                                </>
                              )}
                              {tier.tier_name.toLowerCase() === 'silver' && (
                                <>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Email support
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Advanced features
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Export reports
                                  </div>
                                </>
                              )}
                              {tier.tier_name.toLowerCase() === 'gold' && (
                                <>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Priority support
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    All features
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Advanced analytics
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                    Custom integrations
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}

                                                   {/* Plan Selection Summary and Form - Only show when both service and tier are selected, but not when skipping to payment or in renew/upgrade mode */}
              {selectedTier && selectedService && !skipToPayment && mode === 'signup' && (
              <div className="border-t pt-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Side - Selection Summary Card */}
                  <div className="lg:col-span-1">
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20 sticky top-6">
                      <h4 className="font-semibold mb-4 text-lg text-foreground">Selected Plan</h4>
                      <div className="space-y-4">
                        {/* Service Selection */}
                        <div className={`rounded-lg p-4 border-2 relative overflow-hidden ${getServiceDetails(selectedService?.service_name || '').bgColor} ${getServiceDetails(selectedService?.service_name || '').borderColor}`}>
                          {/* Gradient Background */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${getServiceDetails(selectedService?.service_name || '').color} opacity-5`} />
                          
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getServiceDetails(selectedService?.service_name || '')?.iconBg || 'from-gray-400 to-slate-500'} flex items-center justify-center shadow-sm`}>
                                  {React.createElement(getServiceDetails(selectedService?.service_name || '')?.icon || Activity, { 
                                    className: `w-3 h-3 ${getServiceDetails(selectedService?.service_name || '')?.iconColor || 'text-white'}` 
                                  })}
                                </div>
                                <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Service</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleServiceChange}
                                className="h-6 w-6 p-0 text-xs hover:bg-muted/50"
                              >
                                ✕
                              </Button>
                            </div>
                            <div className="font-medium text-foreground text-sm leading-tight">{selectedService?.service_name || 'Unknown Service'}</div>
                            <div className="text-xs text-muted-foreground mt-1">{selectedService?.service_description || 'No description available'}</div>
                          </div>
                        </div>

                        {/* Tier Selection */}
                        <div className={`rounded-lg p-4 border-2 relative overflow-hidden ${getTierDetails(selectedTier?.tier_name || '').bgColor} ${getTierDetails(selectedTier?.tier_name || '').borderColor}`}>
                          {/* Gradient Background */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${getTierDetails(selectedTier?.tier_name || '')?.color} opacity-5`} />
                          
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getTierDetails(selectedTier?.tier_name || '')?.iconBg || 'from-gray-400 to-slate-500'} flex items-center justify-center shadow-sm`}>
                                  {React.createElement(getTierDetails(selectedTier?.tier_name || '')?.icon || Activity, { 
                                    className: `w-3 h-3 ${getTierDetails(selectedTier?.tier_name || '')?.iconColor || 'text-white'}` 
                                  })}
                                </div>
                                <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Tier</span>
                                {selectedTier?.tier_name.toLowerCase() === 'silver' && (
                                  <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 shadow-sm">
                                    <Star className="w-2.5 h-2.5 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleTierChange}
                                className="h-6 w-6 p-0 text-xs hover:bg-muted/50"
                              >
                                ✕
                              </Button>
                            </div>
                            <div className="font-medium text-foreground text-sm leading-tight">{selectedTier?.tier_name || 'Unknown Tier'}</div>
                            <div className="text-xs text-muted-foreground mt-1">Up to {selectedTier?.max_reports || 0} verifications/month</div>
                          </div>
                        </div>

                        {/* Price Summary */}
                        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Monthly Price</div>
                          <div className="font-bold text-2xl text-primary">${getPriceForSelection(selectedTier?.tier_id || 0, selectedService?.service_id || 0)}</div>
                          <div className="text-sm text-muted-foreground mt-1">Billed monthly</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            ${(getPriceForSelection(selectedTier?.tier_id || 0, selectedService?.service_id || 0) * 12).toFixed(0)}/year
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                                     {/* Right Side - Onboarding Form */}
                   <div className="lg:col-span-2">
                     <div className="bg-card rounded-xl border shadow-sm p-6">
                       <div className="mb-4">
                         <h4 className="text-xl font-bold text-foreground mb-1">Complete Your Onboarding</h4>
                         <p className="text-muted-foreground text-sm">Set up your tenant and admin account to get started</p>
                       </div>
                       
                       {/* Onboarding Form */}
                       <div className="space-y-4">
                                                 {/* Company Information */}
                         <div className="space-y-2">
                           <div className="flex items-center space-x-3 mb-2">
                             <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                               <span className="text-primary font-semibold text-sm">1</span>
                             </div>
                             <h5 className="text-base font-semibold text-foreground">Company Information</h5>
                           </div>
                           <div className="pl-9">
                                                         <div>
                                                              <Label htmlFor="tenantName" className="text-sm font-medium text-foreground mb-1 block">
                                  Company Name <span className="text-red-500">*</span>
                                </Label>
                                                                 <Input
                                   id="tenantName"
                                   type="text"
                                   placeholder="Enter your company name"
                                   value={formData.tenantName}
                                   onChange={(e) => handleInputChange('tenantName', e.target.value)}
                                   className={`bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 max-w-md ${
                                     fieldErrors.tenantName ? 'border-red-500' : 'border-border'
                                   }`}
                                 />
                                {fieldErrors.tenantName && (
                                  <p className="text-red-500 text-xs mt-1">{fieldErrors.tenantName}</p>
                                )}
                             </div>
                          </div>
                        </div>

                                                                                                   {/* Admin User Information */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-semibold text-sm">2</span>
                              </div>
                              <h5 className="text-base font-semibold text-foreground">Account Details</h5>
                            </div>
                            <div className="pl-9 space-y-2">
                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="adminName" className="text-sm font-medium text-foreground mb-1 block">
                                    Full Name <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="adminName"
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={formData.adminName}
                                    onChange={(e) => handleInputChange('adminName', e.target.value)}
                                    className="bg-background border-2 border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="adminEmail" className="text-sm font-medium text-foreground mb-1 block">
                                    Email Address <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="adminEmail"
                                    type="email"
                                    placeholder="admin@company.com"
                                    value={formData.adminEmail}
                                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                                    className="bg-background border-2 border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60"
                                  />
                                </div>
                              </div>
                                                          <div>
                                <Label htmlFor="adminUsername" className="text-sm font-medium text-foreground mb-1 block">
                                  Username <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="adminUsername"
                                  type="text"
                                  placeholder="Choose a unique username"
                                  value={formData.adminUsername}
                                  onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                                  className="bg-background border-2 border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 max-w-xs"
                                />
                              </div>

                              {/* Password Section - Now part of Account Details */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-foreground">
                                    Password <span className="text-red-500">*</span>
                                  </Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateStrongPassword}
                                    className="text-xs h-6 px-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                  >
                                    Generate Strong Password
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="relative">
                                                                          <Input
                                        id="adminPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter password"
                                        value={formData.adminPassword}
                                        onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                                        className={`pr-10 bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                                          fieldErrors.adminPassword ? 'border-red-500' : 'border-border'
                                        }`}
                                      />
                                     <Button
                                       type="button"
                                       variant="ghost"
                                       size="sm"
                                       className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 transition-colors duration-200"
                                       onClick={() => setShowPassword(!showPassword)}
                                     >
                                       {showPassword ? (
                                         <EyeOff className="h-4 w-4 text-muted-foreground" />
                                       ) : (
                                         <Eye className="h-4 w-4 text-muted-foreground" />
                                       )}
                                     </Button>
                                   </div>
                                 </div>
                                   <div>
                                     <div className="relative">
                                       <Input
                                         id="confirmPassword"
                                         type={showConfirmPassword ? "text" : "password"}
                                         placeholder="Confirm password"
                                         value={formData.confirmPassword}
                                         onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                         className="pr-10 bg-background border-2 border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60"
                                       />
                                       <Button
                                         type="button"
                                         variant="ghost"
                                         size="sm"
                                         className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 transition-colors duration-200"
                                         onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                       >
                                         {showConfirmPassword ? (
                                           <EyeOff className="h-4 w-4 text-muted-foreground" />
                                         ) : (
                                           <Eye className="h-4 w-4 text-muted-foreground" />
                                         )}
                                       </Button>
                                     </div>
                                   </div>
                                 </div>
                                                                                                 {/* Password Strength Indicator */}
                                  {formData.adminPassword && (
                                   <div className="mt-2 p-2 bg-muted/30 border border-border rounded-lg">
                                     <div className="text-xs font-medium text-foreground mb-1">Password Requirements:</div>
                                     <div className="space-y-1">
                                       <div className={`flex items-center text-xs ${passwordValidation.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                                         <span className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.length ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                                         At least 8 characters
                                       </div>
                                       <div className={`flex items-center text-xs ${passwordValidation.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                                         <span className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.uppercase ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                                         One uppercase letter
                                       </div>
                                       <div className={`flex items-center text-xs ${passwordValidation.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                                         <span className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.lowercase ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                                         One lowercase letter
                                       </div>
                                       <div className={`flex items-center text-xs ${passwordValidation.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                                         <span className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.number ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                                         One number
                                       </div>
                                       <div className={`flex items-center text-xs ${passwordValidation.symbol ? 'text-green-600' : 'text-muted-foreground'}`}>
                                         <span className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.symbol ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                                         One symbol
                                       </div>
                                       <div className={`flex items-center text-xs ${passwordValidation.noEmailUsername ? 'text-green-600' : 'text-muted-foreground'}`}>
                                         <span className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.noEmailUsername ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                                         Not contain email or username
                                       </div>
                                     </div>
                                   </div>
                                 )}

                                                                                                 {/* Password Match Error - Only show when user starts typing confirm password */}
                                  {formData.confirmPassword && formData.adminPassword !== formData.confirmPassword && (
                                   <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                                     <p className="text-sm text-destructive flex items-center">
                                       <span className="w-2 h-2 bg-destructive rounded-full mr-2"></span>
                                       Passwords do not match
                                     </p>
                                   </div>
                                 )}
                               </div>
                           </div>
                         </div>

                                                 

                                                                                                                                                                                                       {/* Subscription Start Date */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-semibold text-sm">3</span>
                              </div>
                              <h5 className="text-base font-semibold text-foreground">Subscription Activation</h5>
                            </div>
                            <div className="pl-9">
                                                                                             <div>
                                  <DatePicker
                                    value={formData.subscriptionStartDate}
                                    onChange={(date) => handleInputChange('subscriptionStartDate', date)}
                                    min={new Date().toISOString().split('T')[0]}
                                    placeholder="Select start date"
                                    className="w-32"
                                    label="Subscription Start Date"
                                    required={true}
                                    error={fieldErrors.subscriptionStartDate}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Choose when you want your subscription to become active
                                  </p>
                                </div>
                           </div>
                         </div>

                                                   {/* Role Information */}
                          <div className="pl-9">
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 text-primary" />
                                </div>
                                <span className="text-sm text-foreground">
                                  This user will be assigned the <strong className="text-primary">Admin</strong> role by default
                                </span>
                              </div>
                            </div>
                          </div>
                      </div>

                                             <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-border">
                         <Button 
                           variant="outline" 
                           onClick={resetForm}
                           className="px-4 py-2 text-sm transition-all duration-200 hover:bg-muted/50"
                         >
                           Reset
                         </Button>
                         <Button 
                           onClick={handlePlanSelect} 
                           disabled={!isFormComplete() || isSubmitting}
                           className={`px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                             isFormComplete() && !isSubmitting
                               ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                               : 'bg-muted text-muted-foreground cursor-not-allowed'
                           }`}
                         >
                           {isSubmitting ? 'Onboarding...' : 'Proceed to Payment'}
                         </Button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

                                       {/* Upgrade Mode - Show plan comparison when in upgrade mode and no tier selected yet */}
              {mode === 'upgrade' && !selectedTier && currentSubscription && !showPaymentForm && (
                <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
                    <div className="mb-4">
                      <h4 className="text-xl font-bold text-foreground mb-1">Current Plan</h4>
                      <p className="text-muted-foreground text-sm">Your current subscription details</p>
                    </div>
                    
                    <div className="bg-background/50 rounded-lg p-4 border border-border/50 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
                        <span className="text-sm font-medium text-foreground">
                          {currentSubscription.tier_name} - {currentSubscription.service_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Monthly Price:</span>
                        <span className="text-lg font-bold text-primary">
                          ${currentSubscription.price}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Status:</span>
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">Select a new plan below to upgrade your subscription</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upgrade Mode - Show upgrade comparison after tier selection */}
              {mode === 'upgrade' && selectedTier && selectedService && !showPaymentForm && currentSubscription && (
                <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
                    <div className="mb-4">
                      <h4 className="text-xl font-bold text-foreground mb-1">Upgrade Comparison</h4>
                      <p className="text-muted-foreground text-sm">Compare your current plan with the new selection</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Current Plan */}
                      <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                        <h5 className="font-semibold text-foreground mb-3">Current Plan</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Plan:</span>
                            <span className="text-sm font-medium text-foreground">
                              {currentSubscription.tier_name} - {currentSubscription.service_name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Price:</span>
                            <span className="text-lg font-bold text-primary">
                              ${currentSubscription.price}/month
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <span className="text-sm font-medium text-green-600">Active</span>
                          </div>
                        </div>
                      </div>

                      {/* New Plan */}
                      <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                        <h5 className="font-semibold text-foreground mb-3">New Plan</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Plan:</span>
                            <span className="text-sm font-medium text-foreground">
                              {selectedTier.tier_name} - {selectedService.service_name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Price:</span>
                            <span className="text-lg font-bold text-primary">
                              ${getPriceForSelection(selectedTier.tier_id, selectedService.service_id)}/month
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Price Difference:</span>
                            <span className={`text-sm font-medium ${
                              getPriceForSelection(selectedTier.tier_id, selectedService.service_id) > currentSubscription.price 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {getPriceForSelection(selectedTier.tier_id, selectedService.service_id) > currentSubscription.price ? '+' : ''}
                              ${getPriceForSelection(selectedTier.tier_id, selectedService.service_id) - currentSubscription.price}/month
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proceed Button */}
                    <div className="flex justify-end pt-4 border-t border-border">
                      <Button 
                        onClick={() => setShowPaymentForm(true)}
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Proceed to Payment
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Renewal Mode - Show renewal options when in renewal mode and no payment form shown yet */}
              {mode === 'renewal' && !showPaymentForm && currentSubscription && (
                <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
                    <div className="mb-4">
                      <h4 className="text-xl font-bold text-foreground mb-1">Renewal Options</h4>
                      <p className="text-muted-foreground text-sm">Choose when you want your renewal to start</p>
                    </div>
                    
                    {(() => {
                      const renewalInfo = getRenewalInfo();
                      if (!renewalInfo) return null;
                      
                      return (
                        <div className="space-y-4">
                          {/* Current Plan Summary */}
                          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
                              <span className="text-sm font-medium text-foreground">
                                {currentSubscription.tier_name} - {currentSubscription.service_name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Monthly Price:</span>
                              <span className="text-lg font-bold text-primary">
                                ${currentSubscription.price}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Current End Date:</span>
                              <span className="text-sm font-medium text-foreground">
                                {renewalInfo.currentEndDate.toLocaleDateString()} ({renewalInfo.daysLeft} days left)
                              </span>
                            </div>
                          </div>

                          {/* Renewal Start Options */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                id="continue-option"
                                name="startOption"
                                value="continue"
                                checked={renewalData.startOption === 'continue'}
                                onChange={(e) => setRenewalData(prev => ({ ...prev, startOption: e.target.value as 'continue' | 'custom' }))}
                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                              />
                              <label htmlFor="continue-option" className="flex-1 cursor-pointer">
                                <div className="font-medium text-foreground">Continue when current ends</div>
                                <div className="text-sm text-muted-foreground">
                                  New subscription starts: {renewalInfo.newStartDate.toLocaleDateString()} 
                                  (Ends: {renewalInfo.newEndDate.toLocaleDateString()})
                                </div>
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                id="custom-option"
                                name="startOption"
                                value="custom"
                                checked={renewalData.startOption === 'custom'}
                                onChange={(e) => setRenewalData(prev => ({ ...prev, startOption: e.target.value as 'continue' | 'custom' }))}
                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                              />
                              <label htmlFor="custom-option" className="flex-1 cursor-pointer">
                                <div className="font-medium text-foreground">Choose custom start date</div>
                                <div className="text-sm text-muted-foreground">
                                  Select when you want the renewal to begin
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* Custom Date Picker */}
                          {renewalData.startOption === 'custom' && (
                            <div className="pl-7">
                              <div className="bg-background/30 rounded-lg p-4 border border-border/30">
                                <Label htmlFor="renewalStartDate" className="text-sm font-medium text-foreground mb-2 block">
                                  Renewal Start Date
                                </Label>
                                <DatePicker
                                  value={renewalData.startDate}
                                  onChange={(date) => handleRenewalInputChange('startDate', date)}
                                  min={new Date().toISOString().split('T')[0]}
                                  placeholder="Select start date"
                                  className="w-full"
                                  label=""
                                  required={true}
                                />
                                {renewalData.startDate && (() => {
                                  const customStartDate = new Date(renewalData.startDate);
                                  const customEndDate = new Date(customStartDate);
                                  customEndDate.setMonth(customEndDate.getMonth() + 1);
                                  const customDaysRemaining = Math.ceil((customEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  return (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      New subscription will end: {customEndDate.toLocaleDateString()} ({customDaysRemaining} days total)
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Proceed Button */}
                          <div className="flex justify-end pt-4 border-t border-border">
                            <Button 
                              onClick={() => setShowPaymentForm(true)}
                              className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              Proceed to Payment
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

             {/* Payment Form - Show after onboarding form is complete */}
             {showPaymentForm && selectedTier && selectedService && (
              <div ref={paymentFormRef} className="border-t pt-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">

                                     {/* Payment Summary */}
                   <div className="bg-background/50 rounded-lg p-4 border border-border/50 mb-6">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium text-muted-foreground">
                         {mode === 'renewal' ? 'Renewing Plan:' : 'Plan:'}
                       </span>
                       <span className="text-sm font-medium text-foreground">
                         {selectedTier.tier_name} - {selectedService.service_name}
                       </span>
                     </div>
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium text-muted-foreground">Monthly Price:</span>
                       <span className="text-lg font-bold text-primary">
                         ${getPriceForSelection(selectedTier.tier_id, selectedService.service_id)}
                       </span>
                     </div>
                                           {mode === 'upgrade' && currentSubscription && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Price Difference:</span>
                          <span className={`text-sm font-medium ${
                            getPriceForSelection(selectedTier.tier_id, selectedService.service_id) > currentSubscription.price 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {getPriceForSelection(selectedTier.tier_id, selectedService.service_id) > currentSubscription.price ? '+' : ''}
                            ${getPriceForSelection(selectedTier.tier_id, selectedService.service_id) - currentSubscription.price}/month
                          </span>
                        </div>
                      )}
                      {mode === 'renewal' && (() => {
                        const renewalInfo = getRenewalInfo();
                        if (!renewalInfo) return null;
                        
                        return (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Renewal Start:</span>
                              <span className="text-sm font-medium text-foreground">
                                {renewalInfo.newStartDate.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">New End Date:</span>
                              <span className="text-sm font-medium text-foreground">
                                {renewalInfo.newEndDate.toLocaleDateString()}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-medium text-muted-foreground">Billing Cycle:</span>
                       <span className="text-sm font-medium text-foreground">Monthly</span>
                     </div>
                   </div>

                  {/* Payment Form */}
                  <div className="space-y-4">
                    {/* Card Number */}
                    <div>
                      <Label htmlFor="cardNumber" className="text-sm font-medium text-foreground mb-1 block">
                        Card Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={paymentData.cardNumber}
                          onChange={(e) => handlePaymentInputChange('cardNumber', formatCardNumber(e.target.value))}
                          maxLength={19}
                          className={`bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                            paymentErrors.cardNumber ? 'border-red-500' : 'border-border'
                          }`}
                        />
                        <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                      {paymentErrors.cardNumber && (
                        <p className="text-red-500 text-xs mt-1">{paymentErrors.cardNumber}</p>
                      )}
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <Label htmlFor="cardholderName" className="text-sm font-medium text-foreground mb-1 block">
                        Cardholder Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cardholderName"
                        type="text"
                        placeholder="John Doe"
                        value={paymentData.cardholderName}
                        onChange={(e) => handlePaymentInputChange('cardholderName', e.target.value)}
                        className={`bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                          paymentErrors.cardholderName ? 'border-red-500' : 'border-border'
                        }`}
                      />
                      {paymentErrors.cardholderName && (
                        <p className="text-red-500 text-xs mt-1">{paymentErrors.cardholderName}</p>
                      )}
                    </div>

                    {/* Expiry Date and CVV */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate" className="text-sm font-medium text-foreground mb-1 block">
                          Expiry Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="expiryDate"
                          type="text"
                          placeholder="MM/YY"
                          value={paymentData.expiryDate}
                          onChange={(e) => handlePaymentInputChange('expiryDate', formatExpiryDate(e.target.value))}
                          maxLength={5}
                          className={`bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                            paymentErrors.expiryDate ? 'border-red-500' : 'border-border'
                          }`}
                        />
                        {paymentErrors.expiryDate && (
                          <p className="text-red-500 text-xs mt-1">{paymentErrors.expiryDate}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="cvv" className="text-sm font-medium text-foreground mb-1 block">
                          CVV <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="cvv"
                            type="text"
                            placeholder="123"
                            value={paymentData.cvv}
                            onChange={(e) => handlePaymentInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                            maxLength={4}
                            className={`bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                              paymentErrors.cvv ? 'border-red-500' : 'border-border'
                            }`}
                          />
                          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                        {paymentErrors.cvv && (
                          <p className="text-red-500 text-xs mt-1">{paymentErrors.cvv}</p>
                        )}
                      </div>
                    </div>

                    {/* Billing Email */}
                    <div>
                      <Label htmlFor="billingEmail" className="text-sm font-medium text-foreground mb-1 block">
                        Billing Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="billingEmail"
                        type="email"
                        placeholder="billing@company.com"
                        value={paymentData.billingEmail}
                        onChange={(e) => handlePaymentInputChange('billingEmail', e.target.value)}
                        className={`bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                          paymentErrors.billingEmail ? 'border-red-500' : 'border-border'
                        }`}
                      />
                      {paymentErrors.billingEmail && (
                        <p className="text-red-500 text-xs mt-1">{paymentErrors.billingEmail}</p>
                      )}
                    </div>

                    {/* Security Notice */}
                    <div className="bg-muted/30 border border-border rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">Secure Payment</p>
                          <p>This is a demo payment form. No real charges will be made. Your payment information is encrypted and secure.</p>
                        </div>
                      </div>
                    </div>

                                         {/* Payment Buttons */}
                     <div className="flex justify-end gap-3 pt-3 border-t border-border">
                       {(mode === 'signup' || mode === 'upgrade' || mode === 'renewal') && (
                         <Button 
                           variant="outline" 
                           onClick={() => setShowPaymentForm(false)}
                           className="px-4 py-2 text-sm transition-all duration-200 hover:bg-muted/50"
                         >
                           {mode === 'upgrade' ? 'Back to Plans' : mode === 'renewal' ? 'Back to Options' : 'Back to Form'}
                         </Button>
                       )}
                      <Button 
                        onClick={handlePaymentSubmit} 
                        disabled={isProcessingPayment}
                        className="px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isProcessingPayment ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            Processing Payment...
                          </div>
                                                 ) : (
                           mode === 'renewal' 
                             ? `Renew $${getPriceForSelection(selectedTier.tier_id, selectedService.service_id)}/month`
                             : mode === 'upgrade'
                             ? `Upgrade to $${getPriceForSelection(selectedTier.tier_id, selectedService.service_id)}/month`
                             : `Pay $${getPriceForSelection(selectedTier.tier_id, selectedService.service_id)}/month`
                         )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Success Modal */}
      {showSuccessModal && onboardingResult && (
        <OnboardingSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          onGoToLogin={handleGoToLogin}
          tenantName={onboardingResult.tenantName}
          adminUsername={onboardingResult.adminUsername}
          adminEmail={onboardingResult.adminEmail}
        />
      )}
    </>
  );
}
