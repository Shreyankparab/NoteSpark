import React from 'react';
import { Modal } from 'react-native';
import DoodleCanvas from '../DoodleCanvas';

interface DoodleModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (drawingData: string) => void;
  initialDoodleData?: string | null;
}

const DoodleModal: React.FC<DoodleModalProps> = ({ visible, onClose, onSave, initialDoodleData }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <DoodleCanvas onClose={onClose} onSave={onSave} initialDoodleData={initialDoodleData} />
    </Modal>
  );
};

export default DoodleModal;
