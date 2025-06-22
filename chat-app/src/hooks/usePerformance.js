import { useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';

export const usePerformance = () => {
  const frameCallbacks = useRef(new Set());

  const scheduleFrameCallback = useCallback((callback) => {
    const handle = InteractionManager.runAfterInteractions(() => {
      if (frameCallbacks.current.has(handle)) {
        callback();
        frameCallbacks.current.delete(handle);
      }
    });
    frameCallbacks.current.add(handle);
    return handle;
  }, []);

  const cancelFrameCallback = useCallback((handle) => {
    frameCallbacks.current.delete(handle);
    InteractionManager.clearInteractionHandle(handle);
  }, []);

  const clearAllFrameCallbacks = useCallback(() => {
    frameCallbacks.current.forEach(handle => {
      InteractionManager.clearInteractionHandle(handle);
    });
    frameCallbacks.current.clear();
  }, []);

  return {
    scheduleFrameCallback,
    cancelFrameCallback,
    clearAllFrameCallbacks
  };
};