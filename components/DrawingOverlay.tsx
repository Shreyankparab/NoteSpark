import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Text,
  Dimensions,
  LayoutChangeEvent,
  Animated,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface DrawingContext {
  renderCanvas: () => React.ReactNode;
  renderTools: () => React.ReactNode;
  panHandlers: any;
  onLayout: (event: LayoutChangeEvent) => void;
  setScrollOffset: (y: number) => void;
  maxDrawingY: number;
}

interface DrawingOverlayProps {
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  onDrawingChange?: (drawingData: string) => void;
  initialDrawingData?: string | null;
  children: (context: DrawingContext) => React.ReactNode;
  isSaving?: boolean;
  manualScrollTo: (y: number) => void;
  scale?: number;             // NEW: For zooming
  translateOffset?: { x: number, y: number }; // NEW: For panning
  canvasLayout?: { x: number; y: number; width: number; height: number }; // NEW: For precise image bounds
  containerSize?: { width: number; height: number }; // NEW: For pivot calculation
  onPanModeChange?: (isPanMode: boolean) => void;
}

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  isDrawingMode,
  onToggleDrawingMode,
  onDrawingChange,
  initialDrawingData,
  children,
  isSaving = false,
  manualScrollTo,
  scale = 1,
  translateOffset = { x: 0, y: 0 },
  canvasLayout,
  containerSize,
  onPanModeChange,
}) => {
  // ... (existing state) ...

  // ✅ FIXED: Single source of truth for coordinate transformation
  // This function expects pageX/pageY (screen coordinates) and handles ALL transformations
  const getCanvasPoint = (pageX: number, pageY: number) => {
    const containerX = offsetRef.current.x;
    const containerY = offsetRef.current.y;

    // Screen → container space
    let x = pageX - containerX;
    let y = pageY - containerY;

    // ─────────────────────────────
    // IMAGE MODE (zoomed)
    // ─────────────────────────────
    if (canvasLayout && containerSize) {
      const s = scale ?? 1;
      const tx = translateOffset?.x ?? 0;
      const ty = translateOffset?.y ?? 0;

      // 🔑 The ACTUAL transform in NotesContent.tsx line 2333:
      // transform: [{ translateX }, { translateY }, { scale }]
      // This means: P_screen = (P_local + translate) * scale (around center)
      // 
      // For center-based scaling (which RN does by default):
      // P_screen = ((P_local - center) * scale) + center + translate
      // Inverse: P_local = ((P_screen - translate - center) / scale) + center

      const cx = containerSize.width / 2;
      const cy = containerSize.height / 2;

      // Apply inverse transform
      x = ((x - tx - cx) / s) + cx;
      y = ((y - ty - cy) / s) + cy;

      // Convert container → image-local
      x -= canvasLayout.x;
      y -= canvasLayout.y;

      return { x, y };
    }

    // ─────────────────────────────
    // NOTE MODE
    // ─────────────────────────────
    return {
      x,
      y: y + scrollOffsetRef.current,
    };
  };

  // ... Update PanResponder to use getCanvasPoint ...
  // (Will modify PanResponder block next)
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  // Store deleted paths to allow "Undo Clear"
  const [deletedPaths, setDeletedPaths] = useState<DrawingPath[] | null>(null);

  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const [showPicker, setShowPicker] = useState(false);

  // Track Pan Mode from Drawing Overlay to enable scrolling
  // (Dependencies are handled below)

  // Track maximum Y coordinate to expand scroll area
  const [maxDrawingY, setMaxDrawingY] = useState(0);

  const pathRef = useRef<string>('');
  const viewRef = useRef<View>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scrollOffsetRef = useRef(0);

  // Track scroll start for 2-finger scroll
  const lastScrollY = useRef(0);

  // Ref to track if we've loaded initial data, preventing re-load on clear
  const hasLoadedInitialData = useRef(false);

  // ✅ FIXED: Ensure offsetRef is initialized properly
  React.useEffect(() => {
    setTimeout(updateOffset, 0);
  }, []);

  // Load initial drawing data ONLY ONCE
  React.useEffect(() => {
    if (initialDrawingData && !hasLoadedInitialData.current) {
      try {
        const parsed = JSON.parse(initialDrawingData);
        // Handle both legacy array and new object format
        const loadedPaths: DrawingPath[] = Array.isArray(parsed) ? parsed : parsed.paths;

        setPaths(loadedPaths);
        recalculateMaxY(loadedPaths);
        hasLoadedInitialData.current = true;
      } catch (error) {
        console.error('Failed to load initial drawing data:', error);
      }
    }
  }, [initialDrawingData]);

  // Notify parent of drawing changes
  React.useEffect(() => {
    if (onDrawingChange) {
      let data = '';
      if (paths.length > 0) {
        if (canvasLayout) {
          // Save with dimensions for correct scaling
          data = JSON.stringify({
            paths,
            width: canvasLayout.width,
            height: canvasLayout.height
          });
        } else {
          // Legacy format
          data = JSON.stringify(paths);
        }
      }
      onDrawingChange(data);
    }
  }, [paths, onDrawingChange, canvasLayout]);

  const recalculateMaxY = (currentPaths: DrawingPath[]) => {
    let maxY = 0;
    currentPaths.forEach(p => {
      // Simple regex to find all Y coordinates (number after comma)
      const matches = p.path.match(/,([0-9.]+)/g);
      if (matches) {
        matches.forEach(m => {
          const y = parseFloat(m.substring(1));
          if (y > maxY) maxY = y;
        });
      }
    });
    setMaxDrawingY(maxY);
  };

  const updateOffset = () => {
    viewRef.current?.measure((_x, _y, _width, _height, pageX, pageY) => {
      offsetRef.current = { x: pageX, y: pageY };
    });
  };

  const setScrollOffset = (y: number) => {
    scrollOffsetRef.current = y;
  };

  // Pan Mode State (VS Drawing Mode)
  const [isPanMode, setIsPanMode] = useState(false);

  // Sync internal pan mode with parent
  React.useEffect(() => {
    if (onPanModeChange) {
      onPanModeChange(isPanMode);
    }
  }, [isPanMode, onPanModeChange]);

  const panResponder = PanResponder.create({
    // Always CAPTURE if in drawing mode (unless touching toolbar)
    // This allows us to inspect if it's 1 or 2 fingers and handle accordingly
    // Use Bubble phase so children (like Image TouchableOpacity) can receive touches first.
    // If child handles it, we don't.
    // If child ignores it (whitespace), we handle it.
    onStartShouldSetPanResponder: (evt) => {
      if (!isDrawingMode || showPicker || isPanMode) return false;

      const { pageY } = evt.nativeEvent;
      const screenHeight = Dimensions.get('window').height;
      if (pageY > screenHeight - 100) return false;

      return true;
    },

    onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
      if (!isDrawingMode || showPicker || isPanMode) return false;

      // Ignore toolbar area
      const { pageY } = evt.nativeEvent;
      const screenHeight = Dimensions.get('window').height;
      if (pageY > screenHeight - 100) return false;

      // Add Slop: If movement is tiny, don't capture (allow click/press to bubble)
      if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) return false;

      return true;
    },

    // Terminate if interrupted (e.g. system gesture)
    onPanResponderTerminationRequest: () => true,

    onPanResponderGrant: (evt) => {
      if (!isDrawingMode || showPicker || isPanMode) return;

      const touches = evt.nativeEvent.touches;
      const { pageX, pageY } = evt.nativeEvent;

      // 1 Finger: Drawing
      if (touches.length === 1) {
        // ✅ FIXED: Pass pageX/pageY directly to getCanvasPoint
        // No pre-conversion needed - getCanvasPoint handles everything
        const { x, y } = getCanvasPoint(pageX, pageY);

        const startPoint = `M ${x.toFixed(1)},${y.toFixed(1)}`;
        pathRef.current = startPoint;
        setCurrentPath(startPoint);
        setIsDrawing(true);
      } else {
        // 2 Fingers: Scrolling
        lastScrollY.current = pageY;
      }
    },

    onPanResponderMove: (evt, gestureState) => {
      if (!isDrawingMode || showPicker || isPanMode) return;

      const { pageX, pageY } = evt.nativeEvent;
      const touches = evt.nativeEvent.touches;

      if (touches.length === 1 && isDrawing) {
        // ✅ FIXED: Pass pageX/pageY directly to getCanvasPoint
        const { x, y } = getCanvasPoint(pageX, pageY);

        const newPoint = ` L ${x.toFixed(1)},${y.toFixed(1)}`;
        pathRef.current += newPoint;
        setCurrentPath(pathRef.current);
      } else if (touches.length === 2 && !scale) {
        // 2-finger scroll logic
        const dy = pageY - lastScrollY.current;
        lastScrollY.current = pageY;

        if (manualScrollTo) {
          manualScrollTo(-dy);
        }
      }
      // 2 Fingers: Manual Scroll (Alternative Logic)
      else if (touches.length === 2) {
        const y1 = touches[0].pageY;
        const y2 = touches[1].pageY;
        const currentAvgY = (y1 + y2) / 2;

        const dy = lastScrollY.current - currentAvgY;

        // Update scroll pos locally first to ensure smoothness
        const limitMax = Math.max(Dimensions.get('window').height, maxDrawingY + 300);
        const newScrollY = Math.max(0, Math.min(scrollOffsetRef.current + dy, limitMax));

        scrollOffsetRef.current = newScrollY; // Force update local ref immediately
        manualScrollTo(newScrollY);

        // Update reference for next frame
        lastScrollY.current = currentAvgY;
      }
    },

    onPanResponderRelease: () => {
      if (!isDrawingMode) return;

      if (isDrawing && pathRef.current) {
        const newDrawingPath: DrawingPath = {
          path: pathRef.current,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
        };

        const newPaths = [...paths, newDrawingPath];
        setPaths(newPaths);
        recalculateMaxY(newPaths);
        setCurrentPath('');
        pathRef.current = '';

        // Clearing deletedPaths because we made a new move? 
        // Or keep it? Usually, new action clears redo stack. 
        // We'll keep it simple and assume new action clears "Undo Clear" opportunity.
        setDeletedPaths(null);
      }
      setIsDrawing(false);
    },

    onPanResponderTerminate: () => {
      setIsDrawing(false);
      setCurrentPath('');
    }
  });

  const clearDrawing = () => {
    if (paths.length > 0) {
      setDeletedPaths(paths); // Save for undo
      setPaths([]);
      setCurrentPath('');
      pathRef.current = '';
      setMaxDrawingY(0);
    }
    setShowPicker(false);
  };

  const undoLastStroke = () => {
    // If paths is empty BUT we have deletedPaths, it means we recently cleared.
    // Undo should restore the cleared drawing.
    if (paths.length === 0 && deletedPaths) {
      setPaths(deletedPaths);
      recalculateMaxY(deletedPaths);
      setDeletedPaths(null); // Consumed
    }
    // Normal Undo
    else if (paths.length > 0) {
      const newPaths = paths.slice(0, -1);
      setPaths(newPaths);
      recalculateMaxY(newPaths);
    }
    setShowPicker(false);
  };


  const togglePicker = () => {
    setShowPicker(!showPicker);
  };

  // Modern Bottom Toolbar
  const renderTools = () => {
    if (!isDrawingMode) return null;

    const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    const strokes = [2, 4, 6, 8, 12];

    return (
      <>
        {/* Transparent Backdrop to close picker on outside click */}
        {showPicker && (
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View />
          </TouchableOpacity>
        )}

        {/* Picker Popup */}
        {showPicker && (
          <View style={styles.pickerPopup}>
            <Text style={styles.sectionTitle}>Colors</Text>
            <View style={styles.colorGrid}>
              {colors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    currentColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setCurrentColor(color)}
                />
              ))}
            </View>

            <View style={styles.popupDivider} />

            <Text style={styles.sectionTitle}>Thickness</Text>
            <View style={styles.strokeRow}>
              {strokes.map(width => (
                <TouchableOpacity
                  key={width}
                  style={[
                    styles.strokeOption,
                    currentStrokeWidth === width && styles.strokeOptionSelected
                  ]}
                  onPress={() => setCurrentStrokeWidth(width)}
                >
                  <View style={{ width: width, height: width, borderRadius: width / 2, backgroundColor: '#374151' }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <View style={styles.bottomToolbar} pointerEvents="box-none">
          {/* Undo / Clear Group */}
          <View style={styles.toolGroup}>
            <TouchableOpacity style={styles.iconButton} onPress={undoLastStroke}>
              <Ionicons name="arrow-undo" size={24} color="#4B5563" />
              <Text style={styles.toolLabel}>Undo</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <TouchableOpacity style={styles.iconButton} onPress={clearDrawing}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={styles.toolLabel}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Mode Switch: Brush vs Pan */}
          <View style={styles.toolGroup}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsPanMode(false)}>
              <Ionicons
                name="brush"
                size={24}
                color={!isPanMode ? currentColor : "#9CA3AF"}
              />
              <Text style={[styles.toolLabel, !isPanMode && { color: currentColor, fontWeight: 'bold' }]}>Draw</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <TouchableOpacity style={styles.iconButton} onPress={() => setIsPanMode(true)}>
              <Ionicons
                name="hand-left-outline" // or "move" or "hand-right"
                size={24}
                color={isPanMode ? "#3B82F6" : "#9CA3AF"}
              />
              <Text style={[styles.toolLabel, isPanMode && { color: '#3B82F6', fontWeight: 'bold' }]}>Pan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Center: Palette Trigger (Only active if Draw mode?) */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: isPanMode ? 0.5 : 1 }}>
            <TouchableOpacity
              style={[styles.paletteButton, { backgroundColor: currentColor }]}
              onPress={() => {
                setIsPanMode(false); // Switch to draw if palette opened
                togglePicker();
              }}
            >
              {/* No inner ring, just color */}
            </TouchableOpacity>
            <Text style={styles.toolLabel}>Palette</Text>
          </View>

          <View style={styles.divider} />

          {/* Done Button */}
          <View style={styles.toolGroup}>
            <TouchableOpacity
              style={[styles.doneButton, isSaving && styles.doneButtonDisabled]}
              onPress={onToggleDrawingMode}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.doneText}>{isSaving ? "Saving..." : "Done"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  const renderCanvas = () => (
    <View style={canvasLayout ? {
      position: 'absolute',
      left: canvasLayout.x,
      top: canvasLayout.y,
      width: canvasLayout.width,
      height: canvasLayout.height,
      zIndex: 10
    } : StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        {paths.map((p, i) => (
          <Path
            key={i}
            d={p.path}
            stroke={p.color}
            strokeWidth={p.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {currentPath ? (
          <Path
            d={currentPath}
            stroke={currentColor}
            strokeWidth={currentStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );

  return (
    <View
      ref={viewRef}
      onLayout={(e) => {
        updateOffset();
      }}
      style={{ flex: 1 }}
    >
      {children({
        renderCanvas,
        renderTools,
        panHandlers: panResponder.panHandlers,
        onLayout: updateOffset,
        setScrollOffset,
        maxDrawingY,
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8, // Kept existing paddingHorizontal
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 20,
    zIndex: 10000, // Increased zIndex
    height: 90, // Added height
    justifyContent: 'space-between', // Added justifyContent
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Slight dim
    zIndex: 9999, // Ensure backdrop is below picker but above content
  },
  divider: {
    width: 1,
    height: 40, // Increased height
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8, // Increased marginHorizontal
  },
  spacer: {
    width: 20, // Increased spacing between Undo and Clear
  },
  dividerSmall: { // Kept existing dividerSmall
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4, // Increased gap
    padding: 4, // Added padding
  },
  toolLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4, // Added marginTop
  },
  toolGroup: { // Added toolGroup style
    flexDirection: 'row',
    alignItems: 'center',
  },
  paletteButton: { // Updated paletteButton style
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  pickerPopup: { // Added pickerPopup style
    position: 'absolute',
    bottom: 100, // Above toolbar
    alignSelf: 'center',
    width: 260,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 25, // Higher than toolbar
    zIndex: 10001,
  },
  sectionTitle: { // Added sectionTitle style
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center',
  },
  colorGrid: { // Added colorGrid style
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorOption: { // Added colorOption style
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorOptionSelected: { // Added colorOptionSelected style
    borderColor: '#374151',
    transform: [{ scale: 1.1 }]
  },
  popupDivider: { // Added popupDivider style
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
    width: '100%',
  },
  strokeRow: { // Added strokeRow style
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  strokeOption: { // Added strokeOption style
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  strokeOptionSelected: { // Added strokeOptionSelected style
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  doneButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Increased paddingVertical
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8, // Increased gap
    shadowColor: '#10B981', // Added shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 100, // Added minWidth
    justifyContent: 'center', // Added justifyContent
  },
  doneButtonDisabled: { // Added doneButtonDisabled style
    backgroundColor: '#6EE7B7',
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15, // Increased fontSize
  },
});

export default DrawingOverlay;
