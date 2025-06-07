
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkflowEngine } from '@/services/workflow/WorkflowEngine';
import { WorkflowEvent } from '@/services/workflow/types';
import { Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface WorkflowEventTimelineProps {
  sourceId: string;
}

const WorkflowEventTimeline: React.FC<WorkflowEventTimelineProps> = ({ sourceId }) => {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const workflowEvents = await WorkflowEngine.getWorkflowEvents(sourceId);
        setEvents(workflowEvents);
      } catch (error) {
        console.error('Error fetching workflow events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [sourceId]);

  const getEventIcon = (eventType: string, toStatus: string) => {
    if (eventType.includes('FAILED') || toStatus === 'ERROR') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (eventType.includes('COMPLETED') || toStatus === 'COMPLETED' || toStatus === 'TRAINED') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (eventType.includes('STARTED') || toStatus === 'CRAWLING' || toStatus === 'TRAINING') {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getEventBadge = (toStatus: string) => {
    const statusColors: Record<string, string> = {
      'CREATED': 'bg-gray-100 text-gray-800',
      'CRAWLING': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'TRAINING': 'bg-purple-100 text-purple-800',
      'TRAINED': 'bg-green-100 text-green-800',
      'ERROR': 'bg-red-100 text-red-800',
      'PENDING_REMOVAL': 'bg-orange-100 text-orange-800',
      'REMOVED': 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={statusColors[toStatus] || 'bg-gray-100 text-gray-800'}>
        {toStatus}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading events...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Timeline</CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No workflow events found</p>
            ) : (
              events.map((event, index) => (
                <div key={event.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.event_type, event.to_status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      {getEventBadge(event.to_status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {event.from_status && (
                        <span>Changed from {event.from_status} to {event.to_status}</span>
                      )}
                      {!event.from_status && (
                        <span>Status set to {event.to_status}</span>
                      )}
                    </p>
                    
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WorkflowEventTimeline;
