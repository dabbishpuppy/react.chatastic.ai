
import { ReactNode } from 'react';

// Define the types for messages and conversations
export interface Message {
  sender: "user" | "agent";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  startedAt: string;
  messages: Message[];
}

// Mock conversations data
export const mockConversations: Record<string, Conversation> = {
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

// Helper function to get conversation by ID
export const getConversationById = (id: string): Conversation | null => {
  return mockConversations[id] || null;
};
