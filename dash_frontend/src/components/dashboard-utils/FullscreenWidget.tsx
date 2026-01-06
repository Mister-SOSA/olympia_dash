"use client";

import React, { useEffect, useRef } from "react";
import { Widget } from "@/types";
import { getWidgetById } from "@/constants/widgets";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import { TABLE_WIDGET_IDS, shouldIgnoreGlobalHotkeys } from "./types";

interface FullscreenWidgetProps {
  layout: Widget[];
}

/**
 * Fullscreen Widget Component with Arrow Key Scrolling
 * 
 * Renders a single widget in fullscreen mode with keyboard navigation
 * for table widgets (up/down arrows scroll the content).
 */
export function FullscreenWidget({ layout }: FullscreenWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const enabledWidget = layout.find(w => w.enabled);
  const widgetDef = enabledWidget ? getWidgetById(enabledWidget.id) : null;
  const isTableWidget = enabledWidget ? TABLE_WIDGET_IDS.has(enabledWidget.id) : false;

  useEffect(() => {
    if (!isTableWidget || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle up/down arrows for scrolling
      // Left/right arrows are reserved for preset navigation
      if (!['ArrowUp', 'ArrowDown'].includes(e.key)) {
        return;
      }

      // Don't interfere if user is in an input field
      if (shouldIgnoreGlobalHotkeys(e.target as HTMLElement)) {
        return;
      }

      // Find the ScrollArea viewport within the widget
      const scrollArea = containerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollArea) return;

      e.preventDefault();

      const scrollAmount = 40; // pixels to scroll per key press

      switch (e.key) {
        case 'ArrowUp':
          scrollArea.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          break;
        case 'ArrowDown':
          scrollArea.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableWidget]);

  if (!enabledWidget || !widgetDef) return null;

  const WidgetComponent = widgetDef.component;

  return (
    <div ref={containerRef} className="fixed inset-0 z-40 bg-ui-bg-primary">
      <div className="w-full h-full overflow-auto">
        <WidgetErrorBoundary widgetName={widgetDef.title || enabledWidget.id}>
          <WidgetComponent />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}

export default FullscreenWidget;
