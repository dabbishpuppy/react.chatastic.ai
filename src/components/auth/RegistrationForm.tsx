
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/ui/PasswordInput";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

const RegistrationForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure your passwords match.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use current site URL for redirects instead of hardcoded URL
      const redirectTo = `${window.location.origin}/signin`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        }
      });
      
      if (error) throw error;
      
      // Registration successful - show confirmation message
      setEmailSent(true);
      
      // Don't navigate away yet - show the user instructions to check email
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account.",
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Verify your email</h2>
        <p className="text-gray-600 mb-6">
          We've sent a verification link to <strong>{email}</strong>.<br />
          Please check your inbox and click the link to verify your account.
        </p>
        <Alert className="mb-6 bg-blue-50">
          <AlertDescription className="text-blue-700">
            After verifying your email, you'll need to sign in again to continue setting up your account.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/signin")} variant="outline" className="w-full">
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">Get started for free</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium">
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <Button
          type="submit"
          className="w-full bg-black hover:bg-gray-800 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing up..." : "Sign up"}
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-black hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">OR CONTINUE WITH</span>
          </div>
        </div>
        
        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full border-gray-300 flex items-center justify-center space-x-2"
            onClick={() => toast.error("Google sign up is not implemented yet")}
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4ZM24 4C35.0457 4 44 12.9543 44 24C44 29.6325 42.0187 34.7927 38.6451 38.6451" stroke="#EA4335" strokeWidth="4" />
              <path d="M24 4C12.9543 4 4 12.9543 4 24C4 29.6325 5.98131 34.7927 9.35494 38.6451C13.2073 42.0187 18.3675 44 24 44" stroke="#4285F4" strokeWidth="4" />
              <path d="M24 4C35.0457 4 44 12.9543 44 24C44 35.0457 35.0457 44 24 44C18.3675 44 13.2073 42.0187 9.35494 38.6451" stroke="#34A853" strokeWidth="4" />
              <path d="M38.6451 9.35494C34.7927 5.98131 29.6325 4 24 4C18.3675 4 13.2073 5.98131 9.35494 9.35494C5.98131 13.2073 4 18.3675 4 24" stroke="#FBBC05" strokeWidth="4" />
            </svg>
            <span>Google</span>
          </Button>
        </div>
      </div>
      
      <p className="mt-6 text-xs text-center text-gray-600">
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
    </div>
  );
};

export default RegistrationForm;
