
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InlineLeadFormProps {
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
  theme?: 'light' | 'dark';
}

const InlineLeadForm: React.FC<InlineLeadFormProps> = ({
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
  theme = 'light'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0); // Force re-render key

  // Reset form data and force re-render when field visibility changes
  useEffect(() => {
    console.log('🔄 InlineLeadForm: Field settings changed', {
      collectName,
      collectEmail,
      collectPhone,
      title
    });
    
    // Reset form data based on enabled fields
    setFormData(prev => ({
      name: collectName ? prev.name : '',
      email: collectEmail ? prev.email : '',
      phone: collectPhone ? prev.phone : ''
    }));
    
    // Force component re-render
    setFormKey(prev => prev + 1);
  }, [collectName, collectEmail, collectPhone, title, namePlaceholder, emailPlaceholder, phonePlaceholder]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendNotificationEmail = async (leadData: any) => {
    try {
      // Call the edge function to send notification email
      const { error } = await supabase.functions.invoke('send-lead-notification', {
        body: { 
          agentId,
          leadData,
          conversationId 
        }
      });

      if (error) {
        console.error('Error sending notification email:', error);
      } else {
        console.log('Notification email sent successfully');
      }
    } catch (error) {
      console.error('Error calling notification function:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields only if they are enabled
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

      // Send notification email
      await sendNotificationEmail(leadData);

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

  // Check if at least one field is enabled
  const hasAnyFields = collectName || collectEmail || collectPhone;

  // If no fields are enabled, don't render the form
  if (!hasAnyFields) {
    console.log('🚫 InlineLeadForm: No fields enabled, not rendering');
    return null;
  }

  console.log('📋 InlineLeadForm: Rendering with current settings:', {
    collectName,
    collectEmail,
    collectPhone,
    title,
    hasAnyFields,
    formKey
  });

  return (
    <div className="my-4" key={formKey}>
      <Card className={`max-w-md mx-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {collectName && (
              <div>
                <Input
                  type="text"
                  placeholder={namePlaceholder}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
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
                  className={`text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
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
                  className={`text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1 text-sm"
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

export default InlineLeadForm;
