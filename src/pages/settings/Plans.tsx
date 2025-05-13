
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";

const PlansSettings: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  const plans = [
    {
      name: "Hobby",
      priceMonthly: 40,
      priceYearly: 400,
      current: true,
      features: [
        "Access to advanced models",
        "2,000 message credits/month",
        "1 AI agent",
        "5 AI Actions per AI agent",
        "33 MB per AI agent",
        "Unlimited links to train on",
        "API access",
        "Integrations",
        "Basic analytics"
      ]
    },
    {
      name: "Standard",
      priceMonthly: 150,
      priceYearly: 1500,
      features: [
        "Everything in Hobby +",
        "12,000 message credits/month",
        "10 AI Actions per AI agent",
        "3 team members",
        "2 AI agents"
      ]
    },
    {
      name: "Pro",
      priceMonthly: 500,
      priceYearly: 5000,
      features: [
        "Everything in Standard +",
        "40,000 message credits/month",
        "15 AI Actions per AI agent",
        "5+ team members",
        "3-4 agents",
        "Advanced analytics"
      ]
    }
  ];
  
  const addonFeatures = [
    {
      title: "Auto recharge credits",
      description: "$14 per 1000 message credits",
      details: "When your credits falls below a certain threshold, we'll automatically add credits that don't expire to your account, ensuring uninterrupted service.",
      enabled: false
    },
    {
      title: "Extra message credits",
      description: "$12 per 1000 credits / month",
      details: "",
      enabled: false
    },
    {
      title: "Extra agents",
      description: "$7 per AI agent / month",
      details: "",
      enabled: false
    },
    {
      title: "Custom domains",
      description: "$59 / month",
      details: "Use your own custom domains for the AI agent's embed script, iframe, and shareable link.",
      enabled: false
    },
    {
      title: "Remove 'Powered By Chatbase'",
      description: "$39 / month",
      details: "Remove the Chatbase branding from the iframe and widget",
      enabled: true
    }
  ];

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            Hobby <span className="text-xs bg-black text-white px-2 py-1 rounded-full ml-2">Current Plan</span>
          </h2>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold">$19</span>
            <span className="text-gray-500 ml-2">Per Month</span>
          </div>
          <div>
            <Button variant="outline" size="sm">
              View Features
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost">Cancel plan</Button>
          </div>
        </div>
      </div>

      {/* Billing period toggle */}
      <div className="flex justify-end">
        <ToggleGroup 
          type="single" 
          value={billingPeriod} 
          onValueChange={(value) => value && setBillingPeriod(value as "monthly" | "yearly")} 
          className="border rounded-full p-1 bg-white"
        >
          <ToggleGroupItem value="monthly" className="rounded-full px-4">
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem value="yearly" className="rounded-full px-4">
            Yearly
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className="border bg-white">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-bold">
                    ${billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    per {billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>
              </div>
              
              <Button className="w-full" variant={plan.current ? "outline" : "default"}>
                {plan.current ? "Current Plan" : "Upgrade"}
              </Button>
              
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add-on features */}
      {addonFeatures.map((feature, index) => (
        <div key={index} className="border rounded-lg p-6 bg-white">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="font-bold text-lg">{feature.title}</h3>
              <p className="text-gray-700">{feature.description}</p>
              {feature.details && (
                <p className="text-sm text-gray-500 max-w-lg">{feature.details}</p>
              )}
            </div>
            <Switch checked={feature.enabled} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlansSettings;
