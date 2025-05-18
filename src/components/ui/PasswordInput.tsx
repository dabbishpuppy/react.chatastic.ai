
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  id: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;  // Added the disabled prop
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  placeholder = "Password",
  onChange,
  value,
  required = false,
  className = "",
  disabled = false,  // Added default value
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative w-full">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        onChange={onChange}
        value={value}
        required={required}
        disabled={disabled}  // Pass it to the Input component
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
        tabIndex={-1}
        aria-label={showPassword ? "Hide password" : "Show password"}
        disabled={disabled}  // Also disable the toggle button when input is disabled
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
