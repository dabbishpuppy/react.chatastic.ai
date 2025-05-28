
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
}

interface UseInlineLeadFormProps {
  agentId: string;
  conversationId?: string;
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  onSubmit: () => void;
}

export const useInlineLeadForm = ({
  agentId,
  conversationId,
  collectName,
  collectEmail,
  collectPhone,
  onSubmit
}: UseInlineLeadFormProps) => {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Enhanced reactivity to settings changes
  useEffect(() => {
    console.log('📋 Lead form settings changed (ENHANCED):', {
      collectName,
      collectEmail,
      collectPhone
    });
    
    // Clear form data when field visibility changes
    setFormData(prev => ({
      name: collectName ? prev.name : '',
      email: collectEmail ? prev.email : '',
      phone: collectPhone ? prev.phone : ''
    }));
    
    // Force re-render to ensure UI updates immediately
    setFormKey(prev => prev + 1);
  }, [collectName, collectEmail, collectPhone]);

  const handleInputChange = (field: keyof LeadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendNotificationEmail = async (leadData: any) => {
    try {
      console.log('📧 Sending notification email for lead:', leadData);
      const { data, error } = await supabase.functions.invoke('send-lead-notification', {
        body: { 
          agentId,
          leadData,
          conversationId 
        }
      });

      if (error) {
        console.error('Error sending notification email:', error);
      } else {
        console.log('📧 Notification email sent successfully:', data);
      }
    } catch (error) {
      console.error('Error calling notification function:', error);
    }
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

      console.log('📋 Submitting lead data:', leadData);

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

  return {
    formData,
    isSubmitting,
    formKey,
    handleInputChange,
    handleSubmit
  };
};
