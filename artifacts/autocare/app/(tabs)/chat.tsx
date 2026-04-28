import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage, Conversation, useChatStore } from "@/store/chatStore";
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

function ConversationItem({
  conv, isActive, onPress, colors,
}: {
  conv: Conversation; isActive: boolean; onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const lastMsg = conv.messages[conv.messages.length - 1];
  const date = new Date(conv.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.convItem,
        {
          backgroundColor: isActive ? colors.primaryLight : colors.surface,
          borderColor: isActive ? colors.primary : colors.border,
        }
      ]}
    >
      <View style={styles.convItemLeft}>
        <Text style={[styles.convTitle, { color: isActive ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
          {conv.vehicleName ?? "Conversa"}
        </Text>
        <Text style={[styles.convPreview, { color: colors.textSecondary }]} numberOfLines={1}>
          {lastMsg?.content.slice(0, 50) ?? "…"}
        </Text>
      </View>
      <Text style={[styles.convDate, { color: colors.textSecondary }]}>{date}</Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    conversations,
    getCurrentConversation,
    startConversation,
    sendMessage,
    setCurrentId,
    isStreaming,
  } = useChatStore();
  const [text, setText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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

  if (showHistory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) },
        ]}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerName, { color: colors.textPrimary }]}>Histórico de Conversas</Text>
          <TouchableOpacity
            onPress={() => { startConversation(); setShowHistory(false); }}
            style={styles.iconBtn}
            testID="new-conversation-btn"
          >
            <Feather name="plus" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyHistory}>
              <Feather name="message-circle" size={48} color={colors.border} />
              <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>
                Nenhuma conversa ainda
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ConversationItem
              conv={item}
              isActive={item.id === conv?.id}
              onPress={() => { setCurrentId(item.id); setShowHistory(false); }}
              colors={colors}
            />
          )}
        />
      </View>
    );
  }

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
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.iconBtn} testID="show-history-btn">
          <Feather name="clock" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => startConversation()} style={styles.iconBtn} testID="new-conv-btn">
          <Feather name="plus-circle" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          {isStreaming ? <TypingDots colors={colors} /> : null}
          <Text style={[styles.emptyChat, { color: colors.textSecondary }]}>
            Faça uma pergunta sobre seu veículo...
          </Text>
          <View style={styles.quickChipsCol}>
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
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={isStreaming ? <TypingDots colors={colors} /> : null}
          renderItem={({ item }) => <ChatBubble msg={item} colors={colors} />}
        />
      )}

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
        <TouchableOpacity
          style={[styles.micBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          accessibilityLabel="Entrada por voz (em breve)"
          accessibilityHint="Microfone para entrada por voz — funcionalidade em breve"
          testID="mic-btn"
        >
          <Feather name="mic" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <RNTextInput
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
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
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
  emptyStateContainer: { flex: 1, padding: spacing.xl, justifyContent: "center" },
  emptyChat: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: spacing.md },
  quickChipsCol: { gap: spacing.sm },
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
  micBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  historyList: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  convItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm,
  },
  convItemLeft: { flex: 1 },
  convTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  convPreview: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  convDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyHistory: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: spacing.md },
  emptyHistoryText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
