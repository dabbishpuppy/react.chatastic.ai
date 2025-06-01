
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Alert {
  id: string;
  type: 'performance' | 'security' | 'system' | 'data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  createdAt: string;
  isAcknowledged: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ 
  alerts, 
  onAcknowledge, 
  onDismiss 
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.isAcknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.isAcknowledged);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Active Alerts
          {unacknowledgedAlerts.length > 0 && (
            <Badge variant="destructive">
              {unacknowledgedAlerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          <>
            {/* Unacknowledged Alerts */}
            {unacknowledgedAlerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Unacknowledged</h4>
                {unacknowledgedAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm">{alert.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {alert.source}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {onAcknowledge && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => onAcknowledge(alert.id)}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        {onDismiss && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => onDismiss(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Acknowledged Alerts */}
            {acknowledgedAlerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Acknowledged ({acknowledgedAlerts.length})
                </h4>
                {acknowledgedAlerts.slice(0, 3).map((alert) => (
                  <div 
                    key={alert.id} 
                    className="p-2 rounded border border-gray-200 opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-sm">{alert.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
