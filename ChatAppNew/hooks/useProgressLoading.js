import { useState } from 'react';

/**
 * Custom hook สำหรับจัดการ loading state พร้อม progress
 * @param {number} initialProgress - ค่าเริ่มต้นของ progress (0-100)
 * @returns {object} - { isLoading, progress, startLoading, updateProgress, stopLoading }
 */
export const useProgressLoading = (initialProgress = 0) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(initialProgress);

  const startLoading = (startProgress = 0) => {
    setIsLoading(true);
    setProgress(startProgress);
  };

  const updateProgress = (newProgress) => {
    setProgress(Math.min(Math.max(newProgress, 0), 100)); // ป้องกันค่าเกิน 0-100
  };

  const stopLoading = (delay = 0) => {
    updateProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, delay);
  };

  return {
    isLoading,
    progress,
    startLoading,
    updateProgress,
    stopLoading,
  };
};

export default useProgressLoading;
