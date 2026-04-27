import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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

const BASE_URL = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;
const STORAGE_KEY = "@autocare:conversations";

interface ChatState {
  conversations: Conversation[];
  currentId: string | null;
  isStreaming: boolean;
  loadConversations: () => Promise<void>;
  startConversation: (vehicleId?: string, vehicleName?: string, initialMsg?: string) => string;
  sendMessage: (content: string, vehicleContext?: string) => Promise<void>;
  setCurrentId: (id: string | null) => void;
  getCurrentConversation: () => Conversation | null;
}

async function save(conversations: Conversation[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 20)));
  } catch {}
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentId: null,
  isStreaming: false,

  loadConversations: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ conversations: JSON.parse(raw) });
    } catch {}
  },

  startConversation: (vehicleId, vehicleName, initialMsg) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const greeting: ChatMessage = {
      id: Date.now().toString(36) + "g",
      role: "assistant",
      content: initialMsg ??
        `Olá! Sou o Especialista AutoCare AI. Tenho mais de 20 anos de experiência em mecânica automotiva e estou aqui para ajudar${vehicleName ? ` com o seu ${vehicleName}` : ""}. Como posso te ajudar?`,
      createdAt: new Date().toISOString(),
    };
    const conv: Conversation = { id, vehicleId, vehicleName, messages: [greeting], createdAt: new Date().toISOString() };
    const updated = [conv, ...get().conversations];
    set({ conversations: updated, currentId: id });
    save(updated);
    return id;
  },

  setCurrentId: (id) => set({ currentId: id }),

  getCurrentConversation: () => {
    const { conversations, currentId } = get();
    return conversations.find(c => c.id === currentId) ?? null;
  },

  sendMessage: async (content, vehicleContext) => {
    const { conversations, currentId } = get();
    if (!currentId) return;

    const conv = conversations.find(c => c.id === currentId);
    if (!conv) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(36) + "u",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const messagesForApi = [...conv.messages, userMsg]
      .filter(m => m.role !== "assistant" || m.id !== conv.messages[0]?.id)
      .map(m => ({ role: m.role, content: m.content }));

    const updatedWithUser = { ...conv, messages: [...conv.messages, userMsg] };
    const convsWithUser = conversations.map(c => c.id === currentId ? updatedWithUser : c);
    set({ conversations: convsWithUser, isStreaming: true });

    const aiMsgId = Date.now().toString(36) + "a";
    const aiMsg: ChatMessage = { id: aiMsgId, role: "assistant", content: "", createdAt: new Date().toISOString() };
    const convsWithAi = convsWithUser.map(c =>
      c.id === currentId ? { ...c, messages: [...c.messages, aiMsg] } : c
    );
    set({ conversations: convsWithAi });

    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi, vehicleContext }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; error?: string };
                if (parsed.token) {
                  accumulated += parsed.token;
                  const current = get().conversations;
                  const streamUpdated = current.map(c =>
                    c.id === currentId
                      ? {
                          ...c,
                          messages: c.messages.map(m =>
                            m.id === aiMsgId ? { ...m, content: accumulated } : m
                          ),
                        }
                      : c
                  );
                  set({ conversations: streamUpdated });
                }
              } catch {}
            }
          }
        }

        const finalConvs = get().conversations;
        save(finalConvs);
      } else {
        throw new Error("API unavailable");
      }
    } catch {
      const fallback = getFallbackResponse(content);
      const current = get().conversations;
      const fallbackUpdated = current.map(c =>
        c.id === currentId
          ? { ...c, messages: c.messages.map(m => m.id === aiMsgId ? { ...m, content: fallback } : m) }
          : c
      );
      set({ conversations: fallbackUpdated });
      save(fallbackUpdated);
    } finally {
      set({ isStreaming: false });
    }
  },
}));

const FALLBACK_RESPONSES = [
  "Com base nos dados do diagnóstico, recomendo verificar o nível do óleo imediatamente. Para o seu veículo, o óleo ideal é o 5W-30 semissintético. Retire a vareta com o motor frio, limpe e reinsira para verificar. Se estiver abaixo do mínimo, adicione em pequenas quantidades.",
  "O fluido de arrefecimento no nível indicado é preocupante. Recomendo completar com o líquido do tipo correto especificado no manual do proprietário. Nunca abra o radiador com o motor quente — risco de queimaduras graves.",
  "Para o fluido de freio, utilize sempre o tipo especificado (DOT-3, DOT-4 ou DOT-5.1). Nunca misture tipos diferentes. O fluido de freio é higroscópico e absorve umidade, por isso recomendo troca a cada 2 anos mesmo que o nível esteja adequado.",
  "Entendido! Esse procedimento é seguro para ser feito em casa. Use o guia animado disponível no diagnóstico para seguir os passos corretamente. Se tiver dúvidas durante o processo, pode me perguntar aqui.",
  "Essa situação é urgente! Com o fluido nesse nível, o componente pode ser danificado seriamente. Por favor, não dirija o veículo até resolver esse problema. Siga o guia de manutenção ou leve a um mecânico de confiança.",
];

function getFallbackResponse(userMsg: string): string {
  const idx = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[idx] ?? FALLBACK_RESPONSES[0]!;
}
