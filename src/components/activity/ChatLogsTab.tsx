
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { getAllConversations, deleteAllConversations } from "./ConversationData";

interface ChatLogsTabProps {
  onConversationClick: (conversationId: string) => void;
  hideTitle?: boolean;
}

const handleExport = () => {
  toast({
    title: "Export initiated",
    description: "Your activity logs are being exported",
  });
};

// Action buttons component that can be used independently
const ActionButtons = () => {
  return (
    <>
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
    </>
  );
};

const ChatLogsTab: React.FC<ChatLogsTabProps> & { ActionButtons: typeof ActionButtons } = ({ 
  onConversationClick, 
  hideTitle = false 
}) => {
  const { agentId } = useParams<{ agentId: string }>();
  const [chatLogs, setChatLogs] = useState(getAllConversations());
  const [isEmpty, setIsEmpty] = useState(chatLogs.length === 0);

  // In a real app, this would fetch conversations from an API or database
  useEffect(() => {
    // Here's where real data fetching would occur
    setChatLogs(getAllConversations());
    
    // Check if the list is empty
    setIsEmpty(getAllConversations().length === 0);
  }, [agentId]);

  const handleDelete = (id: string) => {
    // Remove the conversation from the list
    const updatedLogs = chatLogs.filter(log => log.id !== id);
    setChatLogs(updatedLogs);
    
    // Also update our in-memory storage
    // In a real app, this would be an API call
    // For now we'll just simulate it
    
    toast({
      title: "Log deleted",
      description: `Log ${id} has been deleted`,
    });
    
    setIsEmpty(updatedLogs.length === 0);
  };

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Chat logs</h2>
          <div className="flex gap-2">
            <ActionButtons />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <ScrollArea className="h-[calc(100vh-240px)]">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <Trash2 size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
              <p className="text-gray-500 max-w-sm">
                When someone chats with this agent, conversations will appear here.
              </p>
            </div>
          ) : (
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
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

// Attach the ActionButtons component to ChatLogsTab
ChatLogsTab.ActionButtons = ActionButtons;

export default ChatLogsTab;
