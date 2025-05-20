
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronUp, ChevronDown, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const PlansSettings: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showExtraAgentsDialog, setShowExtraAgentsDialog] = useState(false);
  const [showExtraCreditsDialog, setShowExtraCreditsDialog] = useState(false);
  const [extraAgentsCount, setExtraAgentsCount] = useState(1);
  
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
      id: "auto-recharge",
      title: "Auto recharge credits",
      description: "$14 per 1000 message credits",
      details: "When your credits falls below a certain threshold, we'll automatically add credits that don't expire to your account, ensuring uninterrupted service.",
      enabled: false
    },
    {
      id: "extra-credits",
      title: "Extra message credits",
      description: "$12 per 1000 credits / month",
      details: "",
      enabled: false
    },
    {
      id: "extra-agents",
      title: "Extra agents",
      description: "$7 per AI agent / month",
      details: "",
      enabled: false
    },
    {
      id: "custom-domains",
      title: "Custom domains",
      description: "$59 / month",
      details: "Use your own custom domains for the AI agent's embed script, iframe, and shareable link.",
      enabled: false
    },
    {
      id: "remove-branding",
      title: "Remove 'Powered By Chatbase'",
      description: "$39 / month",
      details: "Remove the Chatbase branding from the iframe and widget",
      enabled: true
    }
  ];

  const handleUpgrade = () => {
    toast({
      title: "Subscription upgraded",
      description: "You've been upgraded to the Standard plan",
    });
    setShowUpgradeDialog(false);
  };

  const handleBuyExtraAgents = () => {
    toast({
      title: "Purchase successful",
      description: `You've purchased ${extraAgentsCount} extra agent(s)`,
    });
    setShowExtraAgentsDialog(false);
  };

  const handleBuyExtraCredits = () => {
    toast({
      title: "Purchase successful",
      description: "You've purchased extra message credits",
    });
    setShowExtraCreditsDialog(false);
  };

  const handleToggleFeature = (feature: typeof addonFeatures[0]) => {
    if (feature.id === "extra-agents") {
      setShowExtraAgentsDialog(true);
    } else if (feature.id === "extra-credits") {
      setShowExtraCreditsDialog(true);
    } else {
      toast({
        title: feature.enabled ? "Feature disabled" : "Feature enabled",
        description: `${feature.title} has been ${feature.enabled ? "disabled" : "enabled"}`,
      });
    }
  };

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
              
              <Button 
                className="w-full" 
                variant={plan.current ? "outline" : "default"}
                onClick={() => plan.current ? null : setShowUpgradeDialog(true)}
              >
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
            <Switch 
              checked={feature.enabled} 
              onCheckedChange={() => handleToggleFeature(feature)}
            />
          </div>
        </div>
      ))}

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Upgrade subscription</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              By clicking <strong>Upgrade</strong>, you will subscribe to the <strong>Standard</strong> plan for <strong>$150/month</strong>.
            </p>
            <p className="mb-4">
              Your credit card will be charged <strong>$81.63</strong> immediately for the remaining days in your billing cycle.
            </p>
            
            <div className="flex justify-between py-4 border-t border-gray-200">
              <span className="font-medium">Standard plan</span>
              <span className="font-medium">$150/month</span>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpgrade} className="bg-black hover:bg-gray-800">
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extra Agents Dialog */}
      <Dialog open={showExtraAgentsDialog} onOpenChange={setShowExtraAgentsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Extra agents</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 mb-6">
              <p>I want to buy</p>
              <div className="w-20 relative">
                <Input 
                  type="number"
                  value={extraAgentsCount}
                  onChange={(e) => setExtraAgentsCount(parseInt(e.target.value) || 1)}
                  min={1}
                  className="text-center pr-8"
                />
                <div className="absolute right-1 top-0 h-full flex flex-col">
                  <button 
                    className="flex-1 flex items-center px-1"
                    onClick={() => setExtraAgentsCount(prev => prev + 1)}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    className="flex-1 flex items-center px-1"
                    onClick={() => setExtraAgentsCount(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
              <p>extra agents</p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Note: you will be immediately charged a prorated amount for the remaining days.
            </p>
            
            <div className="py-4 border-t border-gray-200">
              <div className="text-xl font-bold">$7</div>
              <div className="text-sm text-gray-600">Total per month</div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleBuyExtraAgents} className="bg-black hover:bg-gray-800">
              Buy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extra Credits Dialog */}
      <Dialog open={showExtraCreditsDialog} onOpenChange={setShowExtraCreditsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Extra message credits</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Add 1,000 additional message credits to your plan for $12 per month.
            </p>
            
            <p className="text-sm text-gray-600 mb-6">
              Note: you will be immediately charged a prorated amount for the remaining days.
            </p>
            
            <div className="py-4 border-t border-gray-200">
              <div className="text-xl font-bold">$12</div>
              <div className="text-sm text-gray-600">Total per month</div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleBuyExtraCredits} className="bg-black hover:bg-gray-800">
              Buy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlansSettings;
