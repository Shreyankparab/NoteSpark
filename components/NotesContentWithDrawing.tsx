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

  return (
    <DrawingOverlay
      isDrawingMode={isDrawingMode}
      onToggleDrawingMode={toggleDrawingMode}
      onDrawingChange={handleDrawingChange}
      initialDrawingData={drawingData}
    >
      <NotesContent {...props} />
    </DrawingOverlay>
  );
};

export default NotesContentWithDrawing;
