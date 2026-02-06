"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseDebugMenuTriggerOptions {
  /** Callback when debug menu should be toggled */
  onToggle: () => void;
  /** Whether the debug menu is currently open */
  isOpen: boolean;
  /** Number of clicks required to activate (default: 10) */
  clickThreshold?: number;
  /** Time window for click counting in ms (default: 5000) */
  clickTimeWindow?: number;
  /** Whether to enable the keyboard shortcut (Alt+J) */
  enableKeyboardShortcut?: boolean;
  /** Whether to enable the click trigger */
  enableClickTrigger?: boolean;
}

/**
 * Hook to manage secret debug menu activation triggers
 * 
 * Activation methods:
 * 1. Alt+J keyboard shortcut
 * 2. Clicking the dashboard background 10 times within 5 seconds
 * 
 * The click trigger only activates when clicking on the actual background,
 * not on widgets, buttons, or other interactive elements.
 */
export function useDebugMenuTrigger({
  onToggle,
  isOpen,
  clickThreshold = 10,
  clickTimeWindow = 5000,
  enableKeyboardShortcut = true,
  enableClickTrigger = true,
}: UseDebugMenuTriggerOptions) {
  // Track background clicks
  const clickTimestamps = useRef<number[]>([]);
  const lastClickTime = useRef<number>(0);
  
  // Handle keyboard shortcut (Alt+J / Option+J)
  useEffect(() => {
    if (!enableKeyboardShortcut) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+J / Option+J to toggle debug menu
      // On macOS, Option+J produces '∆' character, so we check both key and code
      const isAltJ = e.altKey && (
        e.key === 'j' || 
        e.key === 'J' || 
        e.key === '∆' ||  // macOS Option+J produces this character
        e.code === 'KeyJ'  // fallback: check the physical key code
      );
      
      if (isAltJ) {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onToggle, enableKeyboardShortcut]);
  
  // Handle click trigger
  const handleBackgroundClick = useCallback((e: MouseEvent) => {
    if (!enableClickTrigger) return;
    if (isOpen) return; // Don't count clicks when menu is already open
    
    // Check if the click target is the dashboard container background
    const target = e.target as HTMLElement;
    
    // Only count clicks on the actual background elements
    // These are the container elements, not widgets or interactive elements
    const isBackgroundClick = (
      target.classList.contains('dashboard-container') ||
      target.classList.contains('react-grid-layout') ||
      target.classList.contains('grid-dashboard-container') ||
      target.closest('.react-grid-layout') === target ||
      // Check if clicking on empty grid area (not on a widget)
      (target.closest('.react-grid-layout') && !target.closest('.react-grid-item'))
    );
    
    if (!isBackgroundClick) return;
    
    const now = Date.now();
    
    // Remove old clicks outside the time window
    clickTimestamps.current = clickTimestamps.current.filter(
      timestamp => now - timestamp < clickTimeWindow
    );
    
    // Add this click
    clickTimestamps.current.push(now);
    lastClickTime.current = now;
    
    // Check if we've reached the threshold
    if (clickTimestamps.current.length >= clickThreshold) {
      // Reset and trigger
      clickTimestamps.current = [];
      onToggle();
    }
  }, [onToggle, isOpen, clickThreshold, clickTimeWindow, enableClickTrigger]);
  
  // Attach click listener to document
  useEffect(() => {
    if (!enableClickTrigger) return;
    
    document.addEventListener('click', handleBackgroundClick);
    return () => document.removeEventListener('click', handleBackgroundClick);
  }, [handleBackgroundClick, enableClickTrigger]);
  
  // Return click count for potential UI feedback (optional)
  const getClickProgress = useCallback(() => {
    const now = Date.now();
    const recentClicks = clickTimestamps.current.filter(
      timestamp => now - timestamp < clickTimeWindow
    );
    return {
      count: recentClicks.length,
      threshold: clickThreshold,
      progress: recentClicks.length / clickThreshold,
    };
  }, [clickThreshold, clickTimeWindow]);
  
  return {
    getClickProgress,
  };
}

export default useDebugMenuTrigger;
