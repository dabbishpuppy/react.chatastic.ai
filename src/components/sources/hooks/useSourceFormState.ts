
import { useState } from 'react';

interface FormErrors {
  [key: string]: string;
}

interface UseSourceFormStateProps {
  initialValues: Record<string, any>;
  validationRules?: Record<string, (value: any) => string | null>;
}

export const useSourceFormState = ({ 
  initialValues, 
  validationRules = {} 
}: UseSourceFormStateProps) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateField = (field: string, value: any): string | null => {
    const rule = validationRules[field];
    return rule ? rule(value) : null;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    validateField,
    validateForm,
    resetForm,
    setIsSubmitting
  };
};
