import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  Users,
  Activity,
  Shield,
  Globe,
  UserPlus
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import SubscriptionPlanSelector from '@/components/SubscriptionPlanSelector';
import { usageDashboardService, EnhancedSessionResponse } from '@/services/usageDashboardService';
import { useAuth } from '@/components/contexts/AuthContext';
import { useAppearance } from '@/components/contexts/AppearanceContext';
import UserManagementTable from '@/components/UserManagementTable';
import AddUserDialog from '@/components/AddUserDialog';
import EditUserDialog from '@/components/EditUserDialog';
import { userService, User as UserType } from '@/services/userService';

// Types
interface UsageData {
  date: string;
  reports: number;
  type: 'document' | 'sms' | 'email';
}

interface SubscriptionInfo {
  tier: string;
  service: string;
  maxReports: number;
  usedReports: number;
  startDate: string;
  endDate: string;
  daysLeft: number;
  isActive: boolean;
  price: number;
}

interface UsageStats {
  totalReports: number;
  documentReports: number;
  smsReports: number;
  emailReports: number;
  monthlyTrend: number;
  weeklyAverage: number;
}

// Dummy data - will be replaced with API calls
const mockUsageData: UsageData[] = [
  { date: '2024-08-01', reports: 12, type: 'document' },
  { date: '2024-08-02', reports: 18, type: 'document' },
  { date: '2024-08-03', reports: 15, type: 'sms' },
  { date: '2024-08-04', reports: 22, type: 'document' },
  { date: '2024-08-05', reports: 8, type: 'email' },
  { date: '2024-08-06', reports: 25, type: 'document' },
  { date: '2024-08-07', reports: 19, type: 'sms' },
  { date: '2024-08-08', reports: 14, type: 'document' },
  { date: '2024-08-09', reports: 21, type: 'document' },
  { date: '2024-08-10', reports: 16, type: 'email' },
  { date: '2024-08-11', reports: 28, type: 'document' },
  { date: '2024-08-12', reports: 13, type: 'sms' },
  { date: '2024-08-13', reports: 17, type: 'document' },
  { date: '2024-08-14', reports: 24, type: 'document' },
];

const mockSubscriptionInfo: SubscriptionInfo = {
  tier: 'Silver',
  service: 'Complete Bundle',
  maxReports: 300,
  usedReports: 248,
  startDate: '2024-01-01',
  endDate: '2025-09-20',
  daysLeft: 18,
  isActive: true,
  price: 250
};

const mockUsageStats: UsageStats = {
  totalReports: 248,
  documentReports: 180,
  smsReports: 45,
  emailReports: 23,
  monthlyTrend: 12.5,
  weeklyAverage: 30.31
};

// Chart colors
const CHART_COLORS = {
  document: '#3b82f6',
  sms: '#10b981',
  email: '#f59e0b',
  primary: '#6478cf',
  secondary: '#94a3b8'
};

// Skeleton loading component for subscription banner
const SubscriptionBannerSkeleton = () => (
  <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-950/20 dark:via-gray-900/20 dark:to-gray-950/20 shadow-xl animate-pulse">
    {/* Animated background pattern */}
    <div className="absolute inset-0 bg-gradient-to-r from-gray-100/15 via-gray-200/15 to-gray-100/15 dark:from-gray-800/8 dark:via-gray-700/8 dark:to-gray-800/8 animate-pulse"></div>
    
    {/* Decorative elements */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-200/20 to-gray-300/20 dark:from-gray-700/15 dark:to-gray-600/15 rounded-full -translate-y-16 translate-x-16"></div>
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-200/20 to-gray-300/20 dark:from-gray-700/15 dark:to-gray-600/15 rounded-full translate-y-12 -translate-x-12"></div>
   
   <CardContent className="relative p-8">
     <div className="flex items-center justify-between">
       <div className="flex items-center gap-6">
         <div className="relative">
           <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center shadow-lg">
             <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
           </div>
           {/* Very slow pulse ring effect */}
           <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-gray-300/15 to-gray-400/15 rounded-2xl animate-pulse" style={{ animationDuration: '4s' }}></div>
         </div>
         <div className="space-y-2">
           <div className="flex items-center gap-3">
             <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
             <div className="h-6 w-24 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
           </div>
           <div className="h-4 w-80 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
           <div className="flex items-center gap-4">
             <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
             <div className="h-4 w-36 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
           </div>
         </div>
       </div>
       
       <div className="flex flex-col gap-4 min-w-[200px]">
         <div className="h-14 w-full bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
         <div className="h-16 w-full bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
       </div>
     </div>
   </CardContent>
 </Card>
);

// Skeleton loading component for usage overview cards
const UsageOverviewCardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {[1, 2, 3, 4].map((index) => (
      <Card key={index} className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
          <div className="h-3 w-32 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
          <div className="h-3 w-40 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Data unavailable component
const DataUnavailableCard = ({ message, icon: Icon = AlertTriangle }: { message: string; icon?: React.ElementType }) => (
  <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">Data Unavailable</h3>
      <p className="text-sm text-gray-500 dark:text-gray-500 max-w-md">{message}</p>
    </CardContent>
  </Card>
);

// Empty chart placeholder component
const ChartNoDataPlaceholder = ({ height = 300, message = "Not enough data to display chart" }: { height?: number; message?: string }) => (
  <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500" style={{ height }}>
    <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
    <p className="text-sm font-medium">{message}</p>
    <p className="text-xs mt-1 opacity-70">Data will appear here once available</p>
  </div>
);

// Data unavailable banner for subscription section
const SubscriptionUnavailableBanner = ({ error }: { error: string }) => (
  <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900/50 dark:via-gray-800/50 dark:to-gray-900/50 shadow-xl">
    <CardContent className="relative p-8">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
          <AlertTriangle className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400">
            Subscription Data Unavailable
          </h3>
          <p className="text-base text-gray-500 dark:text-gray-500 max-w-md">
            {error}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function UsageDashboard() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { appearance } = useAppearance();
  const [usageData, setUsageData] = useState<UsageData[] | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [activeTab, setActiveTab] = useState('subscription');
  const [isLoading, setIsLoading] = useState(true);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [userSession, setUserSession] = useState<EnhancedSessionResponse | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);
  
  // User management state
  const [users, setUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  // Load real data from backend
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setDataFetchError(null);

        // Get user session token from localStorage (stored by AuthContext)
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setDataFetchError('No user session found. Please log in to view dashboard data.');
          setIsLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);
        const token = userData.token;
        if (!token) {
          setDataFetchError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }

        // Get enhanced session data first (for user info and roles)
        const sessionData = await usageDashboardService.getEnhancedSession(token);
        setUserSession(sessionData);

        // Check if user has tenant subscription data
        if (sessionData.tenant_id && sessionData.user_id) {
          // Get comprehensive dashboard data from the dedicated endpoint
          const dashboardData = await usageDashboardService.getDashboardData(sessionData.user_id, 30);

          // Transform to UI format
          const legacyData = usageDashboardService.transformToLegacyFormat(dashboardData);

          // Update state with real data
          setSubscriptionInfo(legacyData.subscriptionInfo);
          setUsageStats(legacyData.usageStats);
          setUsageData(legacyData.usageData);
          setHasRealData(true);
        } else {
          // No tenant data - user may not have a subscription
          setDataFetchError('No subscription data found for your account.');
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setDataFetchError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Load users when user session is available
  useEffect(() => {
    const loadUsers = async () => {
      if (!userSession?.tenant_id) return;
      
      try {
        setUsersLoading(true);
        const tenantUsers = await userService.getTenantUsers(userSession.tenant_id);
        setUsers(tenantUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [userSession?.tenant_id]);

  // Calculate usage percentage (only when data is available)
  const usagePercentage = subscriptionInfo && usageStats
    ? (usageStats.totalReports / subscriptionInfo.maxReports) * 100
    : 0;
  const isNearLimit = usagePercentage > 80;

  // Check if subscription is expiring soon
  const isExpiringSoon = subscriptionInfo ? subscriptionInfo.daysLeft <= 30 : false;

  // Prepare chart data (only when usage data is available)
  const chartData = usageData ? usageData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    reports: item.reports,
    type: item.type
  })) : [];

  // Pie chart data from real stats (only when available)
  const pieChartData = usageStats ? [
    { name: 'Document Verification', value: usageStats.documentReports, color: CHART_COLORS.document },
    { name: 'SMS Verification', value: usageStats.smsReports, color: CHART_COLORS.sms },
    { name: 'Email Verification', value: usageStats.emailReports, color: CHART_COLORS.email }
  ] : [];

  const handleRenewal = () => {
    setShowRenewalDialog(true);
  };

  const handleUpgrade = () => {
    setShowUpgradeDialog(true);
  };

  const handlePlanSelect = (plan: any) => {
    // Handle plan selection logic
    setShowRenewalDialog(false);
    setShowUpgradeDialog(false);
    toast({
      title: "Plan Updated",
      description: "Your subscription has been successfully updated.",
    });
  };

  // User management handlers
  const handleUserCreated = async () => {
    if (userSession?.tenant_id) {
      try {
        const tenantUsers = await userService.getTenantUsers(userSession.tenant_id);
        setUsers(tenantUsers);
      } catch (error) {
        console.error('Error refreshing users:', error);
      }
    }
  };

  const handleUserUpdated = async () => {
    if (userSession?.tenant_id) {
      try {
        const tenantUsers = await userService.getTenantUsers(userSession.tenant_id);
        setUsers(tenantUsers);
      } catch (error) {
        console.error('Error refreshing users:', error);
      }
    }
  };

  const handleUserDeleted = async (userId: number) => {
    try {
      await userService.deleteUser(userId);
      setUsers(users.filter(user => user.user_id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  // Role-based access control with fallback to AuthContext user
  const userAccessLevel = userSession 
    ? usageDashboardService.getUserAccessLevel(userSession) 
    : (user && isAuthenticated) 
      ? (user.roles.includes('product_owner') ? 'product_owner' : 
         user.roles.includes('admin') ? 'admin' : 
         user.roles.includes('operator') ? 'operator' : 'none')
      : 'none';
  
  const isProductOwner = userSession 
    ? usageDashboardService.isProductOwner(userSession) 
    : (user && user.roles.includes('product_owner'));
  
  const isAdmin = userSession 
    ? usageDashboardService.isAdmin(userSession) 
    : (user && user.roles.includes('admin'));

  const canManageSubscription = userAccessLevel === 'product_owner' || userAccessLevel === 'admin' || userAccessLevel === 'operator';

  // Get current plan info for the selector
  const getCurrentPlanInfo = () => ({
    tier: subscriptionInfo?.tier || 'Unknown',
    service: subscriptionInfo?.service || 'Unknown',
    price: subscriptionInfo?.price || 0
  });

  // Get detailed current subscription info for renew/upgrade modes
  const getCurrentSubscription = () => {
    // Map tier names to IDs (this should ideally come from the backend)
    const tierIdMap: { [key: string]: number } = {
      'Bronze': 1,
      'Silver': 2,
      'Gold': 3
    };
    
    // Map service names to IDs (this should ideally come from the backend)
    const serviceIdMap: { [key: string]: number } = {
      'Document Verification': 1,
      'SMS/Email Verification': 2,
      'Complete Bundle': 3
    };

    return {
      tier_id: tierIdMap[subscriptionInfo?.tier || ''] || 2, // Default to Silver
      service_id: serviceIdMap[subscriptionInfo?.service || ''] || 3, // Default to Complete Bundle
      tier_name: subscriptionInfo?.tier || 'Unknown',
      service_name: subscriptionInfo?.service || 'Unknown',
      price: subscriptionInfo?.price || 0
    };
  };

  const getStatusColor = (daysLeft: number) => {
    if (daysLeft <= 7) return 'destructive';
    if (daysLeft <= 30) return 'secondary';
    return 'default';
  };

  const getStatusIcon = (daysLeft: number) => {
    if (daysLeft <= 7) return <AlertTriangle className="w-4 h-4" />;
    if (daysLeft <= 30) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
             {/* Header */}
       <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6">
                 <div className="flex justify-between items-start">
                       <div>
               <h1 className="text-2xl font-semibold mb-2 text-white">Usage Dashboard</h1>
               <p className="text-white">Monitor your verification usage and subscription status</p>
               
                               {/* Data source indicator */}
                <div className="mt-2 flex items-center gap-4">
                  {/* Data source indicator */}
                 <div className="flex items-center gap-2">
                   {isLoading ? (
                     <div className="flex items-center gap-2 text-white/70">
                       <RefreshCw className="w-4 h-4 animate-spin" />
                       <span className="text-sm">Loading dashboard data...</span>
                     </div>
                                        ) : (
                       <div className="flex items-center gap-2 text-white/70">
                         {!hasRealData && user && isAuthenticated ? (
                           <>
                             <Users className="w-4 h-4 text-blue-400" />
                             <span className="text-sm">Logged in as {user.name} ({user.roles.join(', ')}) - Demo data</span>
                           </>
                         ) : !hasRealData && !user ? (
                           <>
                             <AlertTriangle className="w-4 h-4 text-yellow-400" />
                             <span className="text-sm">Demo data (not authenticated)</span>
                           </>
                         ) : null}
                       </div>
                     )}
                 </div>
               </div>
             </div>
           </div>

                 {/* Sub Header */}
         <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">

                       {/* Enhanced Subscription Status Alert */}
            {isLoading ? (
              <SubscriptionBannerSkeleton />
            ) : dataFetchError || !subscriptionInfo ? (
              <SubscriptionUnavailableBanner error={dataFetchError || 'Unable to load subscription data.'} />
            ) : isExpiringSoon ? (
             <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 shadow-xl">
               {/* Animated background pattern */}
               <div className="absolute inset-0 bg-gradient-to-r from-orange-100/15 via-amber-100/15 to-yellow-100/15 dark:from-orange-900/8 dark:via-amber-900/8 dark:to-yellow-900/8 animate-pulse"></div>

               {/* Decorative elements */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-amber-200/20 dark:from-orange-800/15 dark:to-amber-800/15 rounded-full -translate-y-16 translate-x-16"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-200/20 to-amber-200/20 dark:from-yellow-800/15 dark:to-amber-800/15 rounded-full translate-y-12 -translate-x-12"></div>

              <CardContent className="relative p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg">
                        {getStatusIcon(subscriptionInfo.daysLeft)}
                      </div>
                      {/* Very slow pulse ring effect */}
                      <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-orange-400/15 to-amber-400/15 rounded-2xl animate-pulse" style={{ animationDuration: '4s' }}></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-300 dark:to-amber-300 bg-clip-text text-transparent">
                          Subscription Expiring Soon
                        </h3>
                        <Badge variant="destructive" className="animate-bounce">
                          {subscriptionInfo.daysLeft} days left
                        </Badge>
                      </div>
                      <p className="text-base text-muted-foreground max-w-md">
                        Don't let your verification services expire! Renew now to maintain uninterrupted access to all features.
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Expires: {new Date(subscriptionInfo.endDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          Current: {subscriptionInfo.tier} Plan
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManageSubscription && (
                    <div className="flex flex-col gap-4 min-w-[200px]">
                      <Button
                        onClick={handleRenewal}
                        className="relative overflow-hidden bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-semibold px-8 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 min-h-[56px] group text-lg"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <CreditCard className="w-5 h-5 mr-3 relative z-10" />
                        <span className="relative z-10">Renew Now</span>
                      </Button>

                      <Button
                        onClick={handleUpgrade}
                        className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-10 py-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 min-h-[64px] group text-lg"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <ArrowUpRight className="w-6 h-6 mr-3 relative z-10" />
                        <span className="relative z-10">Upgrade Plan</span>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-ping"></div>
                      </Button>
                    </div>
                  )}
                  {!canManageSubscription && (
                    <div className="flex flex-col gap-2 min-w-[200px] text-center">
                      <div className="text-white/70 text-sm">
                        {user && isAuthenticated
                          ? `Role: ${user.roles.join(', ')} - Contact administrator for subscription management`
                          : 'Please log in to manage subscriptions'
                        }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
          
                      {/* Green Subscription Status Alert - Show when NOT expiring soon and we have data */}
            {!isLoading && !dataFetchError && subscriptionInfo && !isExpiringSoon && canManageSubscription && (
            <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 shadow-xl">
              {/* Animated background pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-100/15 via-emerald-100/15 to-teal-100/15 dark:from-green-900/8 dark:via-emerald-900/8 dark:to-teal-900/8 animate-pulse"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/20 to-emerald-200/20 dark:from-green-800/15 dark:to-emerald-800/15 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-200/20 to-emerald-200/20 dark:from-teal-800/15 dark:to-emerald-800/15 rounded-full translate-y-12 -translate-x-12"></div>
             
             <CardContent className="relative p-8">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-6">
                   <div className="relative">
                     <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg">
                       <CheckCircle className="w-8 h-8 text-white" />
                     </div>
                     {/* Very slow pulse ring effect */}
                     <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-2xl animate-pulse" style={{ animationDuration: '4s' }}></div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex items-center gap-3">
                       <h3 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-300 dark:to-emerald-300 bg-clip-text text-transparent">
                         Active Subscription
                       </h3>
                       <Badge variant="default" className="bg-green-500 text-white">
                         {subscriptionInfo.daysLeft} days remaining
                       </Badge>
                     </div>
                     <p className="text-base text-muted-foreground max-w-md">
                       Your {subscriptionInfo.tier} plan is active and working well. You can renew or upgrade anytime.
                     </p>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                       <span className="flex items-center gap-1">
                         <Calendar className="w-4 h-4" />
                         Expires: {new Date(subscriptionInfo.endDate).toLocaleDateString()}
                       </span>
                       <span className="flex items-center gap-1">
                         <CreditCard className="w-4 h-4" />
                         Current: {subscriptionInfo.tier} Plan
                       </span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-4 min-w-[200px]">
                   <Button 
                     onClick={handleRenewal} 
                     className="relative overflow-hidden bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white font-semibold px-8 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 min-h-[56px] group text-lg"
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <CreditCard className="w-5 h-5 mr-3 relative z-10" />
                     <span className="relative z-10">Renew Now</span>
                   </Button>
                   
                   <Button 
                     onClick={handleUpgrade} 
                     className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-10 py-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 min-h-[64px] group text-lg"
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <ArrowUpRight className="w-6 h-6 mr-3 relative z-10" />
                     <span className="relative z-10">Upgrade Plan</span>
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-ping"></div>
                   </Button>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}
         </div>
       </div>

       {/* Main Content */}
       <div className="p-6 mt-8 mr-6">
         <div className="max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">
           
      {/* Usage Overview Cards */}
      {isLoading ? (
        <UsageOverviewCardsSkeleton />
      ) : !subscriptionInfo || !usageStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {['Total Reports Used', 'Reports Remaining', 'Days Remaining', 'Weekly Average'].map((title, index) => (
            <Card key={index} className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-400">--</div>
                <p className="text-xs text-gray-400">Data unavailable</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports Used</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.totalReports}</div>
              <p className="text-xs text-muted-foreground">
                <span className={usageStats.monthlyTrend > 0 ? 'text-green-600' : 'text-red-600'}>
                  {usageStats.monthlyTrend > 0 ? '+' : ''}{usageStats.monthlyTrend}%
                </span> from last month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {subscriptionInfo.usedReports} total since subscription start
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports Remaining</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptionInfo.maxReports - usageStats.totalReports}</div>
              <p className="text-xs text-muted-foreground">
                {usagePercentage.toFixed(1)}% of limit used
              </p>
              <Progress value={usagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptionInfo.daysLeft}</div>
              <p className="text-xs text-muted-foreground">
                Subscription expires {new Date(subscriptionInfo.endDate).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.weeklyAverage}</div>
              <p className="text-xs text-muted-foreground">
                reports per week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

             {/* Main Content Tabs */}
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
         <TabsList className="flex w-full bg-background border-2 border-border shadow-lg rounded-lg p-1">
           <TabsTrigger 
             value="subscription"
             className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-12"
           >
             <CreditCard className="w-4 h-4 mr-2" />
             Subscription Details
           </TabsTrigger>
           <TabsTrigger 
             value="overview" 
             className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-12"
           >
             <BarChart3 className="w-4 h-4 mr-2" />
             Overview
           </TabsTrigger>
           <TabsTrigger 
             value="usage"
             className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-12"
           >
             <TrendingUp className="w-4 h-4 mr-2" />
             Usage Analytics
           </TabsTrigger>
           {(isAdmin || isProductOwner) && (
             <TabsTrigger 
               value="users"
               className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-12"
             >
               <Users className="w-4 h-4 mr-2" />
               User Management
             </TabsTrigger>
           )}
         </TabsList>

                 <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Trend Chart */}
            <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
              <CardHeader>
                <CardTitle>Usage Trend (Last 14 Days)</CardTitle>
                <CardDescription>
                  Daily verification report usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="reports"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartNoDataPlaceholder message="Not enough data for usage trend" />
                )}
              </CardContent>
            </Card>

            {/* Usage by Type */}
            <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
              <CardHeader>
                <CardTitle>Usage by Verification Type</CardTitle>
                <CardDescription>
                  Breakdown of verification methods used
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 && pieChartData.some(item => item.value > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      {pieChartData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <ChartNoDataPlaceholder message="Not enough data for verification breakdown" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

                                            <TabsContent value="usage" className="mt-6">
            {!usageStats ? (
              <DataUnavailableCard message="Usage analytics data is not available. Please check your subscription status." icon={TrendingUp} />
            ) : (
            <Card className="relative overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
                            <CardHeader className="pb-4">
                 <CardDescription>
                   Comprehensive breakdown of your verification usage patterns with detailed insights
                 </CardDescription>
               </CardHeader>
                            <CardContent className="space-y-6">
                 {/* Enhanced Bar Chart */}
                 <div>
                   {chartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height={350}>
                     <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                              <defs>
                          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                          </linearGradient>
                          <linearGradient id="barGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--primary) / 0.9)" />
                            <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
                          </linearGradient>
                        </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                       <XAxis
                         dataKey="date"
                         axisLine={false}
                         tickLine={false}
                         tick={{ fontSize: 12, fill: '#6b7280' }}
                         tickMargin={10}
                       />
                       <YAxis
                         axisLine={false}
                         tickLine={false}
                         tick={{ fontSize: 12, fill: '#6b7280' }}
                         tickMargin={10}
                       />
                       <Tooltip
                         contentStyle={{
                           backgroundColor: 'rgba(255, 255, 255, 0.95)',
                           border: 'none',
                           borderRadius: '12px',
                           boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                           padding: '12px 16px'
                         }}
                         formatter={(value: any, name: any) => [
                           `${value} reports`,
                           'Daily Usage'
                         ]}
                         labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                       />
                       <Bar
                         dataKey="reports"
                         fill="url(#barGradient)"
                         radius={[4, 4, 0, 0]}
                         maxBarSize={50}
                         animationDuration={2000}
                         animationBegin={0}
                       />
                     </BarChart>
                   </ResponsiveContainer>
                   ) : (
                     <ChartNoDataPlaceholder height={350} message="Not enough data for daily usage chart" />
                   )}
                 </div>

                 {/* Analytics Summary - Horizontal Layout */}
                 <div>
                   <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                     Usage Insights
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     {/* Peak Usage Day */}
                     <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                       <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                           <TrendingUp className="w-4 h-4 text-white" />
                         </div>
                         <div>
                           <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                             Peak Usage Day
                           </div>
                           <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                             --
                           </div>
                         </div>
                       </div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                         Highest daily usage
                       </div>
                     </div>

                     {/* Average Daily Usage */}
                     <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                       <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                           <Activity className="w-4 h-4 text-white" />
                         </div>
                         <div>
                           <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                             Daily Average
                           </div>
                           <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                             {(usageStats.totalReports / 14).toFixed(1)}
                           </div>
                         </div>
                       </div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                         reports per day
                       </div>
                     </div>

                     {/* Usage Trend */}
                     <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                       <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                           <BarChart3 className="w-4 h-4 text-white" />
                         </div>
                         <div>
                           <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                             Usage Trend
                           </div>
                           <div className="text-lg font-bold text-green-600">
                             +{usageStats.monthlyTrend}%
                           </div>
                         </div>
                       </div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                         vs last month
                       </div>
                     </div>

                     {/* Weekly Breakdown */}
                     <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                       <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                         Weekly Average
                       </div>
                       <div className="space-y-2">
                         <div className="flex justify-between text-xs">
                           <span className="text-gray-500 dark:text-gray-400">Reports/Week</span>
                           <span className="font-medium text-gray-900 dark:text-gray-100">{usageStats.weeklyAverage}</span>
                         </div>
                         <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
                           <div className="bg-gradient-to-r from-orange-400 to-amber-400 h-1 rounded-full" style={{ width: `${Math.min((usageStats.weeklyAverage / 100) * 100, 100)}%` }}></div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
            </Card>
            )}
          </TabsContent>

                 <TabsContent value="subscription" className="mt-6">
          {!subscriptionInfo || !usageStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataUnavailableCard message="Subscription details are not available. Please check your account status." icon={CreditCard} />
              <DataUnavailableCard message="Usage limits data is not available." icon={Shield} />
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Subscription */}
            <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  Your active subscription details
                </CardDescription>
              </CardHeader>
                             <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium">Plan Tier</span>
                   <Badge variant="secondary" className="text-sm px-3 py-1">{subscriptionInfo.tier}</Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium">Service</span>
                   <span className="text-sm">{subscriptionInfo.service}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium">Monthly Price</span>
                   <span className="text-lg font-bold text-primary">${subscriptionInfo.price}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium">Status</span>
                   <Badge variant={subscriptionInfo.isActive ? "default" : "destructive"}>
                     {subscriptionInfo.isActive ? "Active" : "Inactive"}
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium">Expires In</span>
                   <Badge variant={getStatusColor(subscriptionInfo.daysLeft)}>
                     {subscriptionInfo.daysLeft} days
                   </Badge>
                 </div>
               </CardContent>
            </Card>

            {/* Usage Limits */}
            <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
                <CardDescription>
                  Your current usage against limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Reports Used</span>
                    <span className="text-sm">
                      {usageStats.totalReports} / {subscriptionInfo.maxReports}
                    </span>
                  </div>
                  <Progress
                    value={usagePercentage}
                    className="h-2"
                  />
                </div>

                                 <div className="grid grid-cols-2 gap-4 pt-4">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-blue-600">{(usageStats.weeklyAverage / 7).toFixed(1)}</div>
                     <div className="text-xs text-muted-foreground">Current Usage/Day</div>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-green-600">
                       {usageStats.weeklyAverage > 0 ? Math.floor((subscriptionInfo.maxReports - usageStats.totalReports) / (usageStats.weeklyAverage / 7)) : '--'}
                     </div>
                     <div className="text-xs text-muted-foreground">Days Left at Current Rate</div>
                   </div>
                 </div>
              </CardContent>
            </Card>
                     </div>
          )}
         </TabsContent>

         {/* User Management Tab */}
         {(isAdmin || isProductOwner) && (
           <TabsContent value="users" className="mt-6">
             <Card className="shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out border-0 bg-gradient-to-br from-background to-muted/20 hover:bg-gradient-to-br hover:from-background hover:to-muted/30" style={{ border: `1px solid ${appearance.primaryColor}20` }}>
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle className="flex items-center gap-2">
                       <Users className="w-5 h-5" />
                       User Management
                     </CardTitle>
                     <CardDescription>
                       Manage users in your tenant. Add new users, edit permissions, and monitor user activity.
                     </CardDescription>
                   </div>
                   <Button 
                     onClick={() => setAddUserDialogOpen(true)}
                     className="flex items-center gap-2"
                   >
                     <UserPlus className="w-4 h-4" />
                     Add New User
                   </Button>
                 </div>
               </CardHeader>
               <CardContent>
                 <UserManagementTable
                   users={users}
                   onEditUser={handleEditUser}
                   onDeleteUser={handleUserDeleted}
                   isLoading={usersLoading}
                   currentUserId={userSession?.user_id}
                 />
               </CardContent>
             </Card>
           </TabsContent>
         )}
      </Tabs>

             {/* Renewal Dialog */}
       <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
         <DialogContent className="max-w-5xl max-h-[90vh] overflow-visible [&>button]:hidden bg-transparent border-0 shadow-none p-0">
           <DialogTitle className="sr-only">Renew Subscription</DialogTitle>
           <DialogDescription className="sr-only">Choose to renew your current plan or explore other options</DialogDescription>
           <div className="py-4">
              <SubscriptionPlanSelector
                onPlanSelect={handlePlanSelect}
                onClose={() => setShowRenewalDialog(false)}
                isDialog={true}
                mode="renewal"
                currentPlan={getCurrentPlanInfo()}
                currentSubscription={getCurrentSubscription()}
              />
            </div>
         </DialogContent>
       </Dialog>

       {/* Upgrade Dialog */}
       <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
         <DialogContent className="max-w-5xl max-h-[90vh] overflow-visible [&>button]:hidden bg-transparent border-0 shadow-none p-0">
           <DialogTitle className="sr-only">Upgrade Subscription</DialogTitle>
           <DialogDescription className="sr-only">Explore higher tiers and additional services to meet your growing needs</DialogDescription>
           <div className="py-4">
              <SubscriptionPlanSelector
                onPlanSelect={handlePlanSelect}
                onClose={() => setShowUpgradeDialog(false)}
                isDialog={true}
                mode="upgrade"
                currentPlan={getCurrentPlanInfo()}
                currentSubscription={getCurrentSubscription()}
              />
            </div>
         </DialogContent>
       </Dialog>

       {/* Add User Dialog */}
       <AddUserDialog
         open={addUserDialogOpen}
         onOpenChange={setAddUserDialogOpen}
         onUserCreated={handleUserCreated}
         tenantId={userSession?.tenant_id || 0}
       />

       {/* Edit User Dialog */}
       <EditUserDialog
         open={editUserDialogOpen}
         onOpenChange={setEditUserDialogOpen}
         onUserUpdated={handleUserUpdated}
         user={selectedUser}
       />
         </div>
       </div>
     </div>
   );
 }

