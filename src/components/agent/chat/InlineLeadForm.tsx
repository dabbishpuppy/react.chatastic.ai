
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInlineLeadForm } from "@/hooks/useInlineLeadForm";
import LeadFormFields from "./lead-form/LeadFormFields";

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
  const {
    formData,
    isSubmitting,
    formKey,
    handleInputChange,
    handleSubmit
  } = useInlineLeadForm({
    agentId,
    conversationId,
    collectName,
    collectEmail,
    collectPhone,
    onSubmit
  });

  const isDark = theme === 'dark';

  // Check if at least one field is enabled
  const hasAnyFields = collectName || collectEmail || collectPhone;

  // If no fields are enabled, don't render the form
  if (!hasAnyFields) {
    console.log('📋 No lead form fields enabled, hiding form');
    return null;
  }

  console.log('📋 Rendering lead form with fields (ENHANCED):', {
    collectName,
    collectEmail,
    collectPhone,
    hasAnyFields,
    formKey,
    title
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
            <LeadFormFields
              formData={formData}
              collectName={collectName}
              collectEmail={collectEmail}
              collectPhone={collectPhone}
              namePlaceholder={namePlaceholder}
              emailPlaceholder={emailPlaceholder}
              phonePlaceholder={phonePlaceholder}
              onInputChange={handleInputChange}
              theme={theme}
            />
            
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
