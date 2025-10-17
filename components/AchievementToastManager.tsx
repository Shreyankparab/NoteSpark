import React, { useEffect, useState } from 'react';
import { Achievement } from '../types';
import AchievementToast from './AchievementToast';
import { registerToastListener, handleToastClose } from '../utils/achievementNotification';

const AchievementToastManager: React.FC = () => {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Register for toast events
    const unregister = registerToastListener((achievement, isVisible) => {
      setCurrentAchievement(achievement);
      setVisible(isVisible);
    });

    // Clean up on unmount
    return unregister;
  }, []);

  const onClose = () => {
    setVisible(false);
    handleToastClose();
  };

  return (
    <>
      {currentAchievement && (
        <AchievementToast
          achievement={currentAchievement}
          visible={visible}
          onClose={onClose}
        />
      )}
    </>
  );
};

export default AchievementToastManager;