import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface DrawingOverlayProps {
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  onDrawingChange?: (drawingData: string) => void;
  initialDrawingData?: string | null;
  children: React.ReactNode;
}

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  isDrawingMode,
  onToggleDrawingMode,
  onDrawingChange,
  initialDrawingData,
  children,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#FF0000');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(2);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const pathRef = useRef<string>('');

  // Load initial drawing data
  React.useEffect(() => {
    if (initialDrawingData) {
      try {
        const loadedPaths: DrawingPath[] = JSON.parse(initialDrawingData);
        setPaths(loadedPaths);
      } catch (error) {
        console.error('Failed to load initial drawing data:', error);
      }
    }
  }, [initialDrawingData]);

  // Notify parent of drawing changes
  React.useEffect(() => {
    if (onDrawingChange) {
      onDrawingChange(paths.length > 0 ? JSON.stringify(paths) : '');
    }
  }, [paths, onDrawingChange]);

  const colors = [
    '#FF0000', // Red
    '#0000FF', // Blue
    '#00AA00', // Green
    '#FF6600', // Orange
    '#9900CC', // Purple
    '#000000', // Black
  ];

  const strokeWidths = [1, 2, 3, 5];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDrawingMode,
    onMoveShouldSetPanResponder: () => isDrawingMode,

    onPanResponderGrant: (evt) => {
      if (!isDrawingMode) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `M${locationX.toFixed(2)},${locationY.toFixed(2)}`;
      pathRef.current = newPath;
      setCurrentPath(newPath);
      setIsDrawing(true);
    },

    onPanResponderMove: (evt) => {
      if (!isDrawingMode || !isDrawing) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `${pathRef.current} L${locationX.toFixed(2)},${locationY.toFixed(2)}`;
      pathRef.current = newPath;
      setCurrentPath(newPath);
    },

    onPanResponderRelease: () => {
      if (!isDrawingMode || !isDrawing) return;
      
      if (pathRef.current) {
        const newDrawingPath: DrawingPath = {
          path: pathRef.current,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
        };
        
        setPaths(prevPaths => [...prevPaths, newDrawingPath]);
        setCurrentPath('');
        pathRef.current = '';
      }
      setIsDrawing(false);
    },
  });

  const clearDrawing = () => {
    setPaths([]);
    setCurrentPath('');
    pathRef.current = '';
  };

  const undoLastStroke = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    }
  };

  return (
    <View style={styles.container}>
      {/* Drawing Tools - Fixed at top */}
      {isDrawingMode && (
        <View style={styles.toolsContainer}>
          <View style={styles.toolsRow}>
            {/* Colors */}
            <View style={styles.colorContainer}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    currentColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setCurrentColor(color)}
                />
              ))}
            </View>

            {/* Stroke Widths */}
            <View style={styles.strokeContainer}>
              {strokeWidths.map((width) => (
                <TouchableOpacity
                  key={width}
                  style={[
                    styles.strokeButton,
                    currentStrokeWidth === width && styles.selectedStroke,
                  ]}
                  onPress={() => setCurrentStrokeWidth(width)}
                >
                  <View
                    style={[
                      styles.strokePreview,
                      {
                        width: width * 2 + 4,
                        height: width * 2 + 4,
                        borderRadius: width + 2,
                        backgroundColor: currentColor,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.actionButton} onPress={undoLastStroke}>
              <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={clearDrawing}>
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content with Drawing Overlay */}
      <View style={styles.contentContainer}>
        {/* Original Content */}
        <View style={styles.content} pointerEvents={isDrawingMode ? 'none' : 'auto'}>
          {children}
        </View>

        {/* Drawing Overlay */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { pointerEvents: isDrawingMode ? 'auto' : 'none' }
          ]}
          {...panResponder.panHandlers}
        >
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
            {/* Existing paths */}
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
            {/* Current drawing path */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke={currentColor}
                strokeWidth={currentStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="transparent"
              />
            )}
          </Svg>
        </View>
      </View>

      {/* Drawing Mode Toggle - Fixed at bottom */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, isDrawingMode && styles.toggleButtonActive]}
          onPress={onToggleDrawingMode}
        >
          <Ionicons 
            name={isDrawingMode ? "pencil" : "pencil-outline"} 
            size={20} 
            color={isDrawingMode ? "#FFFFFF" : "#666666"} 
          />
          <Text style={[styles.toggleButtonText, isDrawingMode && styles.toggleButtonTextActive]}>
            {isDrawingMode ? "Exit Drawing" : "Draw Mode"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
    elevation: 1000,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#FFFFFF',
  },
  strokeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  strokeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStroke: {
    borderColor: '#FFFFFF',
  },
  strokePreview: {
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B35',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default DrawingOverlay;
