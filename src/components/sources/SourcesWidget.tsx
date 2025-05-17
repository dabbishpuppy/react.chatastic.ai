import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link2, FileArchive, MessageCircleQuestion, AlertCircle } from "lucide-react";
interface SourceStats {
  files: number;
  textFiles: number;
  links: number;
  qa: number;
  totalSize: number;
  maxSize: number;
}
interface SourcesWidgetProps {
  stats: SourceStats;
}
const SourcesWidget: React.FC<SourcesWidgetProps> = ({
  stats
}) => {
  const formattedSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    } else {
      return `${Math.round(size / (1024 * 1024))} MB`;
    }
  };
  const retrainingRequired = true; // This would be determined by your application's state management

  return <Card className="p-6 border border-gray-200 shadow-sm bg-white">
      <div className="space-y-4">
        <h3 className="font-semibold uppercase tracking-wide text-gray-600 text-xs">Sources</h3>

        <div className="space-y-2">
          {stats.files > 0 && <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileArchive size={16} className="text-gray-500" />
                <span>{stats.files} {stats.files === 1 ? "File" : "Files"}</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.files * 1024)}</span>
            </div>}
          
          {stats.textFiles > 0 && <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                <span>{stats.textFiles} Text {stats.textFiles === 1 ? "File" : "Files"}</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.textFiles)}</span>
            </div>}
          
          {stats.links > 0 && <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-gray-500" />
                <span>{stats.links} {stats.links === 1 ? "Link" : "Links"}</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.links)}</span>
            </div>}
          
          {stats.qa > 0 && <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion size={16} className="text-gray-500" />
                <span>{stats.qa} Q&A</span>
              </div>
              <span className="text-gray-600">{formattedSize(stats.qa)}</span>
            </div>}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Total size:</span>
            <span className="text-right">
              {formattedSize(stats.totalSize)}
              <br />
              <span className="text-gray-500">/ {formattedSize(stats.maxSize)}</span>
            </span>
          </div>
          
          <Button className="w-full bg-black hover:bg-gray-800 mt-4">
            Retrain agent
          </Button>
          
          {retrainingRequired && <div className="mt-4 text-amber-700 bg-amber-50 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p>Retraining is required for changes to apply</p>
            </div>}
        </div>
      </div>
    </Card>;
};
export default SourcesWidget;