import React, { useState } from 'react';
import { View } from 'react-native';
import NotesContent from './NotesContent';
import DrawingOverlay from './DrawingOverlay';

interface NotesContentWithDrawingProps {
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenAppearance?: () => void;
  onOpenTimeTable?: () => void;
  onOpenSubjects?: () => void;
  theme?: any;
}

const NotesContentWithDrawing: React.FC<NotesContentWithDrawingProps> = (props) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<string | null>(null);

  const toggleDrawingMode = () => {
    setIsDrawingMode(!isDrawingMode);
  };

  const handleDrawingChange = (data: string) => {
    setDrawingData(data || null);
  };

  // Dummy scroll handler - NotesContent manages its own scrolling
  const manualScrollTo = (y: number) => {
    // This is a placeholder - NotesContent handles its own scrolling internally
    console.log('Scroll to:', y);
  };

  return (
    <DrawingOverlay
      isDrawingMode={isDrawingMode}
      onToggleDrawingMode={toggleDrawingMode}
      onDrawingChange={handleDrawingChange}
      initialDrawingData={drawingData}
      manualScrollTo={manualScrollTo}
    >
      {(context) => (
        <View style={{ flex: 1 }}>
          <NotesContent {...props} />
          {context.renderCanvas()}
          {context.renderTools()}
        </View>
      )}
    </DrawingOverlay>
  );
};

export default NotesContentWithDrawing;
