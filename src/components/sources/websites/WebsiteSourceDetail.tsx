
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import WebsiteChildSources from './components/WebsiteChildSources';
import { WebsiteSourceMetadata } from './components/WebsiteSourceMetadata';
import ManualJobProcessor from './components/ManualJobProcessor';
import CrawlDiagnostics from './components/CrawlDiagnostics';
import AutoRecoverySystem from './components/AutoRecoverySystem';
import { fetchMaybeSingle } from '@/utils/safeSupabaseQueries';
import { AgentSource } from '@/types/rag';

const WebsiteSourceDetail: React.FC = () => {
  const { sourceId, agentId } = useParams<{ sourceId: string; agentId: string }>();
  const navigate = useNavigate();

  const { data: source, isLoading, error } = useQuery({
    queryKey: ['website-source', sourceId],
    queryFn: async () => {
      if (!sourceId) return null;
      
      const data = await fetchMaybeSingle(
        supabase
          .from('agent_sources')
          .select('*')
          .eq('id', sourceId)
          .eq('source_type', 'website'),
        `WebsiteSourceDetail(${sourceId})`
      );
      
      return data as AgentSource | null;
    },
    enabled: !!sourceId
  });

  const { data: childSources } = useQuery({
    queryKey: ['website-child-sources', sourceId],
    queryFn: async () => {
      if (!sourceId) return [];
      
      const { data, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', sourceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching child sources:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!sourceId
  });

  const handleBack = () => {
    navigate(`/agent/${agentId}/sources?tab=website`);
  };

  const openUrl = () => {
    if (source?.url) {
      window.open(source.url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load website source details.</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sources
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{source.title}</h1>
            {source.url && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={openUrl}
                className="p-2"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
          {source.url && (
            <p className="text-gray-600 mt-1">{source.url}</p>
          )}
        </div>
      </div>

      {/* Diagnostics and Recovery Systems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrawlDiagnostics parentSourceId={sourceId!} />
        <AutoRecoverySystem parentSourceId={sourceId!} />
      </div>

      {/* Manual Job Processor */}
      <ManualJobProcessor parentSourceId={sourceId!} />

      {/* Website Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteSourceMetadata 
            source={source} 
            childSources={[]} 
            status={source.crawl_status || 'pending'} 
          />
        </CardContent>
      </Card>

      {/* Child Sources */}
      <WebsiteChildSources 
        parentSourceId={sourceId!} 
        onEdit={() => {}}
        onExclude={() => {}}
        onDelete={() => {}}
        onRecrawl={() => {}}
      />
    </div>
  );
};

export default WebsiteSourceDetail;
