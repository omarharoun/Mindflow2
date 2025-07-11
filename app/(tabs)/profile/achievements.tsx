import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { profileService, type Achievement } from '@/lib/profile';
import { authManager } from '@/lib/auth';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(authManager.getUser());
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userAchievements = await profileService.getAchievements(user.id);
      setAchievements(userAchievements);
    } catch (error) {
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'learning': return '#4ade80';
      case 'xp': return '#f59e0b';
      case 'special': return '#8b5cf6';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0a2342', '#19376d']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={styles.loadingText}>Loading achievements...</Text>
          ) : (
            achievements
              .slice()
              .sort((a, b) => (b.earned ? 1 : -1) - (a.earned ? 1 : -1) || a.title.localeCompare(b.title))
              .map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <View style={styles.achievementIconContainer}>
                    <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={[
                      styles.achievementTitle,
                      !achievement.earned && styles.achievementTitleDisabled
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={[
                      styles.achievementDescription,
                      !achievement.earned && styles.achievementDescriptionDisabled
                    ]}>
                      {achievement.description}
                    </Text>
                    {!achievement.earned && achievement.progress > 0 && (
                      <View style={styles.achievementProgressContainer}>
                        <View style={styles.achievementProgressBar}>
                          <View 
                            style={[
                              styles.achievementProgressFill, 
                              { width: `${achievement.progress}%`, backgroundColor: getCategoryColor(achievement.category) }
                            ]} 
                          />
                        </View>
                        <Text style={styles.achievementProgressText}>
                          {Math.round(achievement.progress)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  {achievement.earned && (
                    <View style={[styles.earnedBadge, { backgroundColor: getCategoryColor(achievement.category) }]}> 
                      <Text style={styles.earnedText}>✓</Text>
                    </View>
                  )}
                </View>
              ))
          )}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(33, 161, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#233e6a',
    marginBottom: 4,
  },
  achievementTitleDisabled: {
    color: '#999',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
  },
  achievementDescriptionDisabled: {
    color: '#aaa',
  },
  achievementProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  achievementProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e7ef',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achievementProgressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  earnedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#a0bfff',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 