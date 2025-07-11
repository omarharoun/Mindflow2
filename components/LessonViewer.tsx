import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, CircleCheck as CheckCircle, Circle, Play, Pause, RotateCcw } from 'lucide-react-native';
import { authManager } from '@/lib/auth';
import { learningService } from '@/lib/learning';

interface LessonSegment {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  example: string;
  question: {
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  };
  completed: boolean;
}

interface LessonViewerProps {
  isVisible: boolean;
  onClose: () => void;
  lessonTitle: string;
  lessonId: string;
}

export default function LessonViewer({ isVisible, onClose, lessonTitle, lessonId }: LessonViewerProps) {
  const [segments, setSegments] = useState<LessonSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [user, setUser] = useState(authManager.getUser());

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isVisible && lessonTitle) {
      generateLessonContent();
    }
  }, [isVisible, lessonTitle]);

  const generateLessonContent = async () => {
    setLoading(true);
    try {
      // Simulate AI-generated lesson content
      // In a real app, this would call OpenRouter API
      const mockSegments: LessonSegment[] = [
        {
          id: '1',
          title: 'Introduction to ' + lessonTitle,
          content: `Welcome to your lesson on ${lessonTitle}! This foundational segment will introduce you to the core concepts and help you understand why this topic is important.\n\nWe'll start with the basics and build your understanding step by step. By the end of this segment, you'll have a solid foundation to build upon.`,
          keyPoints: [
            'Understanding the fundamental concepts',
            'Why this topic matters in real-world applications',
            'Key terminology and definitions',
            'Setting the foundation for deeper learning'
          ],
          example: `For example, if you're learning about ${lessonTitle}, think about how you encounter this concept in your daily life. This helps make abstract concepts more concrete and memorable.`,
          question: {
            text: `What is the most important first step when learning about ${lessonTitle}?`,
            options: [
              'Memorizing all the technical terms',
              'Understanding the fundamental concepts and why they matter',
              'Jumping straight into advanced topics',
              'Reading everything available on the subject'
            ],
            correctAnswer: 1,
            explanation: 'Building a strong foundation with fundamental concepts is crucial because it provides the framework for understanding more complex ideas later.'
          },
          completed: false
        },
        {
          id: '2',
          title: 'Core Principles',
          content: `Now that you understand the basics, let's dive into the core principles that govern ${lessonTitle}. These principles are the building blocks that everything else is built upon.\n\nUnderstanding these principles will help you recognize patterns and make connections as you learn more advanced concepts.`,
          keyPoints: [
            'Primary principles and how they work',
            'The relationship between different concepts',
            'Common patterns you should recognize',
            'How these principles apply in practice'
          ],
          example: `Consider how these principles work together like pieces of a puzzle. Each principle supports and reinforces the others, creating a comprehensive understanding of ${lessonTitle}.`,
          question: {
            text: 'How do the core principles work together?',
            options: [
              'They operate completely independently',
              'They work together like pieces of a puzzle, supporting each other',
              'Only one principle matters at a time',
              'They often contradict each other'
            ],
            correctAnswer: 1,
            explanation: 'Core principles in any subject work synergistically, where understanding one principle helps reinforce and deepen understanding of the others.'
          },
          completed: false
        },
        {
          id: '3',
          title: 'Practical Applications',
          content: `Let's explore how ${lessonTitle} applies in real-world scenarios. This is where theory meets practice, and you'll see how the concepts you've learned actually work in everyday situations.\n\nUnderstanding practical applications helps solidify your knowledge and shows you the value of what you're learning.`,
          keyPoints: [
            'Real-world use cases and scenarios',
            'Common challenges and how to overcome them',
            'Best practices from industry experts',
            'Tools and resources for practical application'
          ],
          example: `In professional settings, ${lessonTitle} might be applied when solving specific problems or making important decisions. The principles you've learned provide a framework for approaching these challenges systematically.`,
          question: {
            text: 'Why is understanding practical applications important?',
            options: [
              'It makes the learning more interesting',
              'It helps solidify knowledge and shows real value',
              'It\'s required for passing tests',
              'It impresses other people'
            ],
            correctAnswer: 1,
            explanation: 'Practical applications bridge the gap between theoretical knowledge and real-world utility, making learning more meaningful and memorable.'
          },
          completed: false
        }
      ];

      setSegments(mockSegments);
    } catch (error) {
      console.error('Error generating lesson content:', error);
      Alert.alert('Error', 'Failed to generate lesson content');
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentComplete = async () => {
    if (!user) return;

    // Calculate lesson duration
    const endTime = new Date();
    const duration = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) : 15;
    const targetDuration = 20; // Target time for lesson
    const completedUnderTarget = duration < targetDuration;

    const updatedSegments = [...segments];
    updatedSegments[currentSegment].completed = true;
    setSegments(updatedSegments);

    // Award XP for completing a segment
    await learningService.awardXP(user.id, 15);
    
    // Track in profile service
    await profileService.trackLessonCompletion(user.id, duration, completedUnderTarget);

    // Update progress
    const progress = Math.round(((currentSegment + 1) / segments.length) * 100);
    await learningService.updateProgress(user.id, lessonTitle, progress);

    setShowQuestion(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAttempts(0);

    if (currentSegment < segments.length - 1) {
      setCurrentSegment(currentSegment + 1);
      setStartTime(new Date()); // Reset timer for next segment
    } else {
      // Lesson completed
      const newAchievements = await profileService.checkAchievements(user.id);
      
      let alertMessage = `Congratulations! You've completed "${lessonTitle}". You earned ${segments.length * 15} XP!`;
      
      if (newAchievements.length > 0) {
        alertMessage += `\n\nNew achievements unlocked: ${newAchievements.map(a => a.title).join(', ')}!`;
      }
      
      Alert.alert(
        'Lesson Complete! 🎉',
        alertMessage,
        [{ text: 'Continue Learning', onPress: onClose }]
      );
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setAttempts(attempts + 1);
    
    const isCorrect = answerIndex === segments[currentSegment].question.correctAnswer;
    
    if (isCorrect) {
      setShowExplanation(true);
    } else {
      Alert.alert(
        'Try Again',
        'That\'s not quite right. Take another look at the lesson content and try again.',
        [{ text: 'OK', onPress: () => setSelectedAnswer(null) }]
      );
    }
  };

  const resetQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAttempts(0);
  };

  if (!isVisible) return null;

  const currentSegmentData = segments[currentSegment];
  const progress = segments.length > 0 ? ((currentSegment + 1) / segments.length) * 100 : 0;

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0a2342', '#19376d']} style={styles.gradient}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.lessonTitle} numberOfLines={1}>{lessonTitle}</Text>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentSegment + 1} of {segments.length}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Generating lesson content...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {currentSegmentData && (
                <>
                  {/* Segment Title */}
                  <Text style={styles.segmentTitle}>{currentSegmentData.title}</Text>

                  {/* Content */}
                  <View style={styles.contentCard}>
                    <Text style={styles.contentText}>{currentSegmentData.content}</Text>
                  </View>

                  {/* Key Points */}
                  <View style={styles.keyPointsCard}>
                    <Text style={styles.sectionTitle}>Key Points</Text>
                    {currentSegmentData.keyPoints.map((point, index) => (
                      <View key={index} style={styles.keyPoint}>
                        <View style={styles.bullet} />
                        <Text style={styles.keyPointText}>{point}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Example */}
                  <View style={styles.exampleCard}>
                    <Text style={styles.sectionTitle}>Example</Text>
                    <Text style={styles.exampleText}>{currentSegmentData.example}</Text>
                  </View>

                  {/* Interactive Question */}
                  {!showQuestion ? (
                    <TouchableOpacity 
                      style={styles.startQuestionButton}
                      onPress={() => setShowQuestion(true)}
                    >
                      <Play size={20} color="#fff" />
                      <Text style={styles.startQuestionText}>Test Your Understanding</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.questionCard}>
                      <View style={styles.questionHeader}>
                        <Text style={styles.sectionTitle}>Check Your Understanding</Text>
                        {attempts > 0 && (
                          <TouchableOpacity onPress={resetQuestion} style={styles.resetButton}>
                            <RotateCcw size={16} color="#21a1ff" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <Text style={styles.questionText}>{currentSegmentData.question.text}</Text>
                      
                      {currentSegmentData.question.options.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionButton,
                            selectedAnswer === index && styles.selectedOption,
                            showExplanation && index === currentSegmentData.question.correctAnswer && styles.correctOption
                          ]}
                          onPress={() => handleAnswerSelect(index)}
                          disabled={showExplanation}
                        >
                          <Text style={[
                            styles.optionText,
                            selectedAnswer === index && styles.selectedOptionText,
                            showExplanation && index === currentSegmentData.question.correctAnswer && styles.correctOptionText
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {showExplanation && (
                        <View style={styles.explanationCard}>
                          <Text style={styles.explanationTitle}>Explanation</Text>
                          <Text style={styles.explanationText}>
                            {currentSegmentData.question.explanation}
                          </Text>
                          <TouchableOpacity 
                            style={styles.continueButton}
                            onPress={handleSegmentComplete}
                          >
                            <CheckCircle size={20} color="#fff" />
                            <Text style={styles.continueButtonText}>
                              {currentSegment < segments.length - 1 ? 'Continue to Next Segment' : 'Complete Lesson'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}

          {/* Navigation */}
          {!loading && (
            <View style={styles.navigation}>
              <TouchableOpacity
                style={[styles.navButton, currentSegment === 0 && styles.navButtonDisabled]}
                onPress={() => setCurrentSegment(Math.max(0, currentSegment - 1))}
                disabled={currentSegment === 0}
              >
                <ChevronLeft size={20} color={currentSegment === 0 ? "#666" : "#21a1ff"} />
                <Text style={[styles.navButtonText, currentSegment === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.segmentIndicators}>
                {segments.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentSegment && styles.activeIndicator,
                      segments[index]?.completed && styles.completedIndicator
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  (currentSegment === segments.length - 1 || !segments[currentSegment]?.completed) && styles.navButtonDisabled
                ]}
                onPress={() => setCurrentSegment(Math.min(segments.length - 1, currentSegment + 1))}
                disabled={currentSegment === segments.length - 1 || !segments[currentSegment]?.completed}
              >
                <Text style={[
                  styles.navButtonText,
                  (currentSegment === segments.length - 1 || !segments[currentSegment]?.completed) && styles.navButtonTextDisabled
                ]}>
                  Next
                </Text>
                <ChevronRight size={20} color={
                  (currentSegment === segments.length - 1 || !segments[currentSegment]?.completed) ? "#666" : "#21a1ff"
                } />
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  lessonTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#a0bfff',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#21a1ff',
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  segmentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#233e6a',
  },
  keyPointsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#233e6a',
    marginBottom: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#21a1ff',
    marginTop: 8,
    marginRight: 12,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#233e6a',
  },
  exampleCard: {
    backgroundColor: 'rgba(33, 161, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#21a1ff',
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#233e6a',
    fontStyle: 'italic',
  },
  startQuestionButton: {
    backgroundColor: '#21a1ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  startQuestionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButton: {
    padding: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#233e6a',
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#21a1ff',
    backgroundColor: '#e6f0ff',
  },
  correctOption: {
    borderColor: '#4ade80',
    backgroundColor: '#f0fdf4',
  },
  optionText: {
    fontSize: 14,
    color: '#233e6a',
  },
  selectedOptionText: {
    color: '#21a1ff',
    fontWeight: '600',
  },
  correctOptionText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  explanationCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ade80',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#166534',
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: '#4ade80',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: '#21a1ff',
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  segmentIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#21a1ff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  completedIndicator: {
    backgroundColor: '#4ade80',
  },
});