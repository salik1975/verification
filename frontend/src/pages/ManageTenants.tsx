import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  CreditCard, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Building2,
  Shield,
  Star,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { tenantService, Tenant as TenantAPI, TenantUser as TenantUserAPI, TenantSummary } from '@/services/tenantService';
import { useAppearance } from '@/components/contexts/AppearanceContext';

// Legacy types for UI compatibility (mapped from API types)
interface TenantUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  lastLogin: string;
  isActive: boolean;
}

interface Tenant {
  id: number;
  name: string;
  subscriptionTier: string;
  subscriptionService: string;
  onboardingDate: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  reportsUsed: number;
  maxReports: number;
  isActive: boolean;
  adminUsers: number;
  operatorUsers: number;
  totalUsers: number;
  users: TenantUser[];
  monthlyPrice: number;
  daysLeft: number;
  status: 'active' | 'expired' | 'expiring_soon';
}

// Note: Tenant data is now loaded from API via tenantService

export default function ManageTenants() {
  const { appearance } = useAppearance();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [addTenantDialogOpen, setAddTenantDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'expiring_soon'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tenant data from API
  useEffect(() => {
    const loadTenants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { tenants: apiTenants, summary: apiSummary } = await tenantService.getTenants(0, 100, true, false);
        
        // Transform API data to legacy format for UI compatibility
        const transformedTenants = apiTenants.map(tenant => tenantService.transformToLegacyFormat(tenant));
        
        setTenants(transformedTenants);
        setSummary(apiSummary);
      } catch (err) {
        setError('Failed to load tenant data');
        console.error('Error loading tenant data:', err);
        toast({
          title: "Error",
          description: "Failed to load tenant data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, []);

  // Filter tenants based on search and status
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Determine status based on days left
    let tenantStatus: 'active' | 'expired' | 'expiring_soon';
    if (tenant.daysLeft < 0) {
      tenantStatus = 'expired';
    } else if (tenant.daysLeft <= 5) {
      tenantStatus = 'expiring_soon';
    } else {
      tenantStatus = 'active';
    }
    
    const matchesStatus = statusFilter === 'all' || tenantStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
    } else if (daysLeft <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Expiring Soon</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    }
  };

  const getUsagePercentage = (used: number, max: number) => {
    return Math.min((used / max) * 100, 100);
  };

  // Helper function to get tier icon and color (matching subscription selector)
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

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleTenantEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTenantDialogOpen(true);
  };

  const handleTenantDelete = (tenantId: number) => {
    setTenants(tenants.filter(tenant => tenant.id !== tenantId));
    toast({
      title: "Success",
      description: "Tenant deleted successfully",
    });
  };

  const handleViewUsers = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUserDialogOpen(true);
  };

  const handleTenantDialogClose = (open: boolean) => {
    if (!open) {
      setTenantDialogOpen(false);
      setSelectedTenant(null);
    }
  };

  const handleUserDialogClose = (open: boolean) => {
    if (!open) {
      setUserDialogOpen(false);
      setSelectedTenant(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-white">Manage Tenants</h1>
            <p className="text-white">Monitor and manage all tenant subscriptions and usage</p>
          </div>
        </div>

                 {/* Sub Header */}
         <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                 <Building2 className="w-6 h-6 text-primary" />
               </div>
               <div>
                 <h2 className="text-xl font-semibold">Tenant Management</h2>
                 <p className="text-sm text-muted-foreground">Overview and control of all tenant accounts</p>
               </div>
             </div>
             <Button className="flex items-center gap-2" onClick={() => setAddTenantDialogOpen(true)}>
               <Plus className="w-4 h-4" />
               Add Tenant
             </Button>
           </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="p-6 mt-8 mr-6">
        <div className="max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">
          
                 {/* Filters */}
       <div className="flex gap-4 items-center mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="p-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="expiring_soon">Expiring Soon</option>
        </select>
      </div>

             {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse bg-muted rounded h-8 w-16"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.total_tenants || tenants.length}</div>
                <p className="text-xs text-muted-foreground">
                  {summary?.active_tenants || tenants.filter(t => t.daysLeft > 5).length} active
                </p>
              </>
            )}
                     </CardContent>
         </Card>
         <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse bg-muted rounded h-8 w-16"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.total_users || tenants.reduce((sum, tenant) => sum + tenant.totalUsers, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all tenants
                </p>
              </>
            )}
                     </CardContent>
         </Card>
         <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse bg-muted rounded h-8 w-20"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${(summary?.monthly_revenue || tenants.filter(t => t.daysLeft > 5).reduce((sum, tenant) => sum + tenant.monthlyPrice, 0)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  From active subscriptions
                </p>
              </>
            )}
          </CardContent>
                 </Card>
         <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Reports Used</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse bg-muted rounded h-8 w-16"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(summary?.total_reports_used || tenants.reduce((sum, tenant) => sum + tenant.reportsUsed, 0)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </>
            )}
                     </CardContent>
         </Card>
       </div>

                             {/* Tenants Table */}
                                                                               <Card className="shadow-xl hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-white dark:bg-gray-900" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
             <CardContent className="p-0">
              <div className="overflow-hidden">
              <Table className="border-collapse w-full">
                                                                                                       <TableHeader>
                 <TableRow className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Tenant</TableHead>
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Subscription</TableHead>
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Usage</TableHead>
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Users</TableHead>
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Status</TableHead>
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Days Left</TableHead>
                   <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Actions</TableHead>
                 </TableRow>
               </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton for table
                                 <>
                   {[1, 2, 3, 4, 5].map((index) => (
                     <TableRow key={`loading-${index}`}>
                       <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                       <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                       <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                       <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                       <TableCell><div className="h-6 bg-muted rounded animate-pulse w-20"></div></TableCell>
                       <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                       <TableCell><div className="h-8 bg-muted rounded animate-pulse w-24"></div></TableCell>
                     </TableRow>
                   ))}
                 </>
                             ) : error ? (
                 <TableRow>
                   <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-center">
                      <p className="text-red-500 mb-4">{error}</p>
                      <Button onClick={() => window.location.reload()}>Retry</Button>
                    </div>
                  </TableCell>
                </TableRow>
                             ) : filteredTenants.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No tenants found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => {
                  const usagePercentage = getUsagePercentage(tenant.reportsUsed, tenant.maxReports);
                  return (
                                                                                                                                                                       <TableRow key={tenant.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 ease-in-out">
                      <TableCell>
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Onboarded {new Date(tenant.onboardingDate).toLocaleDateString()}
                        </div>
                      </div>
                                                                                   </TableCell>
                                           <TableCell>
                         <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getTierDetails(tenant.subscriptionTier).iconBg} flex items-center justify-center shadow-sm`}>
                           {React.createElement(getTierDetails(tenant.subscriptionTier).icon, {
                             className: `w-4 h-4 ${getTierDetails(tenant.subscriptionTier).iconColor}`
                           })}
                         </div>
                         <div>
                           <div className="font-medium">{tenant.subscriptionTier}</div>
                           <div className="text-sm text-muted-foreground">
                             {tenant.subscriptionService}
                           </div>
                           <div className="text-xs text-muted-foreground font-medium">
                             ${tenant.monthlyPrice}/month
                           </div>
                                                   </div>
                        </div>
                      </TableCell>
                                           <TableCell>
                        <div className="w-32">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{tenant.reportsUsed}</span>
                          <span className="text-muted-foreground">/ {tenant.maxReports}</span>
                        </div>
                                                 <div className="w-full bg-gray-100 rounded-full h-2">
                           <div 
                             className="bg-accent h-2 rounded-full transition-all duration-300"
                             style={{ width: `${usagePercentage}%` }}
                           />
                         </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {usagePercentage.toFixed(1)}% used
                                                 </div>
                       </div>
                     </TableCell>
                                           <TableCell>
                        <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className="font-medium">{tenant.totalUsers}</div>
                          <div className="text-xs text-muted-foreground">
                            {tenant.adminUsers} admin, {tenant.operatorUsers} operator
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUsers(tenant)}
                        >
                          <Eye className="w-4 h-4" />
                                                 </Button>
                       </div>
                     </TableCell>
                                                                <TableCell>
                        {getStatusBadge(tenant.daysLeft)}
                      </TableCell>
                                         <TableCell>
                       <div className={`font-medium ${tenant.daysLeft < 0 ? 'text-red-600' : tenant.daysLeft <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                         {tenant.daysLeft < 0 ? `${Math.abs(tenant.daysLeft)} days overdue` : `${tenant.daysLeft} days`}
                       </div>
                     </TableCell>
                                         <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTenantEdit(tenant)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTenantDelete(tenant.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
              </div>
        </CardContent>
      </Card>

                   {/* Tenant Details Dialog */}
        <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tenant: {selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              Update tenant subscription and configuration details
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tenant Name</Label>
                  <Input value={selectedTenant.name} readOnly />
                </div>
                <div>
                  <Label>Subscription Tier</Label>
                  <Input value={selectedTenant.subscriptionTier} readOnly />
                </div>
                <div>
                  <Label>Subscription Service</Label>
                  <Input value={selectedTenant.subscriptionService} readOnly />
                </div>
                <div>
                  <Label>Monthly Price</Label>
                  <Input value={`$${selectedTenant.monthlyPrice}`} readOnly />
                </div>
                <div>
                  <Label>Reports Used</Label>
                  <Input value={`${selectedTenant.reportsUsed} / ${selectedTenant.maxReports}`} readOnly />
                </div>
                <div>
                  <Label>Days Left</Label>
                  <Input value={`${selectedTenant.daysLeft} days`} readOnly />
                </div>
              </div>
            </div>
          )}
                     <DialogFooter>
             <Button variant="outline" onClick={() => setTenantDialogOpen(false)}>
               Close
             </Button>
             <Button>Save Changes</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

             {/* Users Dialog */}
       <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Users - {selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              Manage users for this tenant
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedTenant.totalUsers} total users ({selectedTenant.adminUsers} admin, {selectedTenant.operatorUsers} operator)
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTenant.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
                     <DialogFooter>
             <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
               Close
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Add Tenant Dialog */}
       <Dialog open={addTenantDialogOpen} onOpenChange={setAddTenantDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Add New Tenant</DialogTitle>
             <DialogDescription>
               Create a new tenant account with subscription details
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label>Tenant Name</Label>
                 <Input placeholder="Enter tenant name" />
               </div>
               <div>
                 <Label>Subscription Tier</Label>
                 <select className="w-full p-2 border rounded-md">
                   <option value="">Select a tier</option>
                   <option value="bronze">Bronze</option>
                   <option value="silver">Silver</option>
                   <option value="gold">Gold</option>
                 </select>
               </div>
               <div>
                 <Label>Subscription Service</Label>
                 <select className="w-full p-2 border rounded-md">
                   <option value="">Select a service</option>
                   <option value="document">Document ID & Face ID Verification</option>
                   <option value="sms">SMS / Email Verification</option>
                   <option value="bundle">Complete Bundle</option>
                 </select>
               </div>
               <div>
                 <Label>Monthly Price ($)</Label>
                 <Input type="number" placeholder="0.00" />
               </div>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setAddTenantDialogOpen(false)}>
               Cancel
             </Button>
             <Button>Create Tenant</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
        </div>
      </div>
    </div>
  );
 }
