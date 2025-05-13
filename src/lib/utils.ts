
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
