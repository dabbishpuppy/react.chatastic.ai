
import React from 'react';

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deploy your custom AI agent in three simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-[fade-in_0.4s_ease-out]">
            <div className="rounded-full bg-blue-100 w-12 h-12 flex items-center justify-center mb-6">
              <span className="font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-bold mb-4">Connect Your Data</h3>
            <p className="text-muted-foreground">
              Upload documents, connect to your website, or integrate with your knowledge base to train your AI.
            </p>
          </div>
          
          {/* Step 2 */}
          <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-[fade-in_0.6s_ease-out]">
            <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mb-6">
              <span className="font-bold text-green-600">2</span>
            </div>
            <h3 className="text-xl font-bold mb-4">Train & Customize</h3>
            <p className="text-muted-foreground">
              Fine-tune your AI&apos;s knowledge, tone, and responses to match your brand and business needs.
            </p>
          </div>
          
          {/* Step 3 */}
          <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-[fade-in_0.8s_ease-out]">
            <div className="rounded-full bg-purple-100 w-12 h-12 flex items-center justify-center mb-6">
              <span className="font-bold text-purple-600">3</span>
            </div>
            <h3 className="text-xl font-bold mb-4">Deploy & Integrate</h3>
            <p className="text-muted-foreground">
              Add your AI agent to your website, embed in apps, or connect to messaging platforms in one click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
