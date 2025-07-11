import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Bot, History, X, Plus } from 'lucide-react-native';
import { authManager } from '@/lib/auth';
import { chatService } from '@/lib/chat';

const AGENT_NAME = "Nova";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    // Messages will be loaded from Supabase
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [recentChats, setRecentChats] = useState<{ prompt: Message; messages: Message[] }[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize user state
    setUser(authManager.getUser());
    const unsubscribe = authManager.subscribe(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const history = await chatService.getChatHistory(user.id, 50);
      
      if (history.length === 0) {
        // Add welcome message if no history
        setMessages([{
          id: '1',
          role: 'assistant',
          content: `Hello! I'm ${AGENT_NAME}, your AI learning assistant. I'm here to help you with any questions about your studies. What would you like to learn about today?`,
          timestamp: new Date(),
        }]);
      } else {
        const formattedMessages: Message[] = history.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await chatService.sendMessage(user.id, userMessage.content);
      
      if (result.success && result.response) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Fallback response
        const fallbackResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm sorry, I'm having trouble responding right now. Please try again later.",
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openHistoryDrawer = async () => {
    if (!user) return;
    setShowHistoryDrawer(true);
    try {
      const history = await chatService.getChatHistory(user.id, 100);
      const formattedMessages: Message[] = history.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
      // Group by user prompt (session)
      const sessions: { prompt: Message; messages: Message[] }[] = [];
      let currentSession: { prompt: Message | null; messages: Message[] } = { prompt: null, messages: [] };
      for (let i = 0; i < formattedMessages.length; i++) {
        const msg = formattedMessages[i];
        if (msg.role === 'user') {
          if (currentSession.prompt) {
            sessions.push({ prompt: currentSession.prompt, messages: [...currentSession.messages] });
          }
          currentSession = { prompt: msg, messages: [msg] };
        } else {
          if (currentSession.prompt) {
            currentSession.messages.push(msg);
          }
        }
      }
      if (currentSession.prompt) {
        sessions.push({ prompt: currentSession.prompt, messages: [...currentSession.messages] });
      }
      // Show only the latest 10 sessions, most recent first
      setRecentChats(sessions.reverse().slice(0, 10));
    } catch (error) {
      setRecentChats([]);
    }
  };

  const handleRecentChatPress = (msgId: string) => {
    setShowHistoryDrawer(false);
    setTimeout(() => {
      const index = messages.findIndex(m => m.id === msgId);
      if (index !== -1 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: index * 80, animated: true });
        setHighlightedMessageId(msgId);
        setTimeout(() => setHighlightedMessageId(null), 1500);
      }
    }, 300);
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowHistoryDrawer(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0a2342', '#19376d']} style={styles.gradient}>
          <View style={styles.centerContainer}>
            <Text style={styles.signInPrompt}>Please sign in to start chatting with Nova</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a2342', '#19376d']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.agentInfo}>
              <View style={styles.agentAvatar}>
                <Bot size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.agentName}>{AGENT_NAME}</Text>
                <Text style={styles.agentStatus}>AI Learning Assistant</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={openHistoryDrawer}
              accessibilityLabel="Show recent chats"
            >
              <History size={24} color={showHistoryDrawer ? "#21a1ff" : "#fff"} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, idx) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
                  highlightedMessageId === message.id && styles.highlightedMessage
                ]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.messageAvatar}>
                    <Bot size={20} color="#21a1ff" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userText : styles.assistantText
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.role === 'user' ? styles.userTime : styles.assistantTime
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
            
            {isLoading && (
              <View style={styles.assistantMessageContainer}>
                <View style={styles.messageAvatar}>
                  <Bot size={20} color="#21a1ff" />
                </View>
                <View style={styles.assistantBubble}>
                  <Text style={styles.assistantText}>
                    {AGENT_NAME} is typing...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Side Drawer for Recent Chats */}
          {showHistoryDrawer && (
            <View style={styles.drawerOverlay}>
              <TouchableOpacity style={styles.drawerBackdrop} onPress={() => setShowHistoryDrawer(false)} />
              <View style={styles.drawer}>
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>Recent Chats</Text>
                  <View style={styles.drawerHeaderActions}>
                    <TouchableOpacity onPress={handleNewChat} style={styles.drawerNewChat} accessibilityLabel="New chat">
                      <Plus size={22} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowHistoryDrawer(false)}>
                      <X size={24} color="#233e6a" />
                    </TouchableOpacity>
                  </View>
                </View>
                <ScrollView style={styles.drawerContent}>
                  {recentChats.length === 0 ? (
                    <Text style={styles.drawerEmpty}>No recent chats</Text>
                  ) : (
                    recentChats.map((session, idx) => (
                      <TouchableOpacity key={session.prompt.id} style={styles.drawerMessage} onPress={() => handleRecentChatPress(session.prompt.id)}>
                        <Text style={styles.drawerMessageText} numberOfLines={2}>
                          {session.prompt.content}
                        </Text>
                        {session.messages.length > 1 && (
                          <Text style={styles.drawerMessagePreview} numberOfLines={1}>
                            {session.messages[1].content}
                          </Text>
                        )}
                        <Text style={styles.drawerMessageTime}>
                          {formatTime(session.prompt.timestamp)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask me anything about learning..."
                placeholderTextColor="#7ea2e6"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isLoading) && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading}
              >
                <Send size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#21a1ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  agentStatus: {
    fontSize: 14,
    color: '#a0bfff',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingTop: 10,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 16,
  },
  userBubble: {
    backgroundColor: '#21a1ff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 4,
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#233e6a',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  userTime: {
    color: '#fff',
    textAlign: 'right',
  },
  assistantTime: {
    color: '#666',
  },
  inputContainer: {
    padding: 20,
    paddingTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#162447',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    backgroundColor: '#21a1ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signInPrompt: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderText: {
    color: '#a0bfff',
    fontWeight: 'bold',
    fontSize: 14,
    backgroundColor: 'rgba(33, 161, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calendarButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 100,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  drawer: {
    width: 320,
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#233e6a',
  },
  drawerContent: {
    maxHeight: 500,
  },
  drawerEmpty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  drawerMessage: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ef',
    paddingVertical: 12,
  },
  drawerMessageText: {
    color: '#233e6a',
    fontSize: 15,
    marginBottom: 4,
  },
  drawerMessageTime: {
    color: '#a0bfff',
    fontSize: 12,
    textAlign: 'right',
  },
  highlightedMessage: {
    backgroundColor: '#ffe066',
    borderRadius: 12,
    opacity: 0.7,
  },
  drawerMessagePreview: {
    color: '#666',
    fontSize: 13,
    marginBottom: 2,
  },
  drawerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerNewChat: {
    marginRight: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
});