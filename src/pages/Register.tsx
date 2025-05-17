
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, Mail, WifiOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define form schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type FormValues = z.infer<typeof formSchema>;

const Register = () => {
  const { signUp, networkAvailable } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setNetworkError(null);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setNetworkError("You are currently offline. Please check your internet connection.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset network error when the user makes changes to the form
  useEffect(() => {
    const subscription = form.watch(() => {
      if (networkError) {
        setNetworkError(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, networkError]);

  const onSubmit = async (values: FormValues) => {
    // Clear previous network errors
    setNetworkError(null);
    
    if (isOffline) {
      setNetworkError("You are currently offline. Please check your internet connection.");
      return;
    }
    
    try {
      setIsLoading(true);
      await signUp(values.email, values.password);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Check for network-related errors
      if (!navigator.onLine || error.message?.includes("Network") || error.message?.includes("network") || error.message === "Failed to fetch") {
        setNetworkError(error.message || "Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Network status indicator component
  const NetworkStatusIndicator = () => {
    if (networkAvailable && !networkError) return null;
    
    return (
      <Alert variant="destructive" className="mb-4 bg-red-500 text-white border-red-600">
        <AlertDescription className="flex items-center gap-2">
          {isOffline ? <WifiOff size={16} /> : <AlertCircle size={16} />}
          {networkError || "Network error. Please check your internet connection and try again."}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Get started for free</h2>
        </div>

        <NetworkStatusIndicator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Email
                </label>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
                  Password
                </label>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-1">
                  Confirm Password
                </label>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white py-2 rounded-md"
              disabled={isLoading || isOffline}
            >
              {isLoading ? "Signing up..." : "Sign up"}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/signin" className="font-medium text-black hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">OR CONTINUE WITH</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full border border-gray-300 py-2 flex items-center justify-center space-x-2"
              onClick={() => {
                if (isOffline) {
                  setNetworkError("You are currently offline. Please check your internet connection.");
                  return;
                }
                
                toast({
                  title: "Google Sign in",
                  description: "Google authentication is not yet implemented."
                });
              }}
            >
              <Mail size={18} />
              <span>Google</span>
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to our{" "}
              <a href="#" className="underline hover:text-black">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-black">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Register;
