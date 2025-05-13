
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const integrations = [
  {
    name: "Zapier",
    description: "Connect with 5,000+ apps",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Zapier_logo.svg/1200px-Zapier_logo.svg.png",
  },
  {
    name: "Slack",
    description: "Connect with Slack channels",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Slack_Technologies_Logo.svg/2560px-Slack_Technologies_Logo.svg.png",
  },
  {
    name: "WordPress",
    description: "Use the official plugin for WordPress",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/98/WordPress_blue_logo.svg",
  },
  {
    name: "WhatsApp",
    description: "Connect with WhatsApp number",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
  },
  {
    name: "Messenger",
    description: "Connect with Facebook Messenger",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg",
  },
  {
    name: "Instagram",
    description: "Connect with Instagram",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg",
  },
  {
    name: "Shopify",
    description: "Connect with Shopify store",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg",
  },
  {
    name: "Webhooks",
    description: "Create custom webhooks",
    image: "https://cdn-icons-png.flaticon.com/512/25/25231.png",
  },
];

export const Embed: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embed</CardTitle>
          <CardDescription>Choose how to embed your agent on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id="chat-bubble"
                  name="embed-option"
                  defaultChecked
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="chat-bubble" className="font-medium">
                  Embed a chat bubble <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Recommended</span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Embed a chat bubble on your website. Allows you to use all the advanced features of the agent. Explore the <a href="#" className="text-blue-600 hover:underline">docs</a>.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id="iframe"
                  name="embed-option"
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="iframe" className="font-medium">
                  Embed the iframe directly
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Add the agent anywhere on your website
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuration</h3>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">On the site</h4>
              <p className="text-sm text-gray-500">www.example.com</p>
              
              <div className="relative border rounded-md bg-gray-50 p-4">
                <pre className="text-xs overflow-x-auto">
                  <code>
{`<script>
  (function(){if(!window.chatbase||window.chatbase("getState")=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[];}window.chatbase.q.push(arguments);};window.chatbase.d={};}})();
</script>`}
                  </code>
                </pre>
                <Button variant="outline" size="sm" className="absolute top-2 right-2">
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Share: React.FC = () => {
  const demoUrl = "https://www.example.com/chatbot-iframe/YOURUNIQUEID"
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Share</CardTitle>
          <CardDescription>Share your agent with others</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <h3 className="text-lg font-medium">www.example.com</h3>
          <p className="text-sm text-gray-500">
            To add the agent anywhere on your website, add this iframe to your html code
          </p>
          
          <div className="relative border rounded-md bg-gray-50 p-4">
            <Input 
              value={demoUrl}
              readOnly
              className="pr-24"
            />
            <div className="absolute inset-y-0 right-4 flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Copy
              </Button>
              <Button variant="outline" size="sm">
                Visit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
