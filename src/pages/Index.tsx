import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const Index = () => {
  const isMobile = useIsMobile();
  const [annualBilling, setAnnualBilling] = useState(true);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size={isMobile ? 'sm' : 'md'} />
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link to="#use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Demo</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/dashboard">
                <Button variant="default" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex flex-col">
        {/* Hero Section */}
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
        
        {/* How It Works / Features Section */}
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
        
        {/* Use Cases */}
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
        
        {/* Demo / Chat Preview */}
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
                      <p>You can upgrade your subscription by going to Settings > Plans. There you'll see all available plans and can choose the one that best fits your needs. Would you like me to guide you through the process?</p>
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
                      <p>Great! First, click on your profile icon in the top right corner. Then select "Settings" from the dropdown menu. In the settings page, click on the "Plans" tab. You'll see a comparison of all available plans. Once you've selected a plan, click "Upgrade" and follow the payment instructions. Is there anything else you'd like to know?</p>
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
        
        {/* Testimonials */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Trusted By Innovative Teams</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See what our customers have to say about their experience
              </p>
            </div>
            
            <Carousel className="w-full max-w-4xl mx-auto">
              <CarouselContent>
                {/* Testimonial 1 */}
                <CarouselItem>
                  <div className="p-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                          <p className="text-muted-foreground italic">"We've reduced our customer service response time by 75% since implementing this AI agent. Our team can now focus on complex issues while the AI handles routine questions."</p>
                          <div>
                            <p className="font-semibold">Sarah Johnson</p>
                            <p className="text-sm text-muted-foreground">Customer Success Manager, TechCorp</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
                
                {/* Testimonial 2 */}
                <CarouselItem>
                  <div className="p-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                          <p className="text-muted-foreground italic">"The ability to train our AI on our specific product documentation has been game-changing. Our customers get accurate answers instantly, any time of day."</p>
                          <div>
                            <p className="font-semibold">Mark Rodriguez</p>
                            <p className="text-sm text-muted-foreground">Director of Digital, InnovateCo</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
                
                {/* Testimonial 3 */}
                <CarouselItem>
                  <div className="p-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                          <p className="text-muted-foreground italic">"Setup was incredibly easy, and the customization options let us create an AI that truly represents our brand voice. Our conversion rate has increased by 30%."</p>
                          <div>
                            <p className="font-semibold">Emily Chen</p>
                            <p className="text-sm text-muted-foreground">E-Commerce Director, StyleBrand</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <div className="flex justify-center mt-4 gap-2">
                <CarouselPrevious className="static transform-none" />
                <CarouselNext className="static transform-none" />
              </div>
            </Carousel>
            
            {/* Client Logos */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-70">
              {/* These would be replaced with actual client logos */}
              <div className="h-8 w-24 bg-gray-300 rounded"></div>
              <div className="h-8 w-24 bg-gray-300 rounded"></div>
              <div className="h-8 w-24 bg-gray-300 rounded"></div>
              <div className="h-8 w-24 bg-gray-300 rounded"></div>
              <div className="h-8 w-24 bg-gray-300 rounded"></div>
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that&apos;s right for your business
              </p>
              
              <div className="flex items-center justify-center mt-8">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${!annualBilling ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Monthly</span>
                  <button 
                    onClick={() => setAnnualBilling(!annualBilling)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${annualBilling ? 'bg-primary' : 'bg-input'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${annualBilling ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm ${annualBilling ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Annual (20% off)</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>For individuals and small projects</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${annualBilling ? '19' : '24'}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>1 AI Agent</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>500 conversations/month</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Basic customization</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Email support</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-6">Get Started</Button>
                </CardContent>
              </Card>
              
              {/* Pro Plan */}
              <Card className="border-primary hover:shadow-lg transition-all duration-300 relative">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs rounded-bl-lg rounded-tr-lg font-medium">
                  POPULAR
                </div>
                <CardHeader>
                  <CardTitle>Professional</CardTitle>
                  <CardDescription>For growing businesses</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${annualBilling ? '49' : '59'}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>3 AI Agents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>2,000 conversations/month</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Advanced customization</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Analytics dashboard</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-6">Get Started</Button>
                </CardContent>
              </Card>
              
              {/* Enterprise Plan */}
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>For large organizations</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">Custom</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Unlimited AI Agents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Unlimited conversations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Custom integrations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Dedicated account manager</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>SLA & premium support</span>
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full mt-6">Contact Sales</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Final CTA Section */}
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
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Guides</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Partners</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
                <li><Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <Separator className="my-8" />
          
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <Logo size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} QuerySpark. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
