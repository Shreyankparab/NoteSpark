import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface DoodleViewerProps {
  doodleData: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  onPress?: () => void;
}

const DoodleViewer: React.FC<DoodleViewerProps> = ({
  doodleData,
  width = screenWidth - 32,
  height = 200,
  backgroundColor = '#1a1a1a',
  onPress,
}) => {
  let paths: DrawingPath[] = [];
  
  try {
    paths = JSON.parse(doodleData);
  } catch (error) {
    console.error('Failed to parse doodle data:', error);
    return null;
  }

  if (!paths || paths.length === 0) {
    return null;
  }

  const content = (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        {paths.map((drawingPath, index) => (
          <Path
            key={index}
            d={drawingPath.path}
            stroke={drawingPath.color}
            strokeWidth={drawingPath.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />
        ))}
      </Svg>
      
      {/* Tap to expand overlay */}
      {onPress && (
        <View style={styles.tapOverlay}>
          <View style={styles.expandIcon}>
            <Ionicons name="expand-outline" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  tapOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 6,
  },
  expandIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DoodleViewer;
