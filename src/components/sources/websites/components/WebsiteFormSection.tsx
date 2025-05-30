
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WebsiteCrawlForm from "./WebsiteCrawlForm";

interface WebsiteFormSectionProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  url: string;
  setUrl: (url: string) => void;
  protocol: string;
  setProtocol: (protocol: string) => void;
  includePaths: string;
  setIncludePaths: (paths: string) => void;
  excludePaths: string;
  setExcludePaths: (paths: string) => void;
  onSubmit: (crawlType: 'crawl-links' | 'sitemap' | 'individual-link', options?: { maxPages?: number; maxDepth?: number; concurrency?: number }) => Promise<void>;
  isSubmitting: boolean;
}

const WebsiteFormSection: React.FC<WebsiteFormSectionProps> = ({
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
  onSubmit,
  isSubmitting
}) => {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-4">Link</h3>
        
        <Tabs defaultValue="crawl-links" value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="mb-6 bg-transparent p-0 border-b border-gray-200 w-full flex space-x-6">
            <TabsTrigger value="crawl-links" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium">
              Crawl links
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium">
              Sitemap
            </TabsTrigger>
            <TabsTrigger value="individual-link" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium">
              Individual link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crawl-links" className="mt-4">
            <WebsiteCrawlForm
              url={url}
              setUrl={setUrl}
              protocol={protocol}
              setProtocol={setProtocol}
              includePaths={includePaths}
              setIncludePaths={setIncludePaths}
              excludePaths={excludePaths}
              setExcludePaths={setExcludePaths}
              onSubmit={(options) => onSubmit('crawl-links', options)}
              isSubmitting={isSubmitting}
              buttonText="Fetch links"
              showFilters={true}
            />
          </TabsContent>

          <TabsContent value="sitemap" className="mt-4">
            <div className="space-y-4">
              <p className="text-gray-600">
                Upload your sitemap XML file or provide a URL to your sitemap.
              </p>
              <WebsiteCrawlForm
                url={url}
                setUrl={setUrl}
                protocol={protocol}
                setProtocol={setProtocol}
                includePaths={includePaths}
                setIncludePaths={setIncludePaths}
                excludePaths={excludePaths}
                setExcludePaths={setExcludePaths}
                onSubmit={(options) => onSubmit('sitemap', options)}
                isSubmitting={isSubmitting}
                buttonText="Upload sitemap"
                showFilters={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="individual-link" className="mt-4">
            <div className="space-y-4">
              <p className="text-gray-600">
                Add specific links manually.
              </p>
              <WebsiteCrawlForm
                url={url}
                setUrl={setUrl}
                protocol={protocol}
                setProtocol={setProtocol}
                includePaths={includePaths}
                setIncludePaths={setIncludePaths}
                excludePaths={excludePaths}
                setExcludePaths={setExcludePaths}
                onSubmit={(options) => onSubmit('individual-link', options)}
                isSubmitting={isSubmitting}
                buttonText="Add link"
                showFilters={false}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WebsiteFormSection;
