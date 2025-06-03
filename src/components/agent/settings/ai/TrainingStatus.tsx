
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react";
import { AISettings } from "@/hooks/useAISettings";

interface TrainingStatusProps {
  settings: AISettings | null;
}

export const TrainingStatus: React.FC<TrainingStatusProps> = ({ settings }) => {
  return (
    <div className="pt-4">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900">Training Status</CardTitle>
              <CardDescription className="text-blue-700">
                Monitor your agent's training progress and last update
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Last Training Session</div>
                <div className="text-gray-600">
                  {settings?.last_trained_at 
                    ? new Date(settings.last_trained_at).toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : "No training sessions yet"
                  }
                </div>
              </div>
              <div className="flex items-center">
                {settings?.last_trained_at ? (
                  <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Trained</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs">
                    <Clock className="h-3 w-3" />
                    <span>Pending</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>Auto-training:</strong> Training is automatically triggered when you save significant changes to AI settings. This ensures your agent uses the latest configuration.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
