import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { tenantService, TenantOnboardingRequest, TenantOnboardingValidationError } from '../services/tenantService';

interface PricingPlan {
  tier: {
    id: number;
    name: string;
    maxReports: number;
    price: number;
    features: string[];
  };
  service: {
    id: number;
    name: string;
    description: string;
    price: number;
    features: string[];
  };
  totalPrice: number;
}

interface TenantOnboardingFormProps {
  selectedPlan: PricingPlan;
  onComplete: () => void;
  onBack: () => void;
}

interface OnboardingFormData {
  tenantName: string;
  adminName: string;
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
  confirmPassword: string;
  companyWebsite?: string;
  phoneNumber?: string;
  address?: string;
}

interface FieldErrors {
  [key: string]: string;
}

export default function TenantOnboardingForm({ selectedPlan, onComplete, onBack }: TenantOnboardingFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<OnboardingFormData>({
    tenantName: '',
    adminName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    confirmPassword: '',
    companyWebsite: '',
    phoneNumber: '',
    address: ''
  });

  const handleInputChange = (field: keyof OnboardingFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Client-side validation
    if (!formData.tenantName.trim()) {
      errors.tenantName = 'Tenant name is required';
    } else if (formData.tenantName.trim().length < 2) {
      errors.tenantName = 'Tenant name must be at least 2 characters';
    } else if (formData.tenantName.trim().length > 100) {
      errors.tenantName = 'Tenant name must be less than 100 characters';
    }

    if (!formData.adminName.trim()) {
      errors.adminName = 'Admin name is required';
    } else if (formData.adminName.trim().length < 2) {
      errors.adminName = 'Admin name must be at least 2 characters';
    } else if (formData.adminName.trim().length > 100) {
      errors.adminName = 'Admin name must be less than 100 characters';
    }

    if (!formData.adminEmail.trim()) {
      errors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errors.adminEmail = 'Please enter a valid email address';
    }

    if (!formData.adminUsername.trim()) {
      errors.adminUsername = 'Admin username is required';
    } else if (formData.adminUsername.trim().length < 3) {
      errors.adminUsername = 'Admin username must be at least 3 characters';
    } else if (formData.adminUsername.trim().length > 50) {
      errors.adminUsername = 'Admin username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.adminUsername.trim())) {
      errors.adminUsername = 'Admin username can only contain letters, numbers, and underscores';
    }

    if (!formData.adminPassword) {
      errors.adminPassword = 'Admin password is required';
    } else if (formData.adminPassword.length < 6) {
      errors.adminPassword = 'Admin password must be at least 6 characters';
    } else if (formData.adminPassword.length > 128) {
      errors.adminPassword = 'Admin password must be less than 128 characters';
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Website validation
    if (formData.companyWebsite && formData.companyWebsite.trim()) {
      const website = formData.companyWebsite.trim();
      if (!website.startsWith('http://') && !website.startsWith('https://')) {
        if (website.length > 255) {
          errors.companyWebsite = 'Company website URL is too long';
        }
      } else if (website.length > 255) {
        errors.companyWebsite = 'Company website URL is too long';
      }
    }

    // Phone validation
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const cleaned = formData.phoneNumber.replace(/[^\d]/g, '');
      if (cleaned.length < 10) {
        errors.phoneNumber = 'Phone number must have at least 10 digits';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      // Prepare onboarding data
      const onboardingData: TenantOnboardingRequest = {
        tenant_name: formData.tenantName.trim(),
        admin_name: formData.adminName.trim(),
        admin_email: formData.adminEmail.trim(),
        admin_username: formData.adminUsername.trim(),
        admin_password: formData.adminPassword,
        subscription_tier_id: selectedPlan.tier.id,
        subscription_service_id: selectedPlan.service.id,
        company_website: formData.companyWebsite?.trim() || undefined,
        phone_number: formData.phoneNumber?.trim() || undefined,
        address: formData.address?.trim() || undefined
      };

      // First validate with backend
      const validationResponse = await tenantService.validateTenantOnboarding(onboardingData);
      
      if (validationResponse.errors && validationResponse.errors.length > 0) {
        // Map backend validation errors to field errors
        const backendErrors: FieldErrors = {};
        validationResponse.errors.forEach((error: TenantOnboardingValidationError) => {
          // Map backend field names to frontend field names
          const fieldMap: { [key: string]: string } = {
            'tenant_name': 'tenantName',
            'admin_name': 'adminName',
            'admin_email': 'adminEmail',
            'admin_username': 'adminUsername',
            'admin_password': 'adminPassword',
            'subscription_tier_id': 'subscription',
            'subscription_service_id': 'subscription',
            'subscription_combination': 'subscription',
            'company_website': 'companyWebsite',
            'phone_number': 'phoneNumber',
            'address': 'address',
            'general': 'general'
          };
          
          const frontendField = fieldMap[error.field] || error.field;
          
          // Handle subscription-related errors with a toast instead of field error
          if (frontendField === 'subscription') {
            toast({ 
              title: "Subscription Error", 
              description: error.message, 
              variant: "destructive" 
            });
          } else {
            backendErrors[frontendField] = error.message;
          }
        });
        
        setFieldErrors(backendErrors);
        
        // Show general error toast if there are general errors
        const generalError = backendErrors.general;
        if (generalError) {
          toast({ 
            title: "Validation Error", 
            description: generalError, 
            variant: "destructive" 
          });
        }
        
        return;
      }

      // If validation passes, proceed with onboarding
      const response = await tenantService.onboardTenant(onboardingData);

      // Show success message
      toast({ 
        title: "Onboarding Successful!", 
        description: `Tenant '${response.tenant_name}' created successfully. You can now login with username: ${response.admin_username}`, 
        variant: "default"
      });

      // Add a small delay to show the success message before redirecting
      setTimeout(() => {
        // Call onComplete to close the form and redirect to login
        onComplete();
      }, 1500);
      
    } catch (error: any) {
      console.error('Onboarding error:', error);
      
      // Handle specific error types
      if (error.message && error.message.includes('Validation failed:')) {
        toast({ 
          title: "Validation Error", 
          description: error.message, 
          variant: "destructive" 
        });
      } else if (error.response?.data?.detail) {
        toast({ 
          title: "Error", 
          description: error.response.data.detail, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to complete onboarding. Please try again.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string): string => {
    return fieldErrors[field] || '';
  };

  const hasFieldError = (field: string): boolean => {
    return !!fieldErrors[field];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-background rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-500">
        <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Complete Your Onboarding
              </h2>
              <p className="text-muted-foreground mt-1">Set up your tenant and admin account</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 rounded-full w-8 h-8 p-0"
            >
              ← Back
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Selected Plan Summary */}
          <Card className="mb-6 bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Selected Plan</CardTitle>
              <CardDescription>Review your subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Service:</span>
                  <span className="ml-2 font-medium">{selectedPlan.service.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tier:</span>
                  <span className="ml-2 font-medium">{selectedPlan.tier.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly Price:</span>
                  <span className="ml-2 font-medium">${selectedPlan.service.price}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Verification Limit:</span>
                  <span className="ml-2 font-medium">{selectedPlan.tier.maxReports} per month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tenant Information */}
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Tenant Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tenantName" className="text-foreground font-medium">Tenant/Company Name *</Label>
                  <Input
                    id="tenantName"
                    type="text"
                    placeholder="Enter your company name"
                    value={formData.tenantName}
                    onChange={(e) => handleInputChange('tenantName', e.target.value)}
                    required
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('tenantName') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('tenantName') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('tenantName')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="companyWebsite" className="text-foreground font-medium">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={formData.companyWebsite}
                    onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('companyWebsite') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('companyWebsite') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('companyWebsite')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-foreground font-medium">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('phoneNumber') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('phoneNumber') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('phoneNumber')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="address" className="text-foreground font-medium">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Enter your company address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('address') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('address') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('address')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Account Information */}
            <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Admin Account</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminName" className="text-foreground font-medium">Full Name *</Label>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.adminName}
                    onChange={(e) => handleInputChange('adminName', e.target.value)}
                    required
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('adminName') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('adminName') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('adminName')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="adminEmail" className="text-foreground font-medium">Email Address *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@yourcompany.com"
                    value={formData.adminEmail}
                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                    required
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('adminEmail') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('adminEmail') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('adminEmail')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="adminUsername" className="text-foreground font-medium">Username *</Label>
                  <Input
                    id="adminUsername"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.adminUsername}
                    onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                    required
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('adminUsername') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('adminUsername') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('adminUsername')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="adminPassword" className="text-foreground font-medium">Password *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.adminPassword}
                    onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                    required
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('adminPassword') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('adminPassword') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('adminPassword')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    className={`bg-background border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60 ${
                      hasFieldError('confirmPassword') 
                        ? 'border-destructive focus:border-destructive' 
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {hasFieldError('confirmPassword') && (
                    <p className="text-sm text-destructive mt-1">{getFieldError('confirmPassword')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t animate-in slide-in-from-bottom-4 duration-500 delay-300">
              <Button 
                variant="outline" 
                onClick={onBack} 
                disabled={isLoading}
                className="transition-all duration-200 hover:bg-muted/50"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? "Creating Account..." : "Onboard"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
