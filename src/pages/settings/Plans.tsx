
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const PlansSettings = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      current: true,
      features: [
        "Up to 3 agents",
        "1,000 messages/month",
        "Basic analytics",
        "Email support"
      ]
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      current: false,
      features: [
        "Unlimited agents",
        "50,000 messages/month",
        "Advanced analytics",
        "Priority support",
        "Custom domains",
        "API access"
      ]
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      current: false,
      features: [
        "Everything in Pro",
        "Unlimited messages",
        "White-label solution",
        "Dedicated support",
        "SLA guarantee",
        "Custom integrations"
      ]
    }
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-2xl font-bold mb-6">Plans & Billing</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${plan.current ? 'border-blue-500' : ''}`}>
            {plan.current && (
              <Badge className="absolute -top-2 left-4 bg-blue-500">
                Current Plan
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <div className="text-right">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={plan.current ? "outline" : "default"}
                disabled={plan.current}
              >
                {plan.current ? "Current Plan" : "Upgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlansSettings;
