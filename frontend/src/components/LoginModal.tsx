import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useAppearance } from './contexts/AppearanceContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useToast } from '../hooks/use-toast';
import { X, User, Lock, Eye, EyeOff } from 'lucide-react';
import { TbLockPassword } from "react-icons/tb";
import { hashPassword } from '../utils/passwordUtils';

enum LoginStep {
  CREDENTIALS,
  OTP,
  FORGOT_PASSWORD_EMAIL,
  FORGOT_PASSWORD_OTP,
  FORGOT_PASSWORD_NEW_PASSWORD
}

enum LoginMode {
  PASSWORD,
  OTP
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sendOtp, verifyOtp, resetPassword } = useAuth();
  const { appearance, loading: appearanceLoading } = useAppearance();
  const { toast } = useToast();
  
  const [loginStep, setLoginStep] = useState<LoginStep>(LoginStep.CREDENTIALS);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>(LoginMode.PASSWORD);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (loginMode === LoginMode.PASSWORD) {
        // Send plain text password to backend for secure verification
        await login(username, password);
        const from = location.state?.from || '/';
        navigate(from);
        toast({ title: "Success", description: "Login successful!" });
        onClose();
      } else {
        await login(username, otp, 'otp');
        const from = location.state?.from || '/';
        navigate(from);
        toast({ title: "Success", description: "Login successful!" });
        onClose();
      }
    } catch (error) {
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendOtp(username);
      setOtpSent(true);
      setLoginMode(LoginMode.OTP);
      toast({ title: "OTP Sent", description: "Please check your email for the OTP code." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpButtonClick = () => {
    setLoginMode(LoginMode.OTP);
    setOtpSent(false);
    setUsername('');
    setOtp('');
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await verifyOtp(email, otp);
      const from = location.state?.from || '/';
      navigate(from);
      toast({
        title: "Success",
        description: "Login successful!",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "OTP verification failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendForgotPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendOtp(email);
      setLoginStep(LoginStep.FORGOT_PASSWORD_OTP);
      toast({ title: "OTP Sent", description: "Please check your email for the OTP code." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyForgotPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setLoginStep(LoginStep.FORGOT_PASSWORD_NEW_PASSWORD);
      toast({ title: "OTP Verified", description: "Please enter your new password." });
    } catch (error) {
      toast({ title: "Error", description: "OTP verification failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    try {
      // Send plain text password to backend for secure hashing
      await resetPassword(email, newPassword, otp);
      setLoginStep(LoginStep.CREDENTIALS);
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast({
        title: "Success",
        description: "Password reset successful. Please login with your new password.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Password reset failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-background rounded-lg shadow-2xl w-[400px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-500">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {appearanceLoading ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
                      <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
                    </>
                  ) : (
                    <>
                      <img
                        src={appearance.productLogo}
                        alt="Logo"
                        className="w-8 h-8 object-contain"
                      />
                      {appearance.hasNameImage ? (
                        <img
                          src={appearance.productNameImage}
                          alt="Brand Name"
                          className="h-6 object-contain"
                        />
                      ) : (
                        <h1 className="text-xl font-bold">VeraFi.Me</h1>
                      )}
                    </>
                  )}
                </div>
                <CardTitle className="text-xl">Welcome Back</CardTitle>
                <CardDescription>Please sign in to continue</CardDescription>
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
          </CardHeader>

          <CardContent className="space-y-4">
            {loginMode === LoginMode.PASSWORD && (
              <>
                {/* OTP Login Button at Top */}
                <Button 
                  variant="outline" 
                  onClick={handleOtpButtonClick} 
                  type="button" 
                  disabled={isLoading}
                  className="w-full h-12 text-base font-semibold"
                >
                  <TbLockPassword className="w-7 h-7 mr-2" />
                  Login with OTP
                </Button>
                
                {/* OR Separator */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/20"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
                  </div>
                </div>
                
                {/* Password Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email / User ID *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Enter User ID or Email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? "Loading..." : "Login"}
                  </Button>
                  
                  <div className="text-center">
                    <Button 
                      variant="link" 
                      onClick={() => setLoginStep(LoginStep.FORGOT_PASSWORD_EMAIL)} 
                      type="button"
                      className="text-sm"
                    >
                      Forgot Password?
                    </Button>
                  </div>
                </form>
              </>
            )}

            {loginMode === LoginMode.OTP && (
              <>
                {!otpSent ? (
                  // Step 1: Email input to send OTP
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email / User ID *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Enter User ID or Email"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                      {isLoading ? "Sending..." : "Send OTP"}
                    </Button>
                    
                    <div className="text-center">
                      <Button 
                        variant="link" 
                        onClick={() => setLoginMode(LoginMode.PASSWORD)} 
                        type="button"
                        className="text-sm"
                      >
                        Back to Password Login
                      </Button>
                    </div>
                  </form>
                ) : (
                  // Step 2: OTP input
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">OTP Code *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Enter OTP Code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </Button>
                    
                    <div className="text-center">
                      <Button 
                        variant="link" 
                        onClick={() => setOtpSent(false)} 
                        type="button"
                        className="text-sm"
                      >
                        Resend OTP
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Forgot Password Flow */}
            {loginStep === LoginStep.FORGOT_PASSWORD_EMAIL && (
              <form onSubmit={handleSendForgotPasswordOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset OTP"}
                </Button>
                
                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setLoginStep(LoginStep.CREDENTIALS)} 
                    type="button"
                    className="text-sm"
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            )}

            {loginStep === LoginStep.FORGOT_PASSWORD_OTP && (
              <form onSubmit={handleVerifyForgotPasswordOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">OTP Code *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Enter OTP Code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>
                
                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setLoginStep(LoginStep.FORGOT_PASSWORD_EMAIL)} 
                    type="button"
                    className="text-sm"
                  >
                    Back to Email
                  </Button>
                </div>
              </form>
            )}

            {loginStep === LoginStep.FORGOT_PASSWORD_NEW_PASSWORD && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                
                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setLoginStep(LoginStep.FORGOT_PASSWORD_OTP)} 
                    type="button"
                    className="text-sm"
                  >
                    Back to OTP
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
