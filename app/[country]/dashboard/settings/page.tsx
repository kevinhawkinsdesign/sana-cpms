'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  User, 
  Mail, 
  Phone,
  Smartphone,
  Monitor
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/authContext";
import api from "@/lib/api/api";
import { format, formatDistanceToNow } from "date-fns";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Fetch user sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['userSessions'],
    queryFn: async () => {
      try {
        const response = await api().get('/api/auth/sessions');
        return response.data.data;
      } catch (error) {
        return { sessions: [] };
      }
    },
    enabled: !!user,
  });

  // Fetch user profile for additional info
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const response = await api(true).get('/api/user/profile');
        return response.data.data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user,
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => api(true).post("/api/auth/change-password", {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }),
    onSuccess: () => {
      toast.success("Password changed successfully", {
        description: "Your password has been updated. All other sessions have been terminated for security.",
      });
      form.reset();
      // Invalidate sessions to refresh the list
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
    },
    onError: (error: any) => {
      toast.error("Failed to update password", {
        description: error.response?.data?.message || "An error occurred while updating your password.",
      });
    },
  });

  // Logout from all devices
  const logoutAllSessionsMutation = useMutation({
    mutationFn: () => api(true).post("/api/auth/logout-all"),
    onSuccess: () => {
      toast.success("Logged out from all devices", {
        description: "You have been logged out from all devices.",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to logout from all devices", {
        description: error.response?.data?.message || "An error occurred while logging out from all devices.",
      });
    },
  });

  // Logout individual session
  const logoutSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      // Terminate individual session
      return api(true).delete(`/api/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      toast.success("Session terminated successfully", {
        description: "The selected session has been terminated.",
      });
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
    },
    onError: (error: any) => {
      toast.error("Failed to terminate session", {
        description: error.response?.data?.message || "An error occurred while terminating the session.",
      });
    },
  });

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    let label = "Very Weak";

    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;

    if (strength >= 100) label = "Very Strong";
    else if (strength >= 75) label = "Strong";
    else if (strength >= 50) label = "Medium";
    else if (strength >= 25) label = "Weak";

    return { strength, label };
  };

  const passwordStrength = getPasswordStrength(form.watch("newPassword"));

  const isPasswordAuth = (user as any)?.authMethod === 'PASSWORD';
  const userData = userProfile?.user || user;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and security preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={userData?.imageUrl} alt="Profile" />
                <AvatarFallback className="text-xl">
                  {userData?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  {userData?.firstName && userData?.lastName 
                    ? `${userData.firstName} ${userData.lastName}`
                    : userData?.firstName || userData?.lastName || 'User'
                  }
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{userData?.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{userData?.phone || 'No phone'}</span>
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {userProfile?.statistics?.totalSessions || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Charging Sessions</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {userProfile?.statistics?.totalKwh || 0} kWh
                </div>
                <div className="text-sm text-muted-foreground">Total Energy</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {userData?.userType || 'GUEST'}
                </div>
                <div className="text-sm text-muted-foreground">KABISA Membership</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Section */}
        {isPasswordAuth && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure. All other sessions will be terminated for security.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => changePasswordMutation.mutate(data))}
                        className="space-y-6">
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                {...field}
                                placeholder="Enter current password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                {...field}
                                placeholder="Enter new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("newPassword") && (
                      <div className="space-y-2">
                        <Progress value={passwordStrength.strength} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          Password Strength: <span className="font-medium">{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                {...field}
                                placeholder="Confirm new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Updating Password...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          <span>Update Password</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Security Notice */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-800">Security Feature</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        When you change your password, all other active sessions will be automatically terminated for security. 
                        You'll remain logged in on this device.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>
                  Manage your active sessions across different devices
                </CardDescription>
              </div>
              {sessionsData?.sessions?.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Logout All Devices
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Logout All Devices</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will log you out from all devices. You'll need to log in again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => logoutAllSessionsMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={logoutAllSessionsMutation.isPending}
                      >
                        {logoutAllSessionsMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Logging out...</span>
                          </div>
                        ) : (
                          "Logout All Devices"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sessionsData?.sessions?.length > 0 ? (
              <div className="space-y-3">
                {sessionsData.sessions.map((session: {
                  id: string;
                  deviceInfo?: string;
                  ipAddress?: string;
                  userAgent?: string;
                  createdAt: string;
                  expiresAt: string;
                  isCurrentDevice: boolean;
                }, index: number) => {
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        {session.deviceInfo?.includes('iPhone') || session.deviceInfo?.includes('Android') ? (
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {session.deviceInfo || 'Unknown Device'}
                          </span>
                          {session.isCurrentDevice && (
                            <Badge variant="default" className="text-xs">
                              This Device
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {session.ipAddress && session.ipAddress=="1"? "Localhost" : session.ipAddress || 'No IP'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Logged in {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Expires: {format(new Date(session.expiresAt), 'MMM dd, yyyy')}</div>
                          <div className="text-xs">
                            {format(new Date(session.expiresAt), 'HH:mm')}
                          </div>
                        </div>
                        {!session.isCurrentDevice && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                End Session
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>End Session</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to end this session? This will log out the device from your account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => logoutSessionMutation.mutate(session.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={logoutSessionMutation.isPending}
                                >
                                  {logoutSessionMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                      <span>Ending...</span>
                                    </div>
                                  ) : (
                                    "End Session"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active sessions found</p>
                <p className="text-sm">You are currently logged in on this device only</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;