
export interface TabConfig {
  id: string;
  label: string;
  description: string;
  component: React.ComponentType;
}

export const sourceTabsConfig: TabConfig[] = [
  {
    id: 'text',
    label: 'Text',
    description: 'Add text content directly',
    component: () => import('../TextTab').then(m => m.default)
  },
  {
    id: 'files',
    label: 'Files',
    description: 'Upload documents and files',
    component: () => import('../FilesTab').then(m => m.default)
  },
  {
    id: 'website',
    label: 'Website',
    description: 'Crawl websites and URLs',
    component: () => import('../WebsiteTab').then(m => m.default)
  },
  {
    id: 'qa',
    label: 'Q&A',
    description: 'Add question and answer pairs',
    component: () => import('../QATab').then(m => m.default)
  }
];

export const getTabConfig = (tabId: string): TabConfig | undefined => {
  return sourceTabsConfig.find(tab => tab.id === tabId);
};

export const getDefaultTab = (): string => {
  return sourceTabsConfig[0].id;
};
