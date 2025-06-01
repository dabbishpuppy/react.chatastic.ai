
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  description,
  error,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className={error ? 'text-red-600' : ''}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
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

export default FormInput;
