import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, Theme, getThemeById } from '../constants/themes';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.6;

interface AppearanceScreenProps {
  onClose: () => void;
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
}

const AppearanceScreen: React.FC<AppearanceScreenProps> = ({
  onClose,
  currentThemeId,
  onThemeChange,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string>(currentThemeId);

  const handleThemeSelect = async (themeId: string) => {
    try {
      setSelectedTheme(themeId);
      await AsyncStorage.setItem('selectedTheme', themeId);
      onThemeChange(themeId);
      console.log(`✅ Theme changed to: ${themeId}`);
    } catch (error) {
      console.error('❌ Failed to save theme:', error);
      Alert.alert('Error', 'Failed to save theme preference');
    }
  };

  const renderThemeCard = (theme: Theme) => {
    const isSelected = selectedTheme === theme.id;

    return (
      <TouchableOpacity
        key={theme.id}
        style={[
          styles.themeCard,
          isSelected && styles.themeCardSelected,
        ]}
        onPress={() => handleThemeSelect(theme.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={theme.colors as any}
          start={theme.gradientStart || { x: 0, y: 0 }}
          end={theme.gradientEnd || { x: 1, y: 1 }}
          style={styles.themePreview}
        >
          {/* Timer Circle Preview */}
          <View
            style={[
              styles.previewCircle,
              { borderColor: theme.timerCircleColor },
            ]}
          >
            <Text style={[styles.previewTime, { color: theme.textColor }]}>
              20:23
            </Text>
          </View>

          {/* Play Button Preview */}
          <View
            style={[
              styles.previewButton,
              { backgroundColor: theme.buttonColor },
            ]}
          />
        </LinearGradient>

        {/* Theme Info */}
        <View style={styles.themeInfo}>
          <View style={styles.themeHeader}>
            <Text style={styles.themeName}>{theme.name}</Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
          </View>
          <Text style={styles.themeDescription}>{theme.description}</Text>
        </View>

        {/* Selection Border */}
        {isSelected && <View style={styles.selectionBorder} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Choose Your Theme</Text>
        <Text style={styles.sectionSubtitle}>
          Select a background theme for your timer
        </Text>

        {/* Theme Grid */}
        <View style={styles.themeGrid}>
          {THEMES.map(theme => renderThemeCard(theme))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6366F1" />
          <Text style={styles.infoText}>
            Your theme preference is saved automatically and will be applied to
            the timer screen.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: CARD_WIDTH,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  themeCardSelected: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  themePreview: {
    width: '100%',
    height: CARD_HEIGHT * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewButton: {
    width: 40,
    height: 20,
    borderRadius: 10,
  },
  themeInfo: {
    padding: 12,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  themeDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#10B981',
    borderRadius: 16,
    pointerEvents: 'none',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4338CA',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default AppearanceScreen;
