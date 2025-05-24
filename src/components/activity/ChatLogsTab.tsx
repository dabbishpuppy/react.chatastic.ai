
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { conversationService, Conversation } from "@/services/conversationService";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatLogsTabProps {
  onConversationClick: (conversationId: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  hideTitle?: boolean;
  conversations?: Conversation[];
  onRefresh?: () => void;
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
  onConversationDelete,
  hideTitle = false,
  conversations = [],
  onRefresh
}) => {
  const { agentId } = useParams<{ agentId: string }>();
  const [chatLogs, setChatLogs] = useState<Conversation[]>(conversations);
  const [isEmpty, setIsEmpty] = useState(conversations.length === 0);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (conversations.length > 0) {
      setChatLogs(conversations);
      setIsEmpty(false);
    } else if (agentId && conversations.length === 0) {
      loadConversations();
    }
  }, [conversations, agentId]);

  const loadConversations = async () => {
    if (!agentId) return;
    
    setLoading(true);
    try {
      const recentConversations = await conversationService.getRecentConversations(agentId, 50);
      setChatLogs(recentConversations);
      setIsEmpty(recentConversations.length === 0);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setIsEmpty(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      if (onConversationDelete) {
        onConversationDelete(conversationToDelete);
      } else {
        // Fallback to local state update
        const updatedLogs = chatLogs.filter(log => log.id !== conversationToDelete);
        setChatLogs(updatedLogs);
        setIsEmpty(updatedLogs.length === 0);
        
        toast({
          title: "Conversation deleted",
          description: `Conversation has been deleted`,
        });
      }
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      loadConversations();
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    return conversation.title || `Chat from ${formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}`;
  };

  const getConversationSnippet = (conversation: Conversation) => {
    const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true });
    const status = conversation.status === 'active' ? 'Active' : 'Ended';
    return `${status} • ${timeAgo}`;
  };

  return (
    <>
      <div className="space-y-4">
        {!hideTitle && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Chat logs</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="flex gap-1" onClick={handleRefresh}>
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
        )}

        <div className="bg-white rounded-lg border">
          <div className="h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin' }}>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            ) : isEmpty ? (
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
                        <div className="font-medium">{getConversationTitle(log)}</div>
                        <div className="text-sm text-gray-500">{getConversationSnippet(log)}</div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-gray-500 capitalize">{log.source}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleDeleteClick(log.id, e)}
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
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Attach the ActionButtons component to ChatLogsTab
ChatLogsTab.ActionButtons = ActionButtons;

export default ChatLogsTab;
