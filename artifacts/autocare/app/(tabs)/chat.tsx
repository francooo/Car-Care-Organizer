import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage, useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

const QUICK_REPLIES = [
  "Como trocar o óleo?",
  "Qual produto comprar?",
  "Isso é urgente?",
  "Posso fazer sozinho?",
];

function TypingIndicator({ colors }: { colors: any }) {
  return (
    <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surface }]}>
      <Text style={[styles.typingDots, { color: colors.textSecondary }]}>●●●</Text>
    </View>
  );
}

function ChatBubble({ message, colors }: { message: ChatMessage; colors: any }) {
  const isUser = message.role === "user";
  const time = new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.bubbleWrapper, isUser && styles.bubbleWrapperUser]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAI, { backgroundColor: colors.surface }],
        ]}
      >
        <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.textPrimary }]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{time}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentConversation, startConversation, sendMessage } = useChat();
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!currentConversation) {
      startConversation(undefined, undefined);
    }
  }, []);

  async function handleSend(content?: string) {
    const msg = content ?? text.trim();
    if (!msg) return;
    setText("");
    setIsTyping(true);
    await sendMessage(msg);
    setIsTyping(false);
  }

  const messages = currentConversation?.messages ?? [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
          <Feather name="cpu" size={18} color="#fff" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.textPrimary }]}>Especialista AutoCare AI</Text>
          <Text style={[styles.headerStatus, { color: colors.success }]}>● online agora</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={isTyping ? <TypingIndicator colors={colors} /> : null}
        ListEmptyComponent={
          <View style={styles.quickRepliesEmpty}>
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => handleSend(q)}
                style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => <ChatBubble message={item} colors={colors} />}
      />

      {messages.length > 0 && (
        <View style={[styles.quickRepliesRow]}>
          <FlatList
            horizontal
            data={QUICK_REPLIES}
            keyExtractor={(q) => q}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSend(item)}
                style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Pergunte ao especialista…"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!text.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() ? colors.primary : colors.border },
          ]}
          activeOpacity={0.8}
        >
          <Feather name={text.trim() ? "arrow-up" : "mic"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  headerStatus: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: "column",
  },
  bubbleWrapper: {
    marginBottom: spacing.sm,
    maxWidth: "80%",
  },
  bubbleWrapperUser: {
    alignSelf: "flex-end",
  },
  bubble: {
    padding: 12,
    borderRadius: 14,
  },
  bubbleAI: {
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  typingDots: {
    fontSize: 18,
    letterSpacing: 3,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    alignSelf: "flex-end",
  },
  quickRepliesEmpty: {
    gap: spacing.sm,
    padding: spacing.md,
    transform: [{ scaleY: -1 }],
  },
  quickRepliesRow: {
    paddingVertical: spacing.xs,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
