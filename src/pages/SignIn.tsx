
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/use-toast";
import Logo from "@/components/layout/Logo";
import { useIsMobile } from "@/hooks/use-mobile";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      console.log("Login attempted:", { email });
      toast({
        title: "Login successful!",
        description: "Welcome back.",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex justify-center md:justify-start">
            <Link to="/">
              <Logo size={isMobile ? 'sm' : 'md'} />
            </Link>
          </div>
        </header>
        
        <main className="flex justify-center items-center py-8">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Welcome Back</h1>
            
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
                />
              </div>
              
              <div className="flex justify-end">
                <Link to="/" className="text-sm text-gray-600 hover:text-black hover:underline">
                  Forgot password?
                </Link>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link to="/" className="font-medium text-black hover:underline">
                  Sign up
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
        </main>
      </div>
    </div>
  );
};

export default SignIn;
