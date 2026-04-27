import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { useAuthStore } from "./authStore";

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

function msgId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

async function save(conversations: Conversation[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 20)));
  } catch {}
}

/**
 * Parse SSE events from a ReadableStream with proper buffering.
 * Accumulates raw bytes across chunks, splits on double-newlines,
 * and only yields complete `data: ...` lines — never partial ones.
 */
async function* parseSse(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<{ token?: string; done?: boolean; error?: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by \n\n
      const events = buffer.split("\n\n");
      // Keep the last (potentially incomplete) chunk in the buffer
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; error?: string };
              yield payload;
            } catch {
              // Ignore malformed JSON in an SSE frame
            }
          }
        }
      }
    }

    // Flush remaining buffer after stream closes
    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; error?: string };
            yield payload;
          } catch {}
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentId: null,
  isStreaming: false,

  loadConversations: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ conversations: JSON.parse(raw) as Conversation[] });
    } catch {}
  },

  startConversation: (vehicleId, vehicleName, initialMsg) => {
    const id = msgId();
    const greeting: ChatMessage = {
      id: msgId() + "g",
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
      id: msgId() + "u",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // Build message history for API (exclude the initial greeting)
    const messagesForApi = [...conv.messages, userMsg]
      .filter(m => m.role !== "assistant" || m.id !== conv.messages[0]?.id)
      .map(m => ({ role: m.role, content: m.content }));

    const updatedWithUser = { ...conv, messages: [...conv.messages, userMsg] };
    const convsWithUser = conversations.map(c => c.id === currentId ? updatedWithUser : c);
    set({ conversations: convsWithUser, isStreaming: true });

    const aiMsgId = msgId() + "a";
    const aiMsg: ChatMessage = { id: aiMsgId, role: "assistant", content: "", createdAt: new Date().toISOString() };
    set({
      conversations: convsWithUser.map(c =>
        c.id === currentId ? { ...c, messages: [...c.messages, aiMsg] } : c
      ),
    });

    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: messagesForApi, vehicleContext, conversationId: currentId }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? "Serviço indisponível");
      }

      let accumulated = "";
      for await (const event of parseSse(res.body)) {
        if (event.error) throw new Error(event.error);
        if (event.token) {
          accumulated += event.token;
          set({
            conversations: get().conversations.map(c =>
              c.id === currentId
                ? { ...c, messages: c.messages.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m) }
                : c
            ),
          });
        }
      }

      save(get().conversations);
    } catch (err) {
      const fallback = err instanceof Error ? err.message : getFallbackResponse(content);
      set({
        conversations: get().conversations.map(c =>
          c.id === currentId
            ? { ...c, messages: c.messages.map(m => m.id === aiMsgId ? { ...m, content: fallback } : m) }
            : c
        ),
      });
      save(get().conversations);
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

function getFallbackResponse(_userMsg: string): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)] ?? FALLBACK_RESPONSES[0]!;
}
