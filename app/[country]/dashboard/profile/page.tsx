'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Phone, Camera, Save, X, Car, CreditCard, Building, Zap, Calendar, DollarSign } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/authContext";
import api from "@/lib/api/api";
import ImageUpload from "@/components/ui/image-upload";

// Dynamic schema based on login method
const createProfileSchema = () => {
  return z.object({
    firstName: z.string().optional().or(z.literal("")).refine((val) => {
      if (val === "" || val === undefined || val === null) return true;
      return val.length >= 2 && val.length <= 50;
    }, "First name must be at least 2 characters and less than 50 characters"),
    lastName: z.string().optional().or(z.literal("")).refine((val) => {
      if (val === "" || val === undefined || val === null) return true;
      return val.length >= 2 && val.length <= 50;
    }, "Last name must be at least 2 characters and less than 50 characters"),
    imageUrl: z.string().optional().or(z.literal("")),
    email: z.string().optional().or(z.literal("")).refine((val) => {
      if (val === "" || val === undefined || val === null) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, "Please enter a valid email address"),
    phone: z.string().optional().or(z.literal("")).refine((val) => {
      if (val === "" || val === undefined || val === null) return true;
      return val.length >= 9;
    }, "Phone number must be at least 9 characters"),
  }).refine((data) => {
    // Ensure at least one of email or phone is provided
    return (data.email && data.email.trim() !== "") || (data.phone && data.phone.trim() !== "");
  }, {
    message: "At least one contact method (email or phone) is required",
    path: ["email"], // Show error on email field
  });
};

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

const ProfilePage = () => {
  const { user, updateClientUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Create schema based on user's login method
  const profileSchema = createProfileSchema();
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      imageUrl: user?.imageUrl || "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        imageUrl: user.imageUrl || "",
      });
    }
  }, [user, form]);

  // Fetch user profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const response = await api().get('/api/user/profile');
        return response.data.data;
      } catch (error: any) {
        // The API interceptor will handle 401 responses automatically
        return null;
      }
    },
    enabled: !!user,
    retry: false, // Don't retry on 401 errors
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Only send fields that are allowed by the backend
      const updateData: any = {};
      if (data.firstName && data.firstName.trim() !== "") updateData.firstName = data.firstName.trim();
      if (data.lastName && data.lastName.trim() !== "") updateData.lastName = data.lastName.trim();
      if (data.email && data.email.trim() !== "") updateData.email = data.email.trim();
      if (data.phone && data.phone.trim() !== "") updateData.phone = data.phone.trim();

      return api(true).put('/api/user/profile', updateData);
    },
    onSuccess: (response) => {
      // Update auth context with new user data on frontend
      if (response.data?.data) {
        updateClientUser(response.data.data.user);
      }
      
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      toast.error("Failed to update profile", {
        description: error.response?.data?.message || "An error occurred while updating your profile.",
      });
    },
  });

  // Update profile image mutation (independent of form)
  const updateImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      return api(true).put('/api/user/profile', { imageUrl });
    },
    onSuccess: (response, imageUrl) => { 
      // Update auth context with new imageUrl on frontend
      updateClientUser({ imageUrl: imageUrl || undefined });
      
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      toast.error("Failed to update profile picture", {
        description: error.response?.data?.message || "An error occurred while updating your profile picture.",
      });
    },
  });

  const handleImageChange = (name: string, url: string) => {
    setImageUrl(url);
    // Update the form value
    form.setValue('imageUrl', url);
    
    // Automatically save the image when it changes
    if (url) {
      updateImageMutation.mutate(url);
    } else {
      // Handle image removal
      updateImageMutation.mutate('');
    }
  };

  const handleSubmit = (data: ProfileFormData) => {
    // Only submit fields that have actual values (not empty strings)
    const submitData: any = {};
    
    if (data.firstName && data.firstName.trim() !== "") submitData.firstName = data.firstName.trim();
    if (data.lastName && data.lastName.trim() !== "") submitData.lastName = data.lastName.trim();
    if (data.email && data.email.trim() !== "") submitData.email = data.email.trim();
    if (data.phone && data.phone.trim() !== "") submitData.phone = data.phone.trim();
    
    // Only submit if we have at least one field to update
    if (Object.keys(submitData).length > 0) {
      updateProfileMutation.mutate(submitData);
    } else {
      toast.info("No changes to save", {
        description: "Please make changes to your profile before saving.",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setImageUrl(null);
    // Reset form to original values from auth context
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      imageUrl: user?.imageUrl || "",
    });
  };

  const currentImage = imageUrl || profileData?.user?.imageUrl || user?.imageUrl;
  const loginMethod = (user as any)?.authMethod;
  const userData = profileData?.user || user;
  const vehicles = profileData?.vehicles || [];
  const paymentMethods = profileData?.paymentMethods || [];
  const businesses = profileData?.businesses || [];
  const statistics = profileData?.statistics || {};
  const loginMethods = profileData?.loginMethods || [];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Profile Picture & Account Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <ImageUpload
                  name="profile-image"
                  label="Profile Picture"
                  currentImage={imageUrl || userData?.imageUrl}
                  onImageChange={handleImageChange}
                  isRequired={false}
                  classNames="w-48 h-48"
                  rounded={false}
                  uploadContext="user-profile"
                  entityId={user?.id}
                />
              </div>
              {updateImageMutation.isPending && (
                <div className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating profile picture...
                </div>
              )}
             
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Account Information</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  {userData?.userType || 'GUEST'}
                </Badge>
                <Badge variant={userData?.isVerified ? "default" : "destructive"} className="text-xs">
                  {userData?.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Member since {new Date(userData?.createdAt || Date.now()).toLocaleDateString()}
              </div>
              {userData?.role && (
                <div className="text-sm text-muted-foreground">
                  Role: <Badge variant="outline" className="text-xs">{userData.role}</Badge>
                </div>
              )}
              {loginMethods.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <div className="mb-2">Login methods:</div>
                  <div className="flex flex-wrap gap-1">
                    {loginMethods.map((method: string) => (
                      <Badge key={method} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Profile Details & Additional Info */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Information Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                  
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={updateProfileMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <User className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter your first name"
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter your last name"
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your email address"
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your phone number"
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <p className="text-lg">{userData?.firstName || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <p className="text-lg">{userData?.lastName || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email Address
                      </label>
                      <p className="text-lg">{userData?.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Phone Number
                      </label>
                      <p className="text-lg">{userData?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charging Statistics Section - Moved to 2nd row */}
          {statistics && Object.keys(statistics).length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Charging Statistics</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {statistics.totalSessions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Charging Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {statistics.totalKwh || 0} kWh
                    </div>
                    <div className="text-sm text-muted-foreground">Total Energy Charged</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {statistics.totalSpent || 0} RWF
                    </div>
                    <div className="text-sm text-muted-foreground">Total Money Spent</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicles Section */}
          {vehicles.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  My Vehicles
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your registered vehicles and license plates
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Car className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                          <Badge variant="secondary" className="text-xs">
                            {vehicle.kabisaId}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          VIN: {vehicle.vin || 'Not provided'}
                        </div>
                        {vehicle.licensePlates && vehicle.licensePlates.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {vehicle.licensePlates.map((plate: any) => (
                              <Badge 
                                key={plate.id} 
                                variant={plate.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {plate.licencePlateNumber}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Methods Section */}
          {paymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your saved payment methods and balances
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethods.map((method: any) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{method.paymentMethodType}</div>
                          <div className="text-sm text-muted-foreground">
                            {method.momoNumber || 'Card ending in ****'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs mb-1">Default</Badge>
                        )}
                        {method.balance !== undefined && (
                          <div className="text-sm font-medium">
                            {method.balance} {method.currency}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Associations Section */}
          {businesses.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Business Associations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Companies you're associated with
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businesses.map((business: any) => (
                    <div key={business.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{business.name}</div>
                          <div className="text-sm text-muted-foreground">
                            TIN: {business.tin}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {business.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 