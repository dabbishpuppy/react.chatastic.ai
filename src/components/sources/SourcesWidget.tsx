import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link2, FileArchive, MessageCircleQuestion, AlertCircle } from "lucide-react";
import { useAgentSources } from "@/hooks/useAgentSources";

const SourcesWidget: React.FC = () => {
  const { sources, loading } = useAgentSources();

  const formattedSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    } else {
      return `${Math.round(size / (1024 * 1024))} MB`;
    }
  };

  const calculateStats = () => {
    if (!sources.length) {
      return {
        files: 0,
        textFiles: 0,
        links: 0,
        qa: 0,
        totalSize: 0
      };
    }

    const stats = sources.reduce((acc, source) => {
      const size = source.content ? new Blob([source.content]).size : 0;
      
      switch (source.source_type) {
        case 'file':
          acc.files += 1;
          break;
        case 'text':
          acc.textFiles += 1;
          break;
        case 'website':
          acc.links += 1;
          break;
        case 'qa':
          acc.qa += 1;
          break;
      }
      
      acc.totalSize += size;
      return acc;
    }, {
      files: 0,
      textFiles: 0,
      links: 0,
      qa: 0,
      totalSize: 0
    });

    return stats;
  };

  const stats = calculateStats();
  const maxSize = 400 * 1024; // 400 KB
  const retrainingRequired = sources.length > 0; // Simple logic for now

  if (loading) {
    return (
      <Card className="p-6 border border-gray-200 shadow-sm bg-white">
        <div className="text-center text-gray-500">Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-gray-200 shadow-sm bg-white">
      <div className="space-y-4">
        <h3 className="font-semibold uppercase tracking-wide text-gray-600 text-xs">Sources</h3>

        <div className="space-y-2">
          {stats.files > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileArchive size={16} className="text-gray-500" />
                <span>{stats.files} {stats.files === 1 ? "File" : "Files"}</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.files * 1024)}</span>
            </div>
          )}
          
          {stats.textFiles > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                <span>{stats.textFiles} Text {stats.textFiles === 1 ? "File" : "Files"}</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.textFiles)}</span>
            </div>
          )}
          
          {stats.links > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-gray-500" />
                <span>{stats.links} {stats.links === 1 ? "Link" : "Links"}</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.links)}</span>
            </div>
          )}
          
          {stats.qa > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion size={16} className="text-gray-500" />
                <span>{stats.qa} Q&A</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.qa)}</span>
            </div>
          )}

          {stats.files === 0 && stats.textFiles === 0 && stats.links === 0 && stats.qa === 0 && (
            <div className="text-center text-gray-500 py-4">
              <p>No sources yet</p>
              <p className="text-sm">Add your first source</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Total size:</span>
            <span className="text-right">
              {formattedSize(stats.totalSize)}
              <br />
              <span className="text-gray-500">/ {formattedSize(maxSize)}</span>
            </span>
          </div>
          
          <Button className="w-full bg-black hover:bg-gray-800 mt-4">
            Retrain agent
          </Button>
          
          {retrainingRequired && (
            <div className="mt-4 text-amber-700 bg-amber-50 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p>Retraining is required for changes to apply</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SourcesWidget;
