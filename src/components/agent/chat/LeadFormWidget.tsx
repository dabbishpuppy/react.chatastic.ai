
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LeadFormWidgetProps {
  agentId: string;
  conversationId?: string;
  title: string;
  collectName: boolean;
  namePlaceholder: string;
  collectEmail: boolean;
  emailPlaceholder: string;
  collectPhone: boolean;
  phonePlaceholder: string;
  onSubmit: () => void;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

const LeadFormWidget: React.FC<LeadFormWidgetProps> = ({
  agentId,
  conversationId,
  title,
  collectName,
  namePlaceholder,
  collectEmail,
  emailPlaceholder,
  collectPhone,
  phonePlaceholder,
  onSubmit,
  onClose,
  theme = 'light'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (collectEmail && !formData.email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const leadData = {
        agent_id: agentId,
        conversation_id: conversationId,
        name: collectName ? formData.name || null : null,
        email: collectEmail ? formData.email || null : null,
        phone: collectPhone ? formData.phone || null : null
      };

      // Insert lead into database
      const { error } = await supabase
        .from('leads')
        .insert([leadData]);

      if (error) {
        console.error('Error submitting lead:', error);
        toast({
          title: "Submission failed",
          description: "There was an error submitting your information. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Send email notification - don't block on this
      try {
        console.log('📧 Triggering lead notification email for agent:', agentId);
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            agentId,
            leadData,
            conversationId
          }
        });
        console.log('📧 Lead notification triggered successfully');
      } catch (emailError) {
        // Log the error but don't fail the lead submission
        console.error('Email notification failed (non-blocking):', emailError);
      }

      toast({
        title: "Thank you!",
        description: "Your information has been submitted successfully."
      });

      onSubmit();
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-md ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={`absolute right-2 top-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <X size={16} />
          </Button>
          <CardTitle className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {collectName && (
              <div>
                <Input
                  type="text"
                  placeholder={namePlaceholder}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            )}
            
            {collectEmail && (
              <div>
                <Input
                  type="email"
                  placeholder={emailPlaceholder}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            )}
            
            {collectPhone && (
              <div>
                <Input
                  type="tel"
                  placeholder={phonePlaceholder}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Skip
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFormWidget;
