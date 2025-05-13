
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

// Mock data for chat logs
const chatLogs = [
  {
    id: "1",
    title: "Hei! Våre åpningstider er som følger...",
    snippet: "Hei! Hva er åpningstidene deres?",
    daysAgo: "5 days ago",
    source: "Widget or Iframe"
  },
  {
    id: "2",
    title: "Hei! Takk for at du tok kontakt med...",
    snippet: "Hei, vi var å spiste middag hos dere i går (var en...",
    daysAgo: "19 days ago",
    source: "Widget or Iframe"
  },
  {
    id: "3",
    title: "Det høres ut som en deilig plan! Vi...",
    snippet: "Så flott! For vi vil helst spise gresk mat:)",
    daysAgo: "19 days ago",
    source: "Widget or Iframe"
  },
  {
    id: "4",
    title: "For å endre bordreservasjonen din,...",
    snippet: "Hei! Jeg har en reservasjon i dag til kl 18, jeg lurer...",
    daysAgo: "20 days ago",
    source: "Widget or Iframe"
  },
  {
    id: "5",
    title: "Hei! Adressen vår er Ivan Bjørndals...",
    snippet: "Hei. Hva er adressen deres?",
    daysAgo: "21 days ago",
    source: "Widget or Iframe"
  }
];

interface ChatLogsTabProps {
  onConversationClick: (conversationId: string) => void;
}

const ChatLogsTab: React.FC<ChatLogsTabProps> = ({ onConversationClick }) => {
  const handleExport = () => {
    toast({
      title: "Export initiated",
      description: "Your activity logs are being exported",
    });
  };

  const handleDelete = (id: string) => {
    toast({
      title: "Log deleted",
      description: `Log ${id} has been deleted`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Chat logs</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="flex gap-1">
            <RefreshCcw size={18} />
            Refresh
          </Button>
          <Button variant="outline" className="flex gap-1">
            <Filter size={18} />
            Filter
          </Button>
          <Button onClick={handleExport} className="bg-black hover:bg-gray-800 flex gap-1">
            Export
            <Download size={18} />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <ScrollArea className="h-[calc(100vh-240px)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50%]">Conversation</TableHead>
                <TableHead className="w-[20%]">Date</TableHead>
                <TableHead className="w-[25%]">Source</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatLogs.map((log) => (
                <TableRow 
                  key={log.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onConversationClick(log.id)}
                >
                  <TableCell className="py-4">
                    <div className="font-medium">{log.title}</div>
                    <div className="text-sm text-gray-500">{log.snippet}</div>
                  </TableCell>
                  <TableCell className="text-gray-500">{log.daysAgo}</TableCell>
                  <TableCell className="text-gray-500">{log.source}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(log.id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatLogsTab;
