
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FormTextareaProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  error?: string;
  rows?: number;
  className?: string;
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  required = false,
  description,
  error,
  rows = 4,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className={error ? 'text-red-600' : ''}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        className={error ? 'border-red-500 focus:border-red-500' : ''}
      />
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormTextarea;
