
import React, { Suspense, lazy } from 'react';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { getTabConfig } from '../config/tabConfig';

// Import tab components
const TextTab = lazy(() => import('../TextTab'));
const FilesTab = lazy(() => import('../FilesTab'));
const WebsiteTab = lazy(() => import('../WebsiteTab'));
const QATab = lazy(() => import('../QATab'));

const TabContainer: React.FC = () => {
  const { currentTab } = useTabNavigation();

  const renderTabContent = () => {
    const tabConfig = getTabConfig(currentTab);
    if (!tabConfig) return <TextTab />;

    switch (currentTab) {
      case 'text':
        return <TextTab />;
      case 'files':
        return <FilesTab />;
      case 'website':
        return <WebsiteTab />;
      case 'qa':
        return <QATab />;
      default:
        return <TextTab />;
    }
  };

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      {renderTabContent()}
    </Suspense>
  );
};

export default TabContainer;
