
import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { sourceTabsConfig, getDefaultTab } from '../config/tabConfig';

export const useTabNavigation = () => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || getDefaultTab();

  useEffect(() => {
    if (!searchParams.has("tab")) {
      navigate(`/agent/${agentId}/sources?tab=${getDefaultTab()}`, { replace: true });
    }
  }, [agentId, navigate, searchParams]);

  const navigateToTab = (tabId: string) => {
    if (sourceTabsConfig.some(tab => tab.id === tabId)) {
      navigate(`/agent/${agentId}/sources?tab=${tabId}`);
    }
  };

  const getTabTitle = () => {
    const tab = sourceTabsConfig.find(t => t.id === currentTab);
    return tab?.label || getDefaultTab();
  };

  return {
    currentTab,
    navigateToTab,
    getTabTitle,
    availableTabs: sourceTabsConfig
  };
};
