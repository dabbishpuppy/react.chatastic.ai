
import React from 'react';
import { AgentSource } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

interface QASourceItemProps {
  source: AgentSource;
}

const QASourceItem: React.FC<QASourceItemProps> = ({ source }) => {
  const question = source.metadata?.question || 'No question available';
  const answer = source.metadata?.answer || source.content || 'No answer available';
  
  // Strip HTML from answer for preview
  const answerPreview = answer.replace(/<[^>]*>/g, '').substring(0, 100) + '...';

  return (
    <div className="flex items-start space-x-3 p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
        <MessageSquare size={20} className="text-blue-600" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {source.title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            Q&A
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 font-medium">Question:</p>
            <p className="text-sm text-gray-700 line-clamp-2">{question}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 font-medium">Answer:</p>
            <p className="text-sm text-gray-600 line-clamp-2">{answerPreview}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            Added {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QASourceItem;
