import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  vehicleId?: string;
  vehicleName?: string;
  messages: ChatMessage[];
  createdAt: string;
}

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  startConversation: (vehicleId?: string, vehicleName?: string, initialMessage?: string) => void;
  sendMessage: (content: string) => Promise<void>;
  loadConversation: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

const MECHANIC_RESPONSES = [
  "Com base nos dados do diagnóstico, recomendo verificar o nível do óleo imediatamente. Para o seu veículo, o óleo ideal é o 5W-30 semissintético. Leve ao motor desligado e frio, retire a vareta, limpe, reinsira e verifique o nível. Se estiver abaixo do mínimo, adicione em pequenas quantidades.",
  "O fluido de arrefecimento está no nível adequado, mas recomendo uma troca completa a cada 2 anos ou 40.000 km, independentemente do nível atual. Certifique-se de usar o tipo correto especificado no manual do proprietário.",
  "Para o fluido de freio DOT-4, o nível está dentro do aceitável. Porém, fique atento: fluido de freio higroscópico absorve umidade com o tempo e perde eficiência. Recomendo troca a cada 2 anos.",
  "Entendido! Esse tipo de manutenção é simples e pode ser feita em casa com segurança. Certifique-se de ter o equipamento correto e siga os passos do guia animado disponível no diagnóstico.",
  "Sim, isso é urgente! Com o óleo nesse nível, o motor pode sofrer danos sérios. Por favor, não dirija o veículo até reabastecer o óleo. Use o guia animado para fazer isso com segurança.",
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  const startConversation = useCallback((vehicleId?: string, vehicleName?: string, initialMessage?: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const greeting: ChatMessage = {
      id: Date.now().toString(36),
      role: "assistant",
      content: initialMessage ??
        `Olá! Sou o Especialista AutoCare AI. Tenho mais de 20 anos de experiência em mecânica automotiva e estou aqui para te ajudar com a manutenção${vehicleName ? ` do seu ${vehicleName}` : " do seu veículo"}. Como posso te ajudar hoje?`,
      createdAt: new Date().toISOString(),
    };
    const conv: Conversation = {
      id,
      vehicleId,
      vehicleName,
      messages: [greeting],
      createdAt: new Date().toISOString(),
    };
    setCurrentConversation(conv);
    setConversations(prev => [conv, ...prev]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversation) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(36) + "u",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const updatedWithUser = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMsg],
    };
    setCurrentConversation(updatedWithUser);
    setConversations(prev => prev.map(c => c.id === currentConversation.id ? updatedWithUser : c));

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    const aiResponse = MECHANIC_RESPONSES[Math.floor(Math.random() * MECHANIC_RESPONSES.length)];
    const aiMsg: ChatMessage = {
      id: Date.now().toString(36) + "a",
      role: "assistant",
      content: aiResponse ?? MECHANIC_RESPONSES[0]!,
      createdAt: new Date().toISOString(),
    };

    const updatedWithAi = {
      ...updatedWithUser,
      messages: [...updatedWithUser.messages, aiMsg],
    };
    setCurrentConversation(updatedWithAi);
    setConversations(prev => prev.map(c => c.id === currentConversation.id ? updatedWithAi : c));
  }, [currentConversation]);

  const loadConversation = useCallback((id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) setCurrentConversation(conv);
  }, [conversations]);

  return (
    <ChatContext.Provider value={{ conversations, currentConversation, startConversation, sendMessage, loadConversation }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
