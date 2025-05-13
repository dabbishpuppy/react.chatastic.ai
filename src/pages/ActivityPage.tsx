import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, Trash2 } from "lucide-react";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationView from "@/components/agent/ConversationView";

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

// Update the mock conversations data to ensure `sender` is properly typed as "user" | "agent"
const mockConversations: Record<string, {
  id: string;
  title: string;
  startedAt: string;
  messages: Array<{
    sender: "user" | "agent";
    content: string;
    timestamp: string;
  }>;
}> = {
  "1": {
    id: "1",
    title: "Hei! Våre åpningstider er som følger...",
    startedAt: "2023-11-10T14:30:00",
    messages: [
      { sender: "user", content: "Hei! Hva er åpningstidene deres?", timestamp: "2023-11-10T14:30:00" },
      { sender: "agent", content: "Hei! Våre åpningstider er som følger: Mandag-Fredag: 10:00-22:00, Lørdag: 11:00-23:00, Søndag: 12:00-21:00. Er det noe annet du lurer på?", timestamp: "2023-11-10T14:30:30" },
      { sender: "user", content: "Takk! Må man reservere bord på forhånd?", timestamp: "2023-11-10T14:31:00" },
      { sender: "agent", content: "Det anbefales å reservere bord, særlig i helgene da vi ofte er fullbooket. Du kan reservere bord via vår nettside eller ved å ringe oss på +47 12345678.", timestamp: "2023-11-10T14:31:30" }
    ]
  },
  "2": {
    id: "2",
    title: "Hei! Takk for at du tok kontakt med...",
    startedAt: "2023-10-27T18:15:00",
    messages: [
      { sender: "user", content: "Hei, vi var å spiste middag hos dere i går (var en familie på 4). Ville bare si at maten var helt fantastisk!", timestamp: "2023-10-27T18:15:00" },
      { sender: "agent", content: "Hei! Takk for at du tok kontakt med oss og for den hyggelige tilbakemeldingen. Vi er veldig glade for at dere likte maten hos oss! Vi håper å se dere igjen snart.", timestamp: "2023-10-27T18:15:30" }
    ]
  },
  "3": {
    id: "3",
    title: "Det høres ut som en deilig plan! Vi...",
    startedAt: "2023-10-27T12:45:00",
    messages: [
      { sender: "user", content: "Vi er 6 personer som skal ut å spise i kveld, har dere plass rundt kl. 19?", timestamp: "2023-10-27T12:45:00" },
      { sender: "agent", content: "Hei! Ja, vi har plass til 6 personer i kveld kl. 19. Vil du jeg skal reservere et bord til dere?", timestamp: "2023-10-27T12:45:30" },
      { sender: "user", content: "Ja takk! Det hadde vært fint.", timestamp: "2023-10-27T12:46:00" },
      { sender: "agent", content: "Perfekt! Jeg har nå reservert et bord til 6 personer kl. 19 i kveld. På hvilket navn skal jeg registrere reservasjonen?", timestamp: "2023-10-27T12:46:30" },
      { sender: "user", content: "Så flott! For vi vil helst spise gresk mat:)", timestamp: "2023-10-27T12:47:00" },
      { sender: "agent", content: "Det høres ut som en deilig plan! Vi har flere greske retter på menyen vår, inkludert moussaka, souvlaki og gresk salat. Navnet på reservasjonen?", timestamp: "2023-10-27T12:47:30" }
    ]
  },
  "4": {
    id: "4",
    title: "For å endre bordreservasjonen din,...",
    startedAt: "2023-10-26T09:20:00",
    messages: [
      { sender: "user", content: "Hei! Jeg har en reservasjon i dag til kl 18, jeg lurer på om det er mulig å endre til kl 19?", timestamp: "2023-10-26T09:20:00" },
      { sender: "agent", content: "For å endre bordreservasjonen din, trenger jeg litt informasjon. Kan du oppgi navnet reservasjonen er gjort på og hvor mange personer det gjelder?", timestamp: "2023-10-26T09:20:30" }
    ]
  },
  "5": {
    id: "5",
    title: "Hei! Adressen vår er Ivan Bjørndals...",
    startedAt: "2023-10-25T15:10:00",
    messages: [
      { sender: "user", content: "Hei. Hva er adressen deres?", timestamp: "2023-10-25T15:10:00" },
      { sender: "agent", content: "Hei! Adressen vår er Ivan Bjørndals gate 27, 0653 Oslo. Vi ligger rett ved Majorstuen T-banestasjon. Velkommen til oss!", timestamp: "2023-10-25T15:10:30" }
    ]
  }
};

// Mock data for leads
const leads = [
  { id: "1", name: "John Doe", email: "john@example.com", date: "2 days ago", status: "New" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", date: "3 days ago", status: "Contacted" },
  { id: "3", name: "Alex Johnson", email: "alex@example.com", date: "5 days ago", status: "Qualified" },
];

const ActivityPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [activeTab, setActiveTab] = useState("activity");
  const [selectedTab, setSelectedTab] = useState("chat-logs");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

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

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
  };

  const getConversationById = (id: string) => {
    return mockConversations[id as keyof typeof mockConversations] || null;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r overflow-y-auto bg-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold">Playground</h1>
          </div>
          <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Activity</h1>

            {selectedConversation ? (
              <ConversationView 
                conversation={getConversationById(selectedConversation)} 
                onClose={handleCloseConversation} 
              />
            ) : (
              <Tabs defaultValue="chat-logs" onValueChange={setSelectedTab} className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="chat-logs" className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Chat Logs
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="flex items-center gap-2">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Leads
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat-logs" className="space-y-4">
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
                              onClick={() => handleConversationClick(log.id)}
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
                </TabsContent>

                <TabsContent value="leads" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Leads</h2>
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
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.date}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {lead.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(lead.id);
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
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
