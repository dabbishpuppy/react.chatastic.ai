
import React from "react";
import { Input } from "@/components/ui/input";

interface LeadFormFieldsProps {
  formData: {
    name: string;
    email: string;
    phone: string;
  };
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  namePlaceholder: string;
  emailPlaceholder: string;
  phonePlaceholder: string;
  onInputChange: (field: 'name' | 'email' | 'phone', value: string) => void;
  theme?: 'light' | 'dark';
}

const LeadFormFields: React.FC<LeadFormFieldsProps> = ({
  formData,
  collectName,
  collectEmail,
  collectPhone,
  namePlaceholder,
  emailPlaceholder,
  phonePlaceholder,
  onInputChange,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="space-y-3">
      {collectName && (
        <div>
          <Input
            type="text"
            placeholder={namePlaceholder}
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
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
            onChange={(e) => onInputChange('email', e.target.value)}
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
            onChange={(e) => onInputChange('phone', e.target.value)}
            className={`text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
          />
        </div>
      )}
    </div>
  );
};

export default LeadFormFields;
