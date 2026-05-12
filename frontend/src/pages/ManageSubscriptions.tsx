import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Save, X, Users, CreditCard, Calendar, Check, Star, Zap, Shield, Globe, Activity, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  manageSubscriptionService, 
  SubscriptionTier, 
  SubscriptionService, 
  SubscriptionPricing,
  PricingPlanWithNames,
  SubscriptionTierCreate,
  SubscriptionTierUpdate,
  SubscriptionServiceCreate,
  SubscriptionServiceUpdate,
  SubscriptionPricingCreate,
  SubscriptionPricingUpdate,
  MainFeature,
  SubFeature,
  TierUsageStatistics,
  ServiceUsageStatistics
} from '@/services/manageSubscriptionService';
import { FeatureSelector } from '@/components/FeatureSelector';
import { FeatureTags } from '@/components/FeatureTag';

// Local interface for compatibility with existing UI
interface PricingPlan {
  id: number;
  tierId: number;
  serviceId: number;
  price: number;
  isActive: boolean;
  tierName: string;
  serviceName: string;
}

// No initial data - will be loaded from API

export default function ManageSubscriptions() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [services, setServices] = useState<SubscriptionService[]>([]);
  const [pricing, setPricing] = useState<PricingPlanWithNames[]>([]);
  const [mainFeatures, setMainFeatures] = useState<MainFeature[]>([]);
  const [tierUsageStats, setTierUsageStats] = useState<TierUsageStatistics[]>([]);
  const [serviceUsageStats, setServiceUsageStats] = useState<ServiceUsageStatistics[]>([]);
  const [activeTab, setActiveTab] = useState('tiers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [tiersData, servicesData, pricingData, featuresData, tierUsageData, serviceUsageData] = await Promise.all([
          manageSubscriptionService.getSubscriptionTiers(),
          manageSubscriptionService.getSubscriptionServices(),
          manageSubscriptionService.getPricingWithNames(),
          manageSubscriptionService.getAllFeatures(),
          manageSubscriptionService.getTierUsageStatistics(30),
          manageSubscriptionService.getServiceUsageStatistics(30)
        ]);
        
        setTiers(tiersData);
        setServices(servicesData);
        setPricing(pricingData);
        setMainFeatures(featuresData);
        setTierUsageStats(tierUsageData.tier_statistics);
        setServiceUsageStats(serviceUsageData.service_statistics);
      } catch (err) {
        setError('Failed to load subscription data');
        console.error('Error loading subscription data:', err);
        toast({
          title: "Error",
          description: "Failed to load subscription data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Dialog states
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  
  // Form states
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [editingService, setEditingService] = useState<SubscriptionService | null>(null);
  const [editingPricing, setEditingPricing] = useState<PricingPlanWithNames | null>(null);
  
  const [tierForm, setTierForm] = useState({ name: '', maxReports: '', isActive: true });
  const [serviceForm, setServiceForm] = useState({ 
    name: '', 
    description: '', 
    isActive: true,
    selectedSubFeatures: [] as string[]
  });
  const [pricingForm, setPricingForm] = useState({ tierId: '', serviceId: '', price: '', isActive: true });

  // Tier management
  const handleTierSubmit = async () => {
    if (!tierForm.name || !tierForm.maxReports) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTier) {
        const updatedTier = await manageSubscriptionService.updateSubscriptionTier(
          editingTier.tier_id,
          {
            tier_name: tierForm.name,
            max_reports: parseInt(tierForm.maxReports),
            is_active: tierForm.isActive
          }
        );
        setTiers(tiers.map(tier => 
          tier.tier_id === editingTier.tier_id ? updatedTier : tier
        ));
        toast({
          title: "Success",
          description: "Tier updated successfully",
        });
      } else {
                 const newTier = await manageSubscriptionService.createSubscriptionTier({
           tier_name: tierForm.name,
           max_reports: parseInt(tierForm.maxReports),
           is_active: tierForm.isActive
         });
        setTiers([...tiers, newTier]);
        toast({
          title: "Success",
          description: "Tier created successfully",
        });
      }
      
      setTierDialogOpen(false);
      setEditingTier(null);
      setTierForm({ name: '', maxReports: '', isActive: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save tier",
        variant: "destructive",
      });
    }
  };

     const handleTierDialogClose = (open: boolean) => {
     if (!open) {
       setTierDialogOpen(false);
       setEditingTier(null);
       setTierForm({ name: '', maxReports: '', isActive: true });
     }
   };

     const handleTierEdit = (tier: SubscriptionTier) => {
     setEditingTier(tier);
     setTierForm({ name: tier.tier_name, maxReports: tier.max_reports.toString(), isActive: tier.is_active });
     setTierDialogOpen(true);
   };

  const handleTierDelete = async (tierId: number) => {
    try {
      await manageSubscriptionService.deleteSubscriptionTier(tierId);
      setTiers(tiers.filter(tier => tier.tier_id !== tierId));
      setPricing(pricing.filter(plan => plan.tier_id !== tierId));
      toast({
        title: "Success",
        description: "Tier deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete tier",
        variant: "destructive",
      });
    }
  };

  // Service management
  const handleServiceSubmit = async () => {
    if (!serviceForm.name || serviceForm.selectedSubFeatures.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in service name and select at least one feature",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingService) {
                         const updatedService = await manageSubscriptionService.updateSubscriptionService(
          editingService.service_id,
          {
            service_name: serviceForm.name,
            service_description: serviceForm.description,
            is_active: serviceForm.isActive,
            sub_feature_keys: serviceForm.selectedSubFeatures
          }
        );
        setServices(services.map(service => 
          service.service_id === editingService.service_id ? updatedService : service
        ));
        toast({
          title: "Success",
          description: "Service updated successfully",
        });
      } else {
                         const newService = await manageSubscriptionService.createSubscriptionService({
          service_name: serviceForm.name,
          service_description: serviceForm.description,
          is_active: serviceForm.isActive,
          sub_feature_keys: serviceForm.selectedSubFeatures
        });
        setServices([...services, newService]);
        toast({
          title: "Success",
          description: "Service created successfully",
        });
      }
      
      setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '', isActive: true, selectedSubFeatures: [] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save service",
        variant: "destructive",
      });
    }
  };

     const handleServiceDialogClose = (open: boolean) => {
     if (!open) {
             setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '', isActive: true, selectedSubFeatures: [] });
     }
   };

       const handleServiceEdit = (service: SubscriptionService) => {
    setEditingService(service);
    setServiceForm({ 
      name: service.service_name, 
      description: service.service_description, 
      isActive: service.is_active,
      selectedSubFeatures: service.sub_features?.map(sub => sub.sub_feature_key) || []
    });
    setServiceDialogOpen(true);
  };

  const handleServiceDelete = async (serviceId: number) => {
    try {
      await manageSubscriptionService.deleteSubscriptionService(serviceId);
      setServices(services.filter(service => service.service_id !== serviceId));
      setPricing(pricing.filter(plan => plan.service_id !== serviceId));
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  // Pricing management
  const handlePricingSubmit = async () => {
    if (!pricingForm.tierId || !pricingForm.serviceId || !pricingForm.price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const tierId = parseInt(pricingForm.tierId);
    const serviceId = parseInt(pricingForm.serviceId);
    const price = parseFloat(pricingForm.price);

    try {
      if (editingPricing) {
        const updatedPricing = await manageSubscriptionService.updateSubscriptionPricing(
          editingPricing.pricing_id,
          {
            tier_id: tierId,
            service_id: serviceId,
            price_usd: price,
            is_active: pricingForm.isActive
          }
        );
        
        // Update the pricing list with the new data
        const updatedPricingWithNames = {
          ...updatedPricing,
          tier_name: tiers.find(t => t.tier_id === tierId)?.tier_name || '',
          service_name: services.find(s => s.service_id === serviceId)?.service_name || ''
        };
        
        setPricing(pricing.map(plan => 
          plan.pricing_id === editingPricing.pricing_id ? updatedPricingWithNames : plan
        ));
        toast({
          title: "Success",
          description: "Pricing updated successfully",
        });
      } else {
        const newPricing = await manageSubscriptionService.createSubscriptionPricing({
          tier_id: tierId,
          service_id: serviceId,
          price_usd: price,
          is_active: pricingForm.isActive
        });
        
        // Add the new pricing with names
        const newPricingWithNames = {
          ...newPricing,
          tier_name: tiers.find(t => t.tier_id === tierId)?.tier_name || '',
          service_name: services.find(s => s.service_id === serviceId)?.service_name || ''
        };
        
        setPricing([...pricing, newPricingWithNames]);
        toast({
          title: "Success",
          description: "Pricing created successfully",
        });
      }
      
      setPricingDialogOpen(false);
      setEditingPricing(null);
      setPricingForm({ tierId: '', serviceId: '', price: '', isActive: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save pricing",
        variant: "destructive",
      });
    }
  };

  const handlePricingDialogClose = (open: boolean) => {
    if (!open) {
      setPricingDialogOpen(false);
      setEditingPricing(null);
      setPricingForm({ tierId: '', serviceId: '', price: '', isActive: true });
    }
  };

  const handlePricingEdit = (plan: PricingPlanWithNames) => {
    setEditingPricing(plan);
    setPricingForm({ 
      tierId: plan.tier_id.toString(), 
      serviceId: plan.service_id.toString(), 
      price: plan.price_usd.toString(),
      isActive: plan.is_active
    });
    setPricingDialogOpen(true);
  };

  const handlePricingDelete = async (planId: number) => {
    try {
      await manageSubscriptionService.deleteSubscriptionPricing(planId);
      setPricing(pricing.filter(plan => plan.pricing_id !== planId));
      toast({
        title: "Success",
        description: "Pricing deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete pricing",
        variant: "destructive",
      });
    }
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

  // Helper functions to get usage statistics
  const getTierUsageStats = (tierId: number) => {
    return tierUsageStats.find(stat => stat.tier_id === tierId) || {
      total_reports: 0,
      active_tenants: 0,
      this_month_reports: 0
    };
  };

  const getServiceUsageStats = (serviceId: number) => {
    return serviceUsageStats.find(stat => stat.service_id === serviceId) || {
      total_reports: 0,
      active_tenants: 0,
      this_month_reports: 0
    };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-white">Manage Subscriptions</h1>
            <p className="text-white">Configure subscription tiers, services, and pricing</p>
          </div>
        </div>

        {/* Sub Header with Tabs */}
        <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full bg-background border-2 border-border shadow-lg rounded-lg p-1">
              <TabsTrigger 
                value="tiers" 
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-14"
              >
                                 <Users className="w-4 h-4 mr-2" />
                 Tiers
              </TabsTrigger>
              <TabsTrigger 
                value="services"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-14"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger 
                value="pricing"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-14"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Pricing Plans
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 mt-8 mr-6">
        <div className="max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* Subscription Tiers Tab */}
            <TabsContent value="tiers" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold">Subscription Tiers</h2>
                  <p className="text-muted-foreground mt-1">Manage your subscription tier configurations</p>
                </div>
                <Button 
                  onClick={() => {
                    setEditingTier(null);
                    setTierForm({ name: '', maxReports: '', isActive: true });
                    setTierDialogOpen(true);
                  }} 
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  Add Tier
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  // Loading skeleton for tiers
                  <>
                    {[1, 2, 3].map((index) => (
                      <Card key={`loading-tier-${index}`} className="border-2 border-border animate-pulse min-h-[280px]">
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-muted animate-pulse"></div>
                            <div className="flex-1">
                              <div className="h-6 bg-muted rounded animate-pulse mb-2"></div>
                              <div className="h-4 bg-muted rounded animate-pulse"></div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3 mb-4">
                            <div className="h-16 bg-muted rounded animate-pulse"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : error ? (
                  <div className="col-span-3 flex items-center justify-center p-8">
                    <div className="text-center">
                      <p className="text-red-500 mb-4">{error}</p>
                      <Button onClick={() => window.location.reload()}>Retry</Button>
                    </div>
                  </div>
                ) : (
                  tiers.map((tier, index) => {
                    const tierDetails = getTierDetails(tier.tier_name);
                    const IconComponent = tierDetails.icon;
                    const tierStats = getTierUsageStats(tier.tier_id);
                    
                    return (
                      <Card 
                        key={tier.tier_id} 
                        className={`group relative overflow-hidden border-2 ${tierDetails.borderColor} ${tierDetails.bgColor} shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-200 transform hover:scale-102 hover:-translate-y-1 animate-in slide-in-from-bottom-2 duration-200 delay-${index * 50}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Gradient Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${tierDetails.color} opacity-5 group-hover:opacity-10 transition-opacity duration-200`} />
                        
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 z-10">
                          <Badge 
                            variant={tier.is_active ? "default" : "secondary"}
                            className={`${tier.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'} text-white shadow-md transition-all duration-200 transform group-hover:scale-105`}
                          >
                            {tier.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        <CardHeader className="relative z-10 pb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tierDetails.iconBg} flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-105`}>
                              <IconComponent className={`w-6 h-6 ${tierDetails.iconColor}`} />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                                {tier.tier_name}
                              </CardTitle>
                              <CardDescription className="text-muted-foreground">
                                Tier Level
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="relative z-10 space-y-4">
                          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Monthly Limit</span>
                              <span className="text-lg font-bold text-foreground">{tier.max_reports.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">verifications per month</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <Badge 
                              variant="secondary" 
                              className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 px-3 py-2 text-xs font-medium justify-center"
                            >
                              <Users className="w-3 h-3 mr-1" />
                              {tierStats.active_tenants} Active
                            </Badge>
                                                         <Badge 
                               variant="secondary" 
                               className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 px-3 py-2 text-xs font-medium justify-center"
                             >
                               <Calendar className="w-3 h-3 mr-1" />
                               {tierStats.this_month_reports} This Month
                             </Badge>
                          </div>

                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTierEdit(tier)}
                              className="flex-1 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-primary transition-all duration-200"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {![1, 2, 3].includes(tier.tier_id) && !['Bronze', 'Silver', 'Gold'].includes(tier.tier_name) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTierDelete(tier.tier_id)}
                                className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold">Services</h2>
                  <p className="text-muted-foreground mt-1">Manage your verification service offerings</p>
                </div>
                                  <Button 
                   onClick={() => {
                     setEditingService(null);
                     setServiceForm({ name: '', description: '', isActive: true, selectedSubFeatures: [] });
                     setServiceDialogOpen(true);
                   }}  
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                   // Loading skeleton for services
                   <>
                     {[1, 2, 3].map((index) => (
                       <Card key={`loading-service-${index}`} className="border-2 border-border animate-pulse min-h-[280px]">
                         <CardHeader className="pb-3">
                           <div className="flex items-center space-x-3">
                             <div className="w-12 h-12 rounded-xl bg-muted animate-pulse"></div>
                             <div className="flex-1">
                               <div className="h-6 bg-muted rounded animate-pulse mb-2"></div>
                               <div className="h-4 bg-muted rounded animate-pulse"></div>
                             </div>
                           </div>
                         </CardHeader>
                         <CardContent className="pt-0">
                           <div className="space-y-3 mb-4">
                             <div className="h-16 bg-muted rounded animate-pulse"></div>
                           </div>
                         </CardContent>
                       </Card>
                     ))}
                   </>
                 ) : error ? (
                   <div className="col-span-3 flex items-center justify-center p-8">
                     <div className="text-center">
                       <p className="text-red-500 mb-4">{error}</p>
                       <Button onClick={() => window.location.reload()}>Retry</Button>
                     </div>
                   </div>
                 ) : (
                   services.map((service, index) => {
                     const serviceDetails = getServiceDetails(service.service_name);
                     const IconComponent = serviceDetails.icon;
                     const serviceStats = getServiceUsageStats(service.service_id);
                     
                     return (
                       <Card 
                         key={service.service_id} 
                         className={`group relative overflow-hidden border-2 ${serviceDetails.borderColor} ${serviceDetails.bgColor} shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-200 transform hover:scale-102 hover:-translate-y-1 animate-in slide-in-from-bottom-2 duration-200 delay-${index * 50}`}
                         style={{ animationDelay: `${index * 50}ms` }}
                       >
                         {/* Gradient Background */}
                         <div className={`absolute inset-0 bg-gradient-to-br ${serviceDetails.color} opacity-5 group-hover:opacity-10 transition-opacity duration-200`} />
                        
                         {/* Status Badge */}
                         <div className="absolute top-4 right-4 z-10">
                           <Badge 
                             variant={service.is_active ? "default" : "secondary"}
                             className={`${service.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'} text-white shadow-md transition-all duration-200 transform group-hover:scale-105`}
                           >
                             {service.is_active ? "Active" : "Inactive"}
                           </Badge>
                         </div>

                         <CardHeader className="relative z-10 pb-4 pr-20">
                           <div className="flex items-center gap-3 mb-3">
                             <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${serviceDetails.iconBg} flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-105`}>
                               <IconComponent className={`w-6 h-6 ${serviceDetails.iconColor}`} />
                             </div>
                             <div className="flex-1 min-w-0">
                               <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight break-words">
                                 {service.service_name}
                               </CardTitle>
                               <CardDescription className="text-muted-foreground text-sm">
                                 Service Type
                               </CardDescription>
                             </div>
                           </div>
                         </CardHeader>

                                                   <CardContent className="relative z-10 space-y-4">
                            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                              {service.sub_features && service.sub_features.length > 0 ? (
                                <FeatureTags subFeatures={service.sub_features} />
                              ) : (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {service.service_description}
                                </p>
                              )}
                            </div>

                           <div className="grid grid-cols-2 gap-2 mt-3">
                             <Badge 
                               variant="secondary" 
                               className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 px-3 py-2 text-xs font-medium justify-center"
                             >
                               <Users className="w-3 h-3 mr-1" />
                               {serviceStats.active_tenants} Active
                             </Badge>
                             <Badge 
                               variant="secondary" 
                               className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 px-3 py-2 text-xs font-medium justify-center"
                             >
                               <Calendar className="w-3 h-3 mr-1" />
                               {serviceStats.this_month_reports} This Month
                             </Badge>
                           </div>

                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleServiceEdit(service)}
                               className="flex-1 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-primary transition-all duration-200"
                             >
                               <Edit className="w-4 h-4 mr-1" />
                               Edit
                             </Button>
                             {![1, 2, 3].includes(service.service_id) && !['Document Verification', 'SMS & Email Verification', 'Complete Bundle'].includes(service.service_name) && (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleServiceDelete(service.service_id)}
                                 className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             )}
                           </div>
                         </CardContent>
                       </Card>
                     );
                   })
                 )}
               </div>
            </TabsContent>

            {/* Pricing Plans Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold">Pricing Plans</h2>
                  <p className="text-muted-foreground mt-1">Configure pricing for each tier and service combination</p>
                </div>
                                 <Button 
                   onClick={() => {
                     setEditingPricing(null);
                     setPricingForm({ tierId: '', serviceId: '', price: '', isActive: true });
                     setPricingDialogOpen(true);
                   }} 
                   className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-102"
                 >
                   <Plus className="w-4 h-4" />
                   Add Pricing
                 </Button>
              </div>

                                            <Card>
                 <CardHeader>
                   <CardTitle>Pricing Matrix</CardTitle>
                   <CardDescription>Configure pricing for each tier and service combination</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Tier</TableHead>
                         <TableHead>Service</TableHead>
                         <TableHead>Price ($)</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                                           <TableBody>
                        {loading ? (
                          // Loading skeleton for pricing table
                          <>
                            {[1, 2, 3, 4, 5].map((index) => (
                              <TableRow key={`loading-pricing-${index}`}>
                                <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                                <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                                <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                                <TableCell><div className="h-6 bg-muted rounded animate-pulse w-16"></div></TableCell>
                                <TableCell><div className="h-8 bg-muted rounded animate-pulse w-20"></div></TableCell>
                              </TableRow>
                            ))}
                          </>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <p className="text-red-500 mb-4">{error}</p>
                              <Button onClick={() => window.location.reload()}>Retry</Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          pricing.map((plan) => (
                            <TableRow key={plan.pricing_id}>
                              <TableCell className="font-medium">{plan.tier_name}</TableCell>
                              <TableCell>{plan.service_name}</TableCell>
                              <TableCell>${plan.price_usd}</TableCell>
                              <TableCell>
                                <Badge variant={plan.is_active ? "default" : "secondary"}>
                                  {plan.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePricingEdit(plan)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePricingDelete(plan.pricing_id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                   </Table>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>

          {/* Tier Dialog */}
          <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingTier ? 'Edit Tier' : 'Add New Tier'}</DialogTitle>
                <DialogDescription>
                  {editingTier ? 'Update the subscription tier details' : 'Create a new subscription tier'}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[65vh] overflow-y-auto px-3 space-y-4">
                <div>
                  <Label htmlFor="tierName">Tier Name</Label>
                  <Input
                    id="tierName"
                    value={tierForm.name}
                    onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                    placeholder="e.g., Bronze, Silver, Gold"
                  />
                </div>
                <div>
                  <Label htmlFor="maxReports">Maximum Reports</Label>
                  <Input
                    id="maxReports"
                    type="number"
                    value={tierForm.maxReports}
                    onChange={(e) => setTierForm({ ...tierForm, maxReports: e.target.value })}
                    placeholder="e.g., 100, 300, 500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tierActive">Active Status</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this tier
                    </div>
                  </div>
                  <Switch
                    id="tierActive"
                    checked={tierForm.isActive}
                    onCheckedChange={(checked) => setTierForm({ ...tierForm, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTierSubmit}>
                  {editingTier ? 'Update' : 'Create'} Tier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Service Dialog */}
          <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                <DialogDescription>
                  {editingService ? 'Update the service details' : 'Create a new service'}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[65vh] overflow-y-auto px-3 space-y-4">
                <div>
                  <Label htmlFor="serviceName">Service Name</Label>
                  <Input
                    id="serviceName"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g., Document Verification"
                  />
                </div>
                <FeatureSelector
                  mainFeatures={mainFeatures}
                  selectedSubFeatures={serviceForm.selectedSubFeatures}
                  onSelectionChange={(selectedSubFeatures) => 
                    setServiceForm({ ...serviceForm, selectedSubFeatures })
                  }
                />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="serviceActive">Active Status</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this service
                    </div>
                  </div>
                  <Switch
                    id="serviceActive"
                    checked={serviceForm.isActive}
                    onCheckedChange={(checked) => setServiceForm({ ...serviceForm, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleServiceSubmit}>
                  {editingService ? 'Update' : 'Create'} Service
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pricing Dialog */}
          <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingPricing ? 'Edit Pricing' : 'Add New Pricing'}</DialogTitle>
                <DialogDescription>
                  {editingPricing ? 'Update the pricing details' : 'Create a new pricing plan'}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[65vh] overflow-y-auto px-3 space-y-4">
                <div>
                  <Label htmlFor="pricingTier">Tier</Label>
                                     <select
                     id="pricingTier"
                     value={pricingForm.tierId}
                     onChange={(e) => setPricingForm({ ...pricingForm, tierId: e.target.value })}
                     className="w-full p-2 border rounded-md"
                   >
                     <option value="">Select a tier</option>
                     {tiers.map((tier) => (
                       <option key={tier.tier_id} value={tier.tier_id}>
                         {tier.tier_name} ({tier.max_reports} reports)
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <Label htmlFor="pricingService">Service</Label>
                   <select
                     id="pricingService"
                     value={pricingForm.serviceId}
                     onChange={(e) => setPricingForm({ ...pricingForm, serviceId: e.target.value })}
                     className="w-full p-2 border rounded-md"
                   >
                     <option value="">Select a service</option>
                     {services.map((service) => (
                       <option key={service.service_id} value={service.service_id}>
                         {service.service_name}
                       </option>
                     ))}
                   </select>
                </div>
                <div>
                  <Label htmlFor="pricingPrice">Price ($)</Label>
                  <Input
                    id="pricingPrice"
                    type="number"
                    step="0.01"
                    value={pricingForm.price}
                    onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })}
                    placeholder="e.g., 75.00"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pricingActive">Active Status</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this pricing plan
                    </div>
                  </div>
                  <Switch
                    id="pricingActive"
                    checked={pricingForm.isActive}
                    onCheckedChange={(checked) => setPricingForm({ ...pricingForm, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePricingSubmit}>
                  {editingPricing ? 'Update' : 'Create'} Pricing
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
