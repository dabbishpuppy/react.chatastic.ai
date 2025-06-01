
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface BaseSourceFormProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  className?: string;
}

const BaseSourceForm: React.FC<BaseSourceFormProps> = ({
  title,
  description,
  children,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Submit',
  className = ''
}) => {
  return (
    <Card className={`border border-gray-200 ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Processing...' : submitButtonText}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BaseSourceForm;
