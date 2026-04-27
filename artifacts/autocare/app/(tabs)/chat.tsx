import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { ChatMessage, useChatStore } from "@/store/chatStore";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";

const QUICK_REPLIES = ["Como trocar o óleo?", "Qual produto comprar?", "Isso é urgente?", "Posso fazer sozinho?"];

function TypingDots({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surface }]}>
      <Text style={[styles.typingDots, { color: colors.textSecondary }]}>●●●</Text>
    </View>
  );
}

function ChatBubble({ msg, colors }: { msg: ChatMessage; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const isUser = msg.role === "user";
  const time = new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[styles.bubbleWrapper, isUser && styles.bubbleWrapperUser]}>
      <View style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: colors.primary }]
          : [styles.bubbleAI, { backgroundColor: colors.surface }],
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.textPrimary }]}>
          {msg.content || "…"}
        </Text>
      </View>
      <Text style={[styles.timestamp, { color: colors.textSecondary, alignSelf: isUser ? "flex-end" : "flex-start" }]}>{time}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getCurrentConversation, startConversation, sendMessage, isStreaming } = useChatStore();
  const [text, setText] = useState("");

  const conv = getCurrentConversation();

  useEffect(() => {
    if (!conv) startConversation();
  }, []);

  async function handleSend(content?: string) {
    const msg = content ?? text.trim();
    if (!msg || isStreaming) return;
    setText("");
    await sendMessage(msg);
  }

  const messages = conv?.messages ?? [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[
        styles.header,
        { borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) },
      ]}>
        <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
          <Feather name="cpu" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: colors.textPrimary }]}>Especialista AutoCare AI</Text>
          <Text style={[styles.headerStatus, { color: isStreaming ? colors.warning : colors.success }]}>
            {isStreaming ? "● digitando…" : "● online agora"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => startConversation()}>
          <Feather name="plus-circle" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        inverted
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={isStreaming ? <TypingDots colors={colors} /> : null}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, transform: [{ scaleY: -1 }] }}>
            <Text style={[styles.emptyChat, { color: colors.textSecondary }]}>
              Faça uma pergunta sobre seu veículo...
            </Text>
            {QUICK_REPLIES.map(q => (
              <TouchableOpacity
                key={q}
                onPress={() => handleSend(q)}
                style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => <ChatBubble msg={item} colors={colors} />}
      />

      {messages.length > 0 && (
        <FlatList
          horizontal
          data={QUICK_REPLIES}
          keyExtractor={q => q}
          style={styles.quickRepliesBar}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSend(item)}
              style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.quickChipText, { color: colors.primary }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={[
        styles.inputBar,
        { borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.sm + (Platform.OS === "web" ? 34 : 0) },
      ]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Pergunte ao especialista…"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
          testID="chat-input"
        />
        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!text.trim() || isStreaming}
          style={[styles.sendBtn, { backgroundColor: text.trim() && !isStreaming ? colors.primary : colors.border }]}
          activeOpacity={0.8}
          testID="send-btn"
        >
          <Feather name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1,
  },
  aiAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  headerStatus: { fontSize: 11, fontFamily: "Inter_400Regular" },
  messageList: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  bubbleWrapper: { marginBottom: spacing.sm, maxWidth: "80%" },
  bubbleWrapperUser: { alignSelf: "flex-end" },
  bubble: { padding: 12, borderRadius: 14 },
  bubbleAI: { borderBottomLeftRadius: 4, alignSelf: "flex-start" },
  bubbleUser: { borderBottomRightRadius: 4, alignSelf: "flex-end" },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  typingDots: { fontSize: 18, letterSpacing: 3 },
  timestamp: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyChat: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: spacing.md },
  quickRepliesBar: { maxHeight: 44, paddingVertical: spacing.xs },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22,
    borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
