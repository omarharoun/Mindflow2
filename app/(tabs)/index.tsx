import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Trophy, Flame, Play, X as LucideX } from 'lucide-react-native';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react-native';
import { authManager } from '@/lib/auth';
import { learningService } from '@/lib/learning';
import AuthModal from '@/components/AuthModal';
import LessonViewer from '@/components/LessonViewer';

const { width } = Dimensions.get('window');

const AGENT_NAME = "Nova";
const AGENT_EMOJI = "🤖";

interface RecentTopic {
  id: string;
  title: string;
  dbKey: string;
  lastAccessed: Date;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lessons: RecentLesson[];
  expanded: boolean;
}

interface RecentLesson {
  id: string;
  title: string;
  dbTopic: string;
  progress: number;
  completed: boolean;
  duration: string;
}

function MindFlowLogo() {
  return (
    <Text style={styles.textLogo}>MindFlow</Text>
  );
}

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.agentRow}>
      <View style={styles.agentAvatar}>
        <Text style={styles.agentEmoji}>{AGENT_EMOJI}</Text>
      </View>
      <View style={styles.agentBubble}>
        <Text style={styles.agentText}>{children}</Text>
      </View>
    </View>
  );
}

function ResourceCard({ 
  icon, 
  title, 
  description, 
  onPress 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.resourceCard} onPress={onPress}>
      <View style={styles.resourceIcon}>{icon}</View>
      <View style={styles.resourceContent}>
        <Text style={styles.resourceTitle}>{title}</Text>
        <Text style={styles.resourceDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(authManager.getUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [generatedPaths, setGeneratedPaths] = useState<string[]>([]);
  const [recentTopics, setRecentTopics] = useState<RecentTopic[]>([]);
  const [showLessonViewer, setShowLessonViewer] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string>('');

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      loadRecentTopics();
    }
  }, [user]);

  const loadRecentTopics = async () => {
    if (!user) return;
    
    try {
      const progress = await learningService.getProgress(user.id);
      
      // Group progress by topic and create recent topics
      const topicGroups: { [key: string]: any[] } = {};
      
      progress.forEach(item => {
        const topicKey = item.topic.split(':')[0] || item.topic;
        if (!topicGroups[topicKey]) {
          topicGroups[topicKey] = [];
        }
        topicGroups[topicKey].push(item);
      });
      
      const topics: RecentTopic[] = Object.entries(topicGroups)
        .map(([topicKey, lessons]) => {
          const completedLessons = lessons.filter(l => l.completed).length;
          const totalProgress = lessons.reduce((sum, l) => sum + l.progress, 0);
          const avgProgress = lessons.length > 0 ? totalProgress / lessons.length : 0;
          const lastAccessed = new Date(Math.max(...lessons.map(l => new Date(l.updated_at).getTime())));
          return {
            id: topicKey.toLowerCase().replace(/\s+/g, '-'),
            title: topicKey,
            dbKey: topicKey,
            lastAccessed,
            progress: avgProgress,
            totalLessons: lessons.length,
            completedLessons,
            expanded: false,
            lessons: lessons.map(lesson => ({
              id: lesson.id,
              title: lesson.topic.includes(':') ? lesson.topic.split(':')[1].trim() : lesson.topic,
              dbTopic: lesson.topic,
              progress: lesson.progress,
              completed: lesson.completed,
              duration: '15 min', // Default duration
            })),
          };
        })
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 5);
      
      setRecentTopics(topics);
    } catch (error) {
      console.error('Error loading recent topics:', error);
    }
  };

  const toggleTopicExpansion = (topicId: string) => {
    setRecentTopics(prev =>
      prev.map(topic =>
        topic.id === topicId
          ? { ...topic, expanded: !topic.expanded }
          : topic
      )
    );
  };

  const handleRecentLessonPress = (topic: RecentTopic, lesson: RecentLesson) => {
    setSelectedLesson(`${topic.title}: ${lesson.title}`);
    setShowLessonViewer(true);
  };

  const handleRemoveRecentLesson = async (topic: RecentTopic, lesson: RecentLesson) => {
    if (!user) return;
    try {
      // Remove from DB
      await learningService.removeLessonProgress(user.id, lesson.dbTopic);
      // Update UI
      loadRecentTopics();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove lesson');
    }
  };

  const formatLastAccessed = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleSubmit = async () => {
    if (!input.trim() || !user) return;
    
    const userMsg = input;
    setInput("");
    setSubmitted(true);
    setLoading(true);
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    
    try {
      // Generate learning paths using AI
      const paths = await learningService.generateLearningPath(userMsg);
      setGeneratedPaths(paths);
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Great! I can help you learn about "${userMsg}". I've generated some personalized learning paths for you below.`
      }]);
      
      // Award XP for starting a new topic
      await learningService.awardXP(user.id, 10);
      
      // Update user data
      const updatedUser = authManager.getUser();
      if (updatedUser) {
        setUser({ ...updatedUser, xp: updatedUser.xp + 10 });
      }
      
      // Reload recent topics to reflect new activity
      loadRecentTopics();
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I can help you learn about "${userMsg}". Let me suggest some learning paths for you!`
      }]);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResourcePress = async (path: string) => {
    if (!user) return;
    
    // Add to user's learning list and open lesson viewer
    setSelectedLesson(path);
    setShowLessonViewer(true);
    
    try {
      // Initialize progress for this lesson
      await learningService.updateProgress(user.id, path, 0);
    } catch (error) {
      console.error('Error starting lesson:', error);
    }
  };

  const handleAuthSuccess = (authUser: any) => {
    setUser(authUser);
    setShowAuthModal(false);
  };

  if (!user) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <LinearGradient colors={['#0a2342', '#19376d']} style={styles.gradient}>
            <View style={styles.centerContainer}>
              <Text style={styles.textLogo}>MindFlow</Text>
              <Text style={styles.subtitle}>Welcome to the next big thing in Learning</Text>
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => setShowAuthModal(true)}
              >
                <Text style={styles.signInButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </SafeAreaView>
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#0a2342', '#19376d']}
          style={styles.gradient}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <MindFlowLogo />
              <Text style={styles.subtitle}>
                Welcome back, {user.name}!
              </Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Trophy size={24} color="#21a1ff" />
                <Text style={styles.statValue}>{user.xp}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
              <View style={styles.statCard}>
                <Flame size={24} color="#ff6b35" />
                <Text style={styles.statValue}>{user.streak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>

            {/* Chat Interface */}
            <View style={styles.chatBox}>
              <View style={styles.chatHistory}>
                {chatMessages.length === 0 && (
                  <AgentBubble>
                    Hello! I'm {AGENT_NAME}. What are you learning today?
                  </AgentBubble>
                )}
                {chatMessages.map((msg, idx) => (
                  <View key={idx} style={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
                    <Text style={styles.messageText}>
                      <Text style={styles.messageSender}>
                        {msg.role === 'user' ? 'You' : AGENT_NAME}:
                      </Text> {msg.content}
                    </Text>
                  </View>
                ))}
                {loading && (
                  <View style={styles.assistantMessage}>
                    <Text style={styles.messageText}>
                      <Text style={styles.messageSender}>{AGENT_NAME}:</Text> Generating learning paths...
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="What are you learning today?"
                  placeholderTextColor="#7ea2e6"
                  value={input}
                  onChangeText={setInput}
                  multiline={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity 
                  style={styles.sendButton} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.sendButtonText}>➤</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Learning Paths */}
            {submitted && generatedPaths.length > 0 && (
              <View style={styles.learningSection}>
                <Text style={styles.sectionTitle}>Generated Learning Path</Text>
                {generatedPaths.map((path, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.pathButton}
                    onPress={() => handleResourcePress(path)}
                  >
                    <Play size={20} color="#21a1ff" />
                    <Text style={styles.pathButtonText}>{path}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Topics */}
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Topics</Text>
              {recentTopics.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Start learning to see your recent topics here!
                  </Text>
                </View>
              ) : (
                recentTopics.map((topic) => (
                  <View key={topic.id} style={styles.recentTopicContainer}>
                    <TouchableOpacity
                      style={styles.recentTopicHeader}
                      onPress={() => toggleTopicExpansion(topic.id)}
                    >
                      <View style={styles.recentTopicContent}>
                        <Text style={styles.recentTopicTitle}>{topic.title}</Text>
                        <View style={styles.recentTopicMeta}>
                          <View style={styles.recentTopicMetaItem}>
                            <Clock size={14} color="#666" />
                            <Text style={styles.recentTopicTime}>
                              {formatLastAccessed(topic.lastAccessed)}
                            </Text>
                          </View>
                          <Text style={styles.recentTopicProgress}>
                            {topic.completedLessons}/{topic.totalLessons} lessons • {Math.round(topic.progress)}%
                          </Text>
                        </View>
                        <View style={styles.recentProgressBar}>
                          <View 
                            style={[
                              styles.recentProgressFill, 
                              { width: `${topic.progress}%` }
                            ]} 
                          />
                        </View>
                      </View>
                      <View style={styles.expandIconRow}>
                        <TouchableOpacity
                          style={styles.recentTopicRemove}
                          onPress={async () => {
                            if (!user) return;
                            try {
                              await learningService.removeTopicProgress(user.id, topic.dbKey);
                              loadRecentTopics();
                            } catch (error) {
                              Alert.alert('Error', 'Failed to remove topic');
                            }
                          }}
                          accessibilityLabel="Remove topic"
                        >
                          <LucideX size={20} color="#888" />
                        </TouchableOpacity>
                        {topic.expanded ? (
                          <ChevronDown size={20} color="#21a1ff" />
                        ) : (
                          <ChevronRight size={20} color="#21a1ff" />
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {topic.expanded && (
                      <View style={styles.recentLessonsContainer}>
                        {topic.lessons.map((lesson) => (
                          <View key={lesson.id} style={styles.recentLessonRow}>
                            <TouchableOpacity
                              style={styles.recentLessonCard}
                              onPress={() => handleRecentLessonPress(topic, lesson)}
                            >
                              <View style={styles.recentLessonStatus}>
                                {lesson.completed ? (
                                  <View style={styles.completedDot} />
                                ) : (
                                  <View style={styles.incompleteDot} />
                                )}
                              </View>
                              <View style={styles.recentLessonContent}>
                                <Text style={styles.recentLessonTitle}>{lesson.title}</Text>
                                <View style={styles.recentLessonMeta}>
                                  <Text style={styles.recentLessonDuration}>{lesson.duration}</Text>
                                  {lesson.progress > 0 && !lesson.completed && (
                                    <Text style={styles.recentLessonProgressText}>
                                      {lesson.progress}% complete
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.recentLessonRemove}
                              onPress={async () => {
                                if (!user) return;
                                try {
                                  await learningService.removeLessonProgress(user.id, lesson.dbTopic);
                                  loadRecentTopics();
                                } catch (error) {
                                  Alert.alert('Error', 'Failed to remove lesson');
                                }
                              }}
                              accessibilityLabel="Remove lesson"
                            >
                              <LucideX size={18} color="#888" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
      <LessonViewer
        isVisible={showLessonViewer}
        onClose={() => setShowLessonViewer(false)}
        lessonTitle={selectedLesson}
        lessonId={selectedLesson}
      />
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  textLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#a0bfff',
    marginTop: 4,
  },
  chatBox: {
    backgroundColor: '#162447',
    borderRadius: 18,
    padding: 20,
    marginBottom: 30,
  },
  chatHistory: {
    marginBottom: 16,
    maxHeight: 200,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
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
  agentEmoji: {
    fontSize: 24,
  },
  agentBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    padding: 16,
    flex: 1,
    maxWidth: width * 0.7,
  },
  agentText: {
    color: '#233e6a',
    fontSize: 16,
    fontWeight: '500',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e6f0ff',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  messageText: {
    color: '#233e6a',
    fontSize: 16,
  },
  messageSender: {
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#233e6a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#21a1ff',
    borderRadius: 8,
    padding: 12,
    minWidth: 48,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  learningSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  pathButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathButtonText: {
    color: '#233e6a',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  recentSection: {
    marginBottom: 30,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  recentTopicContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  recentTopicHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTopicContent: {
    flex: 1,
  },
  recentTopicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#233e6a',
    marginBottom: 8,
  },
  recentTopicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTopicMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTopicTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  recentTopicProgress: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  recentProgressBar: {
    height: 4,
    backgroundColor: '#e0e7ef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  recentProgressFill: {
    height: '100%',
    backgroundColor: '#21a1ff',
    borderRadius: 2,
  },
  expandIcon: {
    marginLeft: 12,
  },
  recentLessonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recentLessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#21a1ff',
  },
  recentLessonStatus: {
    marginRight: 12,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  incompleteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e7ef',
  },
  recentLessonContent: {
    flex: 1,
  },
  recentLessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#233e6a',
    marginBottom: 4,
  },
  recentLessonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentLessonDuration: {
    fontSize: 12,
    color: '#666',
  },
  recentLessonProgressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signInButton: {
    backgroundColor: '#21a1ff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 30,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  resourceIcon: {
    marginRight: 16,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#233e6a',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666',
  },
  recentLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentLessonRemove: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  expandIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  recentTopicRemove: {
    marginRight: 8,
    padding: 4,
  },
});