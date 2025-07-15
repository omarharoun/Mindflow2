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
import { authManager } from '../lib/auth';
import { learningService } from '../lib/learning';
import { openRouterAPI, generateFreeModelResponse } from '../lib/openrouter';

interface LessonSegment {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
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

// Utility to split text into boxes of up to 144 words
function splitIntoBoxes(text: string, maxWords = 144, maxBoxes = 5): string[] {
  const words = text.split(/\s+/);
  const boxes = [];
  for (let i = 0; i < words.length && boxes.length < maxBoxes; i += maxWords) {
    boxes.push(words.slice(i, i + maxWords).join(' '));
  }
  return boxes;
}

// Utility to extract the largest valid JSON array from a string (even if truncated)
function extractLargestValidJsonArray(text: string): any[] | null {
  const start = text.indexOf('[');
  if (start === -1) return null;
  let end = text.length;
  while (end > start) {
    try {
      return JSON.parse(text.slice(start, end));
    } catch {
      end--;
    }
  }
  return null;
}

// Utility to extract all valid lesson segment objects from a string
function extractAllValidSegments(text: string): any[] {
  const objects = [];
  const regex = /{[^}]*}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      objects.push(JSON.parse(match[0]));
    } catch {
      // skip invalid objects
    }
  }
  return objects;
}

// Utility to extract the first JSON array or object from a string, stripping code blocks and extra text
function extractFirstJsonBlock(text: string): string | null {
  // Remove code block wrappers
  let cleaned = text.replace(/```json|```/gi, '').trim();
  // Try to find the first JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];
  // Try to find the first JSON object
  const objectMatch = cleaned.match(/{[\s\S]*}/);
  if (objectMatch) return objectMatch[0];
  return null;
}

// Utility to extract JSON between <output>...</output> tags
function extractJsonBetweenTags(text: string): string | null {
  const match = text.match(/<output>([\s\S]*?)<\/output>/i);
  return match ? match[1].trim() : null;
}

// Simple JSON repair: closes unclosed brackets/braces (best effort)
function simpleJsonRepair(jsonStr: string): string {
  let repaired = jsonStr;
  // Add missing closing brackets/braces
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
  repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
  return repaired;
}

