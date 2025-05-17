
import React from 'react';
import { Button } from '@/components/ui/button';

const DemoSection = () => {
  return (
    <section id="demo" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">See It In Action</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience how your customers will interact with your AI agent
          </p>
        </div>
        
        <div className="flex justify-center">
          <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300">
            <div className="bg-primary p-4 text-white">
              <h3 className="font-medium">Customer Support Agent</h3>
            </div>
            <div className="p-4 space-y-4 h-80 overflow-y-auto">
              {/* Chat Messages */}
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="font-medium">User</p>
                  <p>How do I upgrade my subscription?</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3 ml-auto">
                  <p className="font-medium">AI Assistant</p>
                  <p>You can upgrade your subscription by going to Settings &gt; Plans. There you&apos;ll see all available plans and can choose the one that best fits your needs. Would you like me to guide you through the process?</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="font-medium">User</p>
                  <p>Yes, please!</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3 ml-auto">
                  <p className="font-medium">AI Assistant</p>
                  <p>Great! First, click on your profile icon in the top right corner. Then select &quot;Settings&quot; from the dropdown menu. In the settings page, click on the &quot;Plans&quot; tab. You&apos;ll see a comparison of all available plans. Once you&apos;ve selected a plan, click &quot;Upgrade&quot; and follow the payment instructions. Is there anything else you&apos;d like to know?</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Type your question..." className="flex-1 p-2 border rounded-md text-sm" disabled />
                <Button size="sm" disabled>Send</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
