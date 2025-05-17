
import React from 'react';
import { 
  Card, 
  CardContent,
} from '@/components/ui/card';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';

const TestimonialsSection = () => {
  return (
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
                      <p className="text-muted-foreground italic">&quot;We&apos;ve reduced our customer service response time by 75% since implementing this AI agent. Our team can now focus on complex issues while the AI handles routine questions.&quot;</p>
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
                      <p className="text-muted-foreground italic">&quot;The ability to train our AI on our specific product documentation has been game-changing. Our customers get accurate answers instantly, any time of day.&quot;</p>
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
                      <p className="text-muted-foreground italic">&quot;Setup was incredibly easy, and the customization options let us create an AI that truly represents our brand voice. Our conversion rate has increased by 30%.&quot;</p>
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
  );
};

export default TestimonialsSection;
