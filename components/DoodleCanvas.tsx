import React, { useState, useRef } from 'react';
import {
  View,
  PanResponder,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface DoodleCanvasProps {
  onClose: () => void;
  onSave: (drawingData: string) => void;
  initialDoodleData?: string | null;
}

const DoodleCanvas: React.FC<DoodleCanvasProps> = ({ onClose, onSave, initialDoodleData }) => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#FFFFFF');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const pathRef = useRef<string>('');

  // Load initial doodle data if provided
  React.useEffect(() => {
    if (initialDoodleData) {
      try {
        const loadedPaths: DrawingPath[] = JSON.parse(initialDoodleData);
        setPaths(loadedPaths);
      } catch (error) {
        console.error('Failed to load initial doodle data:', error);
      }
    }
  }, [initialDoodleData]);

  const colors = [
    '#FFFFFF', // White
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
  ];

  const strokeWidths = [2, 4, 6, 8];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      const newPath = `M${locationX.toFixed(2)},${locationY.toFixed(2)}`;
      pathRef.current = newPath;
      setCurrentPath(newPath);
      setIsDrawing(true);
    },

    onPanResponderMove: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      const newPath = `${pathRef.current} L${locationX.toFixed(2)},${locationY.toFixed(2)}`;
      pathRef.current = newPath;
      setCurrentPath(newPath);
    },

    onPanResponderRelease: () => {
      if (pathRef.current) {
        const newDrawingPath: DrawingPath = {
          path: pathRef.current,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
        };
        setPaths(prev => [...prev, newDrawingPath]);
        setCurrentPath('');
        pathRef.current = '';
      }
      setIsDrawing(false);
    },
  });

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    pathRef.current = '';
  };

  const handleSave = () => {
    const drawingData = JSON.stringify(paths);
    onSave(drawingData);
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Doodle</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleUndo} style={styles.headerButton}>
            <Ionicons name="arrow-undo" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawing Area */}
      <View style={styles.drawingArea} {...panResponder.panHandlers}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
          {/* Render completed paths */}
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
          
          {/* Render current path being drawn */}
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

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        {/* Color Picker */}
        <View style={styles.toolSection}>
          <Text style={styles.toolLabel}>Colors</Text>
          <View style={styles.colorPicker}>
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
        </View>

        {/* Brush Size Picker */}
        <View style={styles.toolSection}>
          <Text style={styles.toolLabel}>Brush Size</Text>
          <View style={styles.brushPicker}>
            {strokeWidths.map((width) => (
              <TouchableOpacity
                key={width}
                style={[
                  styles.brushButton,
                  currentStrokeWidth === width && styles.selectedBrush,
                ]}
                onPress={() => setCurrentStrokeWidth(width)}
              >
                <View
                  style={[
                    styles.brushPreview,
                    {
                      width: width * 2,
                      height: width * 2,
                      borderRadius: width,
                      backgroundColor: currentColor,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#2a2a2a',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawingArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  toolbar: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34, // Safe area padding
  },
  toolSection: {
    marginBottom: 16,
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#6366F1',
    borderWidth: 3,
  },
  brushPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  brushButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBrush: {
    borderColor: '#6366F1',
  },
  brushPreview: {
    backgroundColor: '#FFFFFF',
  },
});

export default DoodleCanvas;
