
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

const UseCasesSection = () => {
  return (
    <section id="use-cases" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Perfect For Every Industry</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how businesses across industries are leveraging our AI agents
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* E-Commerce */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle>E-Commerce</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Boost sales with 24/7 product recommendations and support</p>
            </CardContent>
          </Card>
          
          {/* SaaS */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle>SaaS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Improve user onboarding and reduce support ticket volume</p>
            </CardContent>
          </Card>
          
          {/* Healthcare */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle>Healthcare</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Streamline patient intake and provide information securely</p>
            </CardContent>
          </Card>
          
          {/* Education */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Create interactive learning experiences and answer student queries</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
