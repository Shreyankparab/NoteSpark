import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface InlineDrawingCanvasProps {
  height?: number;
  onDrawingChange?: (drawingData: string) => void;
  initialDrawingData?: string | null;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
}

const InlineDrawingCanvas: React.FC<InlineDrawingCanvasProps> = ({
  height = 200,
  onDrawingChange,
  initialDrawingData,
  isDrawingMode,
  onToggleDrawingMode,
}) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
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
    if (onDrawingChange && paths.length > 0) {
      onDrawingChange(JSON.stringify(paths));
    }
  }, [paths, onDrawingChange]);

  const colors = [
    '#000000', // Black
    '#FF0000', // Red
    '#0000FF', // Blue
    '#00AA00', // Green
    '#FF6600', // Orange
    '#9900CC', // Purple
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
    if (onDrawingChange) {
      onDrawingChange('');
    }
  };

  const undoLastStroke = () => {
    if (paths.length > 0) {
      const newPaths = paths.slice(0, -1);
      setPaths(newPaths);
      if (onDrawingChange) {
        onDrawingChange(newPaths.length > 0 ? JSON.stringify(newPaths) : '');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Drawing Tools */}
      <View style={styles.toolsContainer}>
        <TouchableOpacity
          style={[styles.modeButton, isDrawingMode && styles.modeButtonActive]}
          onPress={onToggleDrawingMode}
        >
          <Ionicons 
            name={isDrawingMode ? "pencil" : "pencil-outline"} 
            size={16} 
            color={isDrawingMode ? "#FFFFFF" : "#666666"} 
          />
          <Text style={[styles.modeButtonText, isDrawingMode && styles.modeButtonTextActive]}>
            {isDrawingMode ? "Drawing" : "Draw"}
          </Text>
        </TouchableOpacity>

        {isDrawingMode && (
          <>
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
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={undoLastStroke}>
                <Ionicons name="arrow-undo" size={16} color="#666666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={clearDrawing}>
                <Ionicons name="trash-outline" size={16} color="#666666" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Drawing Canvas */}
      {(isDrawingMode || paths.length > 0) && (
        <View
          style={[styles.canvas, { height }]}
          {...(isDrawingMode ? panResponder.panHandlers : {})}
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
          
          {isDrawingMode && (
            <View style={styles.drawingHint}>
              <Text style={styles.hintText}>Draw here</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
  },
  toolsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#3B82F6',
  },
  strokeContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  strokeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStroke: {
    borderColor: '#3B82F6',
  },
  strokePreview: {
    backgroundColor: '#000000',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    margin: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    position: 'relative',
  },
  drawingHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -10 }],
    pointerEvents: 'none',
  },
  hintText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default InlineDrawingCanvas;
