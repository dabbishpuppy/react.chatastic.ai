
import React from 'react';

export interface TabConfig {
  id: string;
  label: string;
  description: string;
  component: React.ComponentType;
}

// Import components directly for proper typing
import TextTab from '../TextTab';
import FilesTab from '../FilesTab';
import WebsiteTab from '../WebsiteTab';
import QATab from '../QATab';

export const sourceTabsConfig: TabConfig[] = [
  {
    id: 'text',
    label: 'Text',
    description: 'Add text content directly',
    component: TextTab
  },
  {
    id: 'files',
    label: 'Files',
    description: 'Upload documents and files',
    component: FilesTab
  },
  {
    id: 'website',
    label: 'Website',
    description: 'Crawl websites and URLs',
    component: WebsiteTab
  },
  {
    id: 'qa',
    label: 'Q&A',
    description: 'Add question and answer pairs',
    component: QATab
  }
];

export const getTabConfig = (tabId: string): TabConfig | undefined => {
  return sourceTabsConfig.find(tab => tab.id === tabId);
};

export const getDefaultTab = (): string => {
  return sourceTabsConfig[0].id;
};
