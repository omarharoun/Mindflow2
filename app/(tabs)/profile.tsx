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
import { 
  User, 
  Trophy, 
  Flame, 
  BookOpen, 
  Clock, 
  Target,
  Settings,
  LogOut,
  Award,
  Star,
  Zap,
  Calendar
} from 'lucide-react-native';
import { authManager } from '@/lib/auth';
import { profileService, type Achievement } from '@/lib/profile';
import { useRouter } from 'expo-router';


export default function ProfileScreen() {
  const [user, setUser] = useState(authManager.getUser());
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setUser);
    return unsubscribe;
  }, []);

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
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'learning': return BookOpen;
      case 'xp': return Star;
      case 'special': return Zap;
      default: return Award;
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
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0a2342', '#19376d']} style={styles.gradient}>
          <View style={styles.centerContainer}>
            <Text style={styles.signInPrompt}>Please sign in to view your profile</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const level = Math.floor(user.xp / 250) + 1;
  const nextLevelXp = level * 250;
  const progressPercentage = (user.xp / nextLevelXp) * 100;
  
  const learningStats = [
    { label: 'Total XP', value: user.xp.toLocaleString(), icon: Trophy, color: '#21a1ff' },
    { label: 'Current Streak', value: `${user.streak} days`, icon: Flame, color: '#ff6b35' },
    { label: 'Lessons Completed', value: user.completedLessons.toString(), icon: BookOpen, color: '#4ade80' },
    { label: 'Time Spent', value: formatTime(user.timeSpent), icon: Clock, color: '#8b5cf6' },
  ];
  
  const joinDate = new Date((user as any).created_at ? (user as any).created_at : Date.now()).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            const result = await authManager.signOut();
            if (!result.success) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings screen coming soon!');
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
            <View style={styles.profilePicture}>
              <User size={48} color="#fff" />
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.joinDate}>Member since {joinDate}</Text>
          </View>

          {/* Level Progress */}
          <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelText}>Level {level}</Text>
              <Text style={styles.xpText}>{user.xp} / {nextLevelXp} XP</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {nextLevelXp - user.xp} XP to next level
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {learningStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                    <IconComponent size={24} color="#fff" />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Achievements Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/profile/achievements')}>
              <Trophy size={24} color="#21a1ff" />
              <Text style={styles.actionButtonText}>Achievements</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSettings}>
              <Settings size={24} color="#21a1ff" />
              <Text style={styles.actionButtonText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.signOutButton]} 
              onPress={handleSignOut}
            >
              <LogOut size={24} color="#ff6b6b" />
              <Text style={[styles.actionButtonText, styles.signOutText]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#21a1ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#a0bfff',
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: '#7ea2e6',
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
  levelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpText: {
    fontSize: 16,
    color: '#a0bfff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#21a1ff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#a0bfff',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#233e6a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  achievementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  achievementCategory: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#233e6a',
    marginLeft: 12,
  },
  signOutText: {
    color: '#ff6b6b',
  },
});