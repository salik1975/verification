import { VerificationService } from './verificationService';

export interface UsageStats {
  total_verifications: number;
  monthly_verifications: number;
  remaining_verifications: number;
  subscription_limit: number;
}

export class UsageTrackingService {
  /**
   * Get current month's verification count for a user
   */
  static async getCurrentMonthUsage(userId: number): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const response = await VerificationService.getUserVerificationCount(
        userId,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      );
      
      return response.verification_count;
    } catch (error) {
      console.error('Failed to get current month usage:', error);
      return 0;
    }
  }

  /**
   * Get usage statistics for a user
   */
  static async getUserUsageStats(userId: number, subscriptionLimit: number): Promise<UsageStats> {
    try {
      const currentMonthUsage = await this.getCurrentMonthUsage(userId);
      const remaining = Math.max(0, subscriptionLimit - currentMonthUsage);
      
      return {
        total_verifications: currentMonthUsage,
        monthly_verifications: currentMonthUsage,
        remaining_verifications: remaining,
        subscription_limit: subscriptionLimit
      };
    } catch (error) {
      console.error('Failed to get user usage stats:', error);
      return {
        total_verifications: 0,
        monthly_verifications: 0,
        remaining_verifications: subscriptionLimit,
        subscription_limit: subscriptionLimit
      };
    }
  }

  /**
   * Check if user has remaining verifications
   */
  static async hasRemainingVerifications(userId: number, subscriptionLimit: number): Promise<boolean> {
    try {
      const stats = await this.getUserUsageStats(userId, subscriptionLimit);
      return stats.remaining_verifications > 0;
    } catch (error) {
      console.error('Failed to check remaining verifications:', error);
      return true; // Default to allowing if check fails
    }
  }

  /**
   * Get verification count for a specific date range
   */
  static async getUsageForDateRange(
    userId: number, 
    startDate: string, 
    endDate: string
  ): Promise<number> {
    try {
      const response = await VerificationService.getUserVerificationCount(
        userId,
        startDate,
        endDate
      );
      
      return response.verification_count;
    } catch (error) {
      console.error('Failed to get usage for date range:', error);
      return 0;
    }
  }
}
