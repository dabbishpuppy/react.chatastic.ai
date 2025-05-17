
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

const HeroSection = () => {
  const isMobile = useIsMobile();

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 animate-[fade-in_0.6s_ease-out]">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tighter">
              Your AI Agent, <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Perfectly Trained</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Build, train, and deploy AI agents customized for your business needs in minutes, not months.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Train Your Bot <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <Link to="#demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See Demo <Play className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative animate-[fade-in_1s_ease-out]">
            <div className="aspect-video relative rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531297484001-80022131f5a1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2400&h=1600&q=80')] bg-cover opacity-50"></div>
              <div className="relative z-10 h-full flex flex-col justify-center items-center">
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                  <h3 className="text-lg font-semibold text-primary">Intelligent Conversations</h3>
                  <p className="text-sm text-muted-foreground">Your AI agent understands context and provides helpful responses.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:block absolute -z-10 top-0 left-1/3 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="hidden md:block absolute -z-10 bottom-0 right-1/3 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
    </section>
  );
};

export default HeroSection;
