
import { useState } from 'react';

export const useWebsiteFormState = () => {
  const [activeSubTab, setActiveSubTab] = useState("crawl-links");
  const [url, setUrl] = useState("");
  const [protocol, setProtocol] = useState("https://");
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");

  const clearForm = () => {
    setUrl("");
    setIncludePaths("");
    setExcludePaths("");
    setProtocol("https://");
  };

  return {
    activeSubTab,
    setActiveSubTab,
    url,
    setUrl,
    protocol,
    setProtocol,
    includePaths,
    setIncludePaths,
    excludePaths,
    setExcludePaths,
    clearForm
  };
};
