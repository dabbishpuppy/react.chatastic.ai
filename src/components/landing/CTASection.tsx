
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-r from-primary/95 to-blue-600/95 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Customer Experience?</h2>
        <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
          Join thousands of businesses using our platform to deliver exceptional AI-powered support
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
            Get Started Free <ArrowRight className="ml-2" />
          </Button>
          <Button size="lg" variant="secondary">
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
