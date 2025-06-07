
import React from 'react';
import { Loader2 } from 'lucide-react';

interface TrainingProgressMessageProps {
  status: 'initializing' | 'training' | null;
}

const TrainingProgressMessage: React.FC<TrainingProgressMessageProps> = ({ status }) => {
  if (!status) return null;

  const getMessage = () => {
    switch (status) {
      case 'initializing':
        return {
          title: 'Training in progress',
          description: 'Reading your links..'
        };
      case 'training':
        return {
          title: 'Training in progress',
          description: 'Depending on the size of your sources, this may take a while.'
        };
      default:
        return null;
    }
  };

  const message = getMessage();
  if (!message) return null;

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <div>
          <p className="text-sm font-medium text-blue-900">{message.title}</p>
          <p className="text-xs text-blue-700">{message.description}</p>
        </div>
      </div>
    </div>
  );
};

export default TrainingProgressMessage;