export default function LessonViewer({ isVisible, onClose, lessonTitle, lessonId }: LessonViewerProps) {
  const [segments, setSegments] = useState<LessonSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [user, setUser] = useState(authManager.getUser());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<{error?: string, aiResponse?: string, rawJsonExtracted?: string}>({});

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
    setDebugInfo({});
    try {
      // 1. Try to fetch the lesson from the database
      const dbLesson = await learningService.getLesson(lessonId);
      if (dbLesson && Array.isArray(dbLesson)) {
        setSegments(dbLesson);
        setStartTime(new Date());
        setLoading(false);
        return;
      }
      // 2. If not found, generate with AI
      const aiPrompt = `Return a single lesson section as a JSON object, not in an array, and enclose it in <output>...</output> tags. Keep the content under 2 sentences. Example:\n<output>\n{\n  \"id\": \"1\",\n  \"title\": \"What is a Supernova?\",\n  \"content\": \"A supernova is the explosive death of a massive star.\",\n  \"keyPoints\": [\"Explosive death of a star\"],\n  \"question\": {\n    \"text\": \"What is a supernova?\",\n    \"options\": [\"A new star\", \"A star exploding\", \"A planet\", \"A comet\"],\n    \"correctAnswer\": 1,\n    \"explanation\": \"A supernova is a star exploding.\"\n  },\n  \"completed\": false\n}\n</output>\nTopic: ${lessonTitle}`;
      let aiResponse = '';
      let segments: LessonSegment[] = [];
      try {
        aiResponse = await generateFreeModelResponse([
          { role: 'user', content: aiPrompt }
        ]);
        let parsed;
        let rawJsonExtracted = '';
        // Try extracting JSON between <output> tags
        const jsonBetweenTags = extractJsonBetweenTags(aiResponse);
        if (jsonBetweenTags) {
          rawJsonExtracted = jsonBetweenTags;
          try {
            parsed = JSON.parse(jsonBetweenTags);
          } catch (e) {
            // Try simple repair and parse again
            try {
              parsed = JSON.parse(simpleJsonRepair(jsonBetweenTags));
            } catch {
              parsed = null;
            }
          }
        }
        // Fallback to previous extraction if needed
        if (!parsed) {
          const jsonBlock = extractFirstJsonBlock(aiResponse);
          if (jsonBlock) rawJsonExtracted = jsonBlock;
          if (!jsonBlock) throw new Error('No JSON found in AI response');
          parsed = JSON.parse(jsonBlock);
        }
        if (parsed) {
          if (Array.isArray(parsed)) {
            segments = parsed;
          } else {
            segments = [parsed];
          }
        } else {
          throw new Error('AI did not return a lesson object');
        }
      } catch (err) {
        setDebugInfo({ error: String(err), aiResponse });
        setSegments([
          {
            id: '1',
            title: 'Lesson Not Found',
            content: 'AI failed to generate lesson content. Please try again later or contact support.',
            keyPoints: [],
            question: {
              text: 'What should you do if your lesson is not found?',
              options: [
                'Wait for content to be added',
                'Try a different lesson',
                'Contact support',
                'All of the above'
              ],
              correctAnswer: 3,
              explanation: 'If a lesson is not found, you can try a different lesson, wait for content to be added, or contact support.',
            },
            completed: false
          }
        ]);
        Alert.alert('AI Error', 'Failed to generate or parse lesson content. See debug info below.');
        setLoading(false);
        return;
      }
      setSegments(segments);
      try {
        const saveResult = await learningService.saveLesson(lessonId, lessonTitle, segments);
        if (!saveResult.success) {
          setDebugInfo({ error: saveResult.error, aiResponse });
          Alert.alert('Database Error', 'Failed to save lesson to database. See debug info below.');
        }
      } catch (dbErr) {
        setDebugInfo({ error: String(dbErr), aiResponse });
        Alert.alert('Database Error', 'Failed to save lesson to database. See debug info below.');
      }
      setStartTime(new Date());
    } catch (error) {
      setDebugInfo({ error: String(error) });
      setSegments([
        {
          id: '1',
          title: 'Lesson Not Found',
          content: 'No lesson content available for this topic yet. Please check back later or select a different lesson.',
          keyPoints: [],
          question: {
            text: 'What should you do if your lesson is not found?',
            options: [
              'Wait for content to be added',
              'Try a different lesson',
              'Contact support',
              'All of the above'
            ],
            correctAnswer: 3,
            explanation: 'If a lesson is not found, you can try a different lesson, wait for content to be added, or contact support.',
          },
          completed: false
        }
      ]);
      Alert.alert('Error', 'Failed to generate lesson content. See debug info below.');
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
    
    // Update progress
    const progress = Math.round(((currentSegment + 1) / segments.length) * 100);
    await learningService.updateProgress(user.id, lessonTitle, progress);

    setSelectedAnswer(null);
    setShowExplanation(false);
    setAttempts(0);

    if (currentSegment < segments.length - 1) {
      setCurrentSegment(currentSegment + 1);
      setStartTime(new Date()); // Reset timer for next segment
    } else {
      // Lesson completed
      let alertMessage = `Congratulations! You've completed "${lessonTitle}". You earned ${segments.length * 15} XP!`;
      
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
                  {/* Content Boxes */}
                  {Array.isArray((currentSegmentData as any).contentBoxes)
                    ? (currentSegmentData as any).contentBoxes.map((box: string, idx: number) => (
                        <View key={idx} style={styles.contentCard}>
                          <Text style={styles.contentText}>{box}</Text>
                        </View>
                      ))
                    : (
                      <View style={styles.contentCard}>
                        <Text style={styles.contentText}>{currentSegmentData.content}</Text>
                      </View>
                    )}
                  {/* Interactive Question */}
                  <View style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.sectionTitle}>Check Your Understanding</Text>
                      {attempts > 0 && (
                        <TouchableOpacity onPress={resetQuestion} style={styles.resetButton}>
                          <RotateCcw size={16} color="#21a1ff" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Defensive check for question */}
                    <Text style={styles.questionText}>
                      {currentSegmentData.question?.text || "No question available."}
                    </Text>
                    
                    {currentSegmentData.question?.options?.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          selectedAnswer === index && styles.selectedOption,
                          showExplanation && index === currentSegmentData.question?.correctAnswer && styles.correctOption
                        ]}
                        onPress={() => handleAnswerSelect(index)}
                        disabled={showExplanation}
                      >
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}

                    {showExplanation && (
                      <View style={styles.explanationCard}>
                        <Text style={styles.explanationTitle}>Explanation</Text>
                        <Text style={styles.explanationText}>
                          {currentSegmentData.question?.explanation}
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
      {/* Debug Info Section */}
      {(debugInfo.error || debugInfo.aiResponse) && (
        <View style={{ backgroundColor: '#222', padding: 10, margin: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Debug Info:</Text>
          {debugInfo.error && (
            <Text style={{ color: '#ff5555' }}>Error: {debugInfo.error}</Text>
          )}
          {debugInfo.aiResponse && (
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={{ color: '#fff' }}>AI Response: {debugInfo.aiResponse}</Text>
            </ScrollView>
          )}
          {debugInfo.rawJsonExtracted && (
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={{ color: '#a0e7e5' }}>Raw JSON Extracted: {debugInfo.rawJsonExtracted}</Text>
            </ScrollView>
          )}
        </View>
      )}
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
    justifyContent: 'center',
    flex: 1,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    marginHorizontal: 2,
  },
  // Add sectionTitle style
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#233e6a',
    marginBottom: 8,
  },
});