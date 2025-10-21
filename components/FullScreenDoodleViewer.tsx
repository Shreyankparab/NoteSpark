import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface FullScreenDoodleViewerProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  doodleData: string;
  title?: string;
}

const FullScreenDoodleViewer: React.FC<FullScreenDoodleViewerProps> = ({
  visible,
  onClose,
  onEdit,
  doodleData,
  title = "Doodle",
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{title}</Text>
          
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Doodle Display Area */}
        <View style={styles.doodleContainer}>
          <Svg 
            height="100%" 
            width="100%" 
            style={styles.svg}
          >
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
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="brush" size={16} color="#FFFFFF" />
            <Text style={styles.infoText}>
              {paths.length} stroke{paths.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.hintText}>Tap "Edit" to modify this doodle</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 1000,
    elevation: 1000,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1001,
    elevation: 1001,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 1001,
    elevation: 1001,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  doodleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    zIndex: 1,
  },
  svg: {
    backgroundColor: '#1a1a1a',
    zIndex: 1,
    flex: 1,
  },
  bottomInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default FullScreenDoodleViewer;
