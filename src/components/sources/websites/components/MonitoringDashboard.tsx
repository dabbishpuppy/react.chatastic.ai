
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, Users, Zap } from 'lucide-react';
import { MetricsCollectionService } from '@/services/rag/enhanced/metricsCollectionService';
import { AlertingService } from '@/services/rag/enhanced/alertingService';
import { PerformanceMonitoringService } from '@/services/rag/enhanced/performanceMonitoringService';

interface MonitoringDashboardProps {
  className?: string;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ className }) => {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [performanceReport, setPerformanceReport] = useState<any>(null);

  useEffect(() => {
    // Initialize monitoring services
    const initializeMonitoring = async () => {
      await PerformanceMonitoringService.startMonitoring();
    };

    initializeMonitoring();

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      updateDashboardData();
    }, 10000); // Update every 10 seconds

    // Initial data load
    updateDashboardData();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const updateDashboardData = async () => {
    try {
      const status = PerformanceMonitoringService.getSystemStatus();
      const metrics = MetricsCollectionService.getCurrentMetrics();
      const alerts = AlertingService.getActiveAlerts();
      const report = await PerformanceMonitoringService.generatePerformanceReport(1);

      setSystemStatus(status);
      setCurrentMetrics(metrics);
      setActiveAlerts(alerts);
      setPerformanceReport(report);
    } catch (error) {
      console.error('Error updating dashboard data:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!systemStatus || !currentMetrics) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Loading monitoring dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(systemStatus.status)}
              <div>
                <p className="text-sm font-medium">System Status</p>
                <p className="text-lg capitalize">{systemStatus.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Health Score</p>
                <p className="text-lg">{systemStatus.healthScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Active Alerts</p>
                <p className="text-lg">{systemStatus.activeAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Critical Alerts</p>
                <p className="text-lg">{systemStatus.criticalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics.system?.cpuUsage?.toFixed(1) || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.system?.cpuUsage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics.system?.memoryUsage?.toFixed(1) || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.system?.memoryUsage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Disk Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics.system?.diskUsage?.toFixed(1) || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.system?.diskUsage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Queue Length</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentMetrics.system?.queueLength || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pending jobs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Crawl Metrics */}
          {currentMetrics.crawl && (
            <Card>
              <CardHeader>
                <CardTitle>Crawl Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentMetrics.crawl.totalJobs}</div>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentMetrics.crawl.completedJobs}</div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentMetrics.crawl.averageProcessingTime}ms</div>
                    <p className="text-sm text-muted-foreground">Avg Processing</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentMetrics.crawl.queueHealth}%</div>
                    <p className="text-sm text-muted-foreground">Queue Health</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active Alerts</h3>
            <Button variant="outline" size="sm" onClick={updateDashboardData}>
              Refresh
            </Button>
          </div>

          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No Active Alerts</p>
                <p className="text-muted-foreground">All systems are operating normally</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`w-3 h-3 rounded-full mt-1 ${getSeverityColor(alert.severity)}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => AlertingService.acknowledgeAlert(alert.id, 'dashboard-user')}
                        >
                          Acknowledge
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => AlertingService.resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceReport && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jobs Processed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceReport.crawlPerformance.totalJobsProcessed}
                    </div>
                    <p className="text-xs text-muted-foreground">Last hour</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceReport.crawlPerformance.successRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Job completion rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Throughput</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceReport.crawlPerformance.throughput.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">Jobs per hour</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {performanceReport.recommendations.map((recommendation: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {performanceReport?.customerMetrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div className="text-2xl font-bold">
                        {performanceReport.customerMetrics.activeCustomers}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Avg Jobs/Customer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceReport.customerMetrics.averageJobsPerCustomer.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Data Processed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceReport.crawlPerformance.totalJobsProcessed}
                    </div>
                    <p className="text-xs text-muted-foreground">Jobs in last hour</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceReport.customerMetrics.topPerformingCustomers.slice(0, 5).map((customer: any, index: number) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{customer.customerId.substring(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.jobsCompleted} jobs completed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{customer.successRate.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Success rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
