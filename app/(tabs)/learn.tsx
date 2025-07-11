import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Play, Users, Lightbulb, PenTool, ChevronDown, ChevronRight, CircleCheck as CheckCircle, Circle, ChartBar as BarChart3 } from 'lucide-react-native';
import { authManager } from '@/lib/auth';
import { learningService } from '@/lib/learning';
import LessonViewer from '@/components/LessonViewer';

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  lessons: Lesson[];
  progress: number;
  expanded: boolean;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  completed: boolean;
  progress: number;
}

const learningTopics: Topic[] = [
  {
    id: 'programming',
    title: 'Programming Fundamentals',
    description: 'Core programming concepts and languages',
    icon: BookOpen,
    color: '#21a1ff',
    expanded: false,
    progress: 0,
    lessons: [
      {
        id: 'variables-data-types',
        title: 'Variables and Data Types',
        description: 'Understanding basic data structures',
        duration: '15 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'control-structures',
        title: 'Control Structures',
        description: 'Loops, conditionals, and flow control',
        duration: '20 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'functions-methods',
        title: 'Functions and Methods',
        description: 'Creating reusable code blocks',
        duration: '25 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
      {
        id: 'object-oriented-programming',
        title: 'Object-Oriented Programming',
        description: 'Classes, objects, and inheritance',
        duration: '30 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
    ],
  },
  {
    id: 'web-development',
    title: 'Web Development',
    description: 'Frontend and backend web technologies',
    icon: Play,
    color: '#ff6b35',
    expanded: false,
    progress: 0,
    lessons: [
      {
        id: 'html-basics',
        title: 'HTML Fundamentals',
        description: 'Structure and markup language',
        duration: '18 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'css-styling',
        title: 'CSS Styling',
        description: 'Design and layout techniques',
        duration: '22 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'javascript-basics',
        title: 'JavaScript Basics',
        description: 'Interactive web programming',
        duration: '28 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
      {
        id: 'responsive-design',
        title: 'Responsive Design',
        description: 'Mobile-first development',
        duration: '25 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
    ],
  },
  {
    id: 'data-science',
    title: 'Data Science',
    description: 'Analytics, statistics, and machine learning',
    icon: BarChart3,
    color: '#4ade80',
    expanded: false,
    progress: 0,
    lessons: [
      {
        id: 'statistics-basics',
        title: 'Statistics Fundamentals',
        description: 'Descriptive and inferential statistics',
        duration: '20 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'data-visualization',
        title: 'Data Visualization',
        description: 'Charts, graphs, and visual analytics',
        duration: '25 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
      {
        id: 'machine-learning-intro',
        title: 'Introduction to Machine Learning',
        description: 'Algorithms and model training',
        duration: '35 min',
        difficulty: 'Advanced',
        completed: false,
        progress: 0,
      },
    ],
  },
  {
    id: 'design',
    title: 'Design Principles',
    description: 'UI/UX and visual design concepts',
    icon: Lightbulb,
    color: '#f59e0b',
    expanded: false,
    progress: 0,
    lessons: [
      {
        id: 'design-fundamentals',
        title: 'Design Fundamentals',
        description: 'Color theory, typography, and layout',
        duration: '22 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'user-experience',
        title: 'User Experience Design',
        description: 'User research and interaction design',
        duration: '30 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
      {
        id: 'prototyping',
        title: 'Prototyping and Testing',
        description: 'Creating and validating design concepts',
        duration: '28 min',
        difficulty: 'Intermediate',
        completed: false,
        progress: 0,
      },
    ],
  },
  {
    id: 'project-management',
    title: 'Project Management',
    description: 'Planning, execution, and team collaboration',
    icon: Users,
    color: '#8b5cf6',
    expanded: false,
    progress: 0,
    lessons: [
      {
        id: 'agile-methodology',
        title: 'Agile Methodology',
        description: 'Scrum, sprints, and iterative development',
        duration: '25 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'team-collaboration',
        title: 'Team Collaboration',
        description: 'Communication and workflow management',
        duration: '20 min',
        difficulty: 'Beginner',
        completed: false,
        progress: 0,
      },
      {
        id: 'risk-management',
        title: 'Risk Management',
        description: 'Identifying and mitigating project risks',
        duration: '30 min',
        difficulty: 'Advanced',
        completed: false,
        progress: 0,
      },
    ],
  },
];

export default function LearnScreen() {
  const [topics, setTopics] = useState<Topic[]>(learningTopics);
  const [user, setUser] = useState(authManager.getUser());
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [showLessonViewer, setShowLessonViewer] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      loadUserProgress();
    }
  }, [user]);

  const loadUserProgress = async () => {
    if (!user) return;
    
    try {
      const progress = await learningService.getProgress(user.id);
      setUserProgress(progress);
      
      // Update topics with user progress
      const updatedTopics = topics.map(topic => {
        const topicLessons = topic.lessons.map(lesson => {
          const userLessonProgress = progress.find(p => p.topic === lesson.id);
          return {
            ...lesson,
            completed: userLessonProgress?.completed || false,
            progress: userLessonProgress?.progress || 0,
          };
        });
        
        const completedLessons = topicLessons.filter(l => l.completed).length;
        const topicProgress = topicLessons.length > 0 ? (completedLessons / topicLessons.length) * 100 : 0;
        
        return {
          ...topic,
          lessons: topicLessons,
          progress: topicProgress,
        };
      });
      
      setTopics(updatedTopics);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const toggleTopicExpansion = (topicId: string) => {
    setTopics(prevTopics =>
      prevTopics.map(topic =>
        topic.id === topicId
          ? { ...topic, expanded: !topic.expanded }
          : topic
      )
    );
  };

  const toggleAllExpansion = () => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);
    setTopics(prevTopics =>
      prevTopics.map(topic => ({ ...topic, expanded: newExpandedState }))
    );
  };

  const handleLessonPress = (lesson: Lesson, topicTitle: string) => {
    setSelectedLesson(`${topicTitle}: ${lesson.title}`);
    setSelectedLessonId(lesson.id);
    setShowLessonViewer(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return '#4ade80';
      case 'Intermediate': return '#f59e0b';
      case 'Advanced': return '#ef4444';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.title}>Learn</Text>
            <Text style={styles.subtitle}>Structured learning paths</Text>
          </View>

          {/* Expand/Collapse All */}
          <View style={styles.controlsSection}>
            <TouchableOpacity style={styles.expandButton} onPress={toggleAllExpansion}>
              <Text style={styles.expandButtonText}>
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Learning Topics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Topics</Text>
            {topics.map((topic) => {
              const IconComponent = topic.icon;
              return (
                <View key={topic.id} style={styles.topicContainer}>
                  {/* Topic Header */}
                  <TouchableOpacity
                    style={styles.topicHeader}
                    onPress={() => toggleTopicExpansion(topic.id)}
                  >
                    <View style={[styles.topicIconContainer, { backgroundColor: topic.color }]}>
                      <IconComponent size={24} color="#fff" />
                    </View>
                    <View style={styles.topicContent}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <Text style={styles.topicDescription}>{topic.description}</Text>
                      <View style={styles.topicProgressContainer}>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { width: `${topic.progress}%`, backgroundColor: topic.color }
                            ]} 
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {Math.round(topic.progress)}% complete
                        </Text>
                      </View>
                    </View>
                    <View style={styles.expandIcon}>
                      {topic.expanded ? (
                        <ChevronDown size={20} color="#21a1ff" />
                      ) : (
                        <ChevronRight size={20} color="#21a1ff" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Lessons List */}
                  {topic.expanded && (
                    <View style={styles.lessonsContainer}>
                      {topic.lessons.map((lesson, index) => (
                        <TouchableOpacity
                          key={lesson.id}
                          style={[
                            styles.lessonCard,
                            index === topic.lessons.length - 1 && styles.lastLessonCard
                          ]}
                          onPress={() => handleLessonPress(lesson, topic.title)}
                        >
                          <View style={styles.lessonStatus}>
                            {lesson.completed ? (
                              <CheckCircle size={20} color="#4ade80" />
                            ) : (
                              <Circle size={20} color="#666" />
                            )}
                          </View>
                          <View style={styles.lessonContent}>
                            <Text style={styles.lessonTitle}>{lesson.title}</Text>
                            <Text style={styles.lessonDescription}>{lesson.description}</Text>
                            <View style={styles.lessonMeta}>
                              <View style={styles.lessonMetaItem}>
                                <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                              </View>
                              <View style={[
                                styles.difficultyBadge,
                                { backgroundColor: getDifficultyColor(lesson.difficulty) }
                              ]}>
                                <Text style={styles.difficultyText}>{lesson.difficulty}</Text>
                              </View>
                            </View>
                            {lesson.progress > 0 && !lesson.completed && (
                              <View style={styles.lessonProgressContainer}>
                                <View style={styles.lessonProgressBar}>
                                  <View 
                                    style={[
                                      styles.lessonProgressFill, 
                                      { width: `${lesson.progress}%` }
                                    ]} 
                                  />
                                </View>
                                <Text style={styles.lessonProgressText}>
                                  {lesson.progress}% complete
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
        
        <LessonViewer
          isVisible={showLessonViewer}
          onClose={() => {
            setShowLessonViewer(false);
            loadUserProgress(); // Refresh progress when lesson closes
          }}
          lessonTitle={selectedLesson}
          lessonId={selectedLessonId}
        />
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0bfff',
    textAlign: 'center',
  },
  controlsSection: {
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  expandButton: {
    backgroundColor: 'rgba(33, 161, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#21a1ff',
  },
  expandButtonText: {
    color: '#21a1ff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  topicContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  topicHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#233e6a',
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  topicProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e7ef',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  expandIcon: {
    marginLeft: 12,
  },
  lessonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: -4,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#21a1ff',
  },
  lastLessonCard: {
    marginBottom: 0,
  },
  lessonStatus: {
    marginRight: 16,
    marginTop: 2,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#233e6a',
    marginBottom: 4,
  },
  lessonDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonDuration: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lessonProgressContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e7ef',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  lessonProgressFill: {
    height: '100%',
    backgroundColor: '#21a1ff',
    borderRadius: 2,
  },
  lessonProgressText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
});