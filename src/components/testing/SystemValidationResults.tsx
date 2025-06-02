
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

interface ValidationResults {
  success: boolean;
  message: string;
  details: {
    importExports: boolean;
    functionality: boolean;
    performance: boolean;
    integration: boolean;
  };
}

interface SystemValidationResultsProps {
  validationResults: ValidationResults;
}

export const SystemValidationResults: React.FC<SystemValidationResultsProps> = ({
  validationResults
}) => {
  const getTestStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {validationResults.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          System Validation Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-gray-50">
          <p className={validationResults.success ? 'text-green-700' : 'text-red-700'}>
            {validationResults.message}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            {getTestStatusIcon(validationResults.details.importExports)}
            <span>Import/Export Chains</span>
          </div>
          <div className="flex items-center gap-2">
            {getTestStatusIcon(validationResults.details.functionality)}
            <span>Core Functionality</span>
          </div>
          <div className="flex items-center gap-2">
            {getTestStatusIcon(validationResults.details.performance)}
            <span>Performance Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            {getTestStatusIcon(validationResults.details.integration)}
            <span>Service Integration</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
