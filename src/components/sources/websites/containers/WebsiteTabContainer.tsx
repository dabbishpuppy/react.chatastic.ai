
import React from "react";
import { useWebsiteSourcesOperations } from "../hooks/useWebsiteSourcesOperations";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import WebsiteInputForm from "../components/WebsiteInputForm";
import FixSourcesButton from "../../FixSourcesButton";

const WebsiteTabContainer: React.FC = () => {
  const {
    handleAddWebsite,
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl,
    loading,
    error
  } = useWebsiteSourcesOperations();

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Website Training</h2>
        <FixSourcesButton />
      </div>

      <WebsiteInputForm onAddWebsite={handleAddWebsite} />
      
      <WebsiteSourcesList
        onEdit={handleEdit}
        onExclude={handleExclude}
        onDelete={handleDelete}
        onRecrawl={handleRecrawl}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default WebsiteTabContainer;
