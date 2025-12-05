"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Widget } from "@/types";
import { getWidgetById } from "@/constants/widgets";
import { ChevronLeft, ChevronRight, Grid3x3, Settings, Menu } from "lucide-react";
import { Suspense } from "react";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { Loader } from "@/components/ui/loader";

export interface MobileDashboardProps {
    layout: Widget[];
    onSettingsClick: () => void;
    onWidgetsClick: () => void;
}

export default function MobileDashboard({
    layout,
    onSettingsClick,
    onWidgetsClick,
}: MobileDashboardProps) {
    const { hasAccess } = useWidgetPermissions();

    // Filter enabled widgets that user has access to
    const enabledWidgets = layout.filter(
        (widget) => widget.enabled && hasAccess(widget.id, 'view')
    );

    const [[currentIndex, direction], setPage] = useState([0, 0]);
    const [showNav, setShowNav] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const hideNavTimeout = useRef<NodeJS.Timeout | null>(null);

    // Ensure currentIndex stays within bounds when widgets change
    useEffect(() => {
        if (currentIndex >= enabledWidgets.length && enabledWidgets.length > 0) {
            setPage([enabledWidgets.length - 1, -1]);
        }
    }, [enabledWidgets.length, currentIndex]);

    // Show navigation on any interaction
    useEffect(() => {
        const showNavigation = () => {
            setShowNav(true);
            if (hideNavTimeout.current) {
                clearTimeout(hideNavTimeout.current);
            }
            hideNavTimeout.current = setTimeout(() => {
                setShowNav(false);
            }, 3000);
        };

        window.addEventListener('touchstart', showNavigation);
        window.addEventListener('mousemove', showNavigation);

        // Show nav on initial load
        showNavigation();

        return () => {
            window.removeEventListener('touchstart', showNavigation);
            window.removeEventListener('mousemove', showNavigation);
            if (hideNavTimeout.current) {
                clearTimeout(hideNavTimeout.current);
            }
        };
    }, []);

    const paginate = (newDirection: number) => {
        const newIndex = currentIndex + newDirection;
        if (newIndex >= 0 && newIndex < enabledWidgets.length) {
            setPage([newIndex, newDirection]);
        }
    };

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);

        const swipeThreshold = 75; // Increased for more deliberate swipes
        const swipeVelocityThreshold = 400;

        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Swipe right (go to previous)
        if (offset > swipeThreshold || velocity > swipeVelocityThreshold) {
            if (currentIndex > 0) {
                paginate(-1);
            }
        }
        // Swipe left (go to next)
        else if (offset < -swipeThreshold || velocity < -swipeVelocityThreshold) {
            if (currentIndex < enabledWidgets.length - 1) {
                paginate(1);
            }
        }
    };

    const goToWidget = (index: number) => {
        if (index !== currentIndex && index >= 0 && index < enabledWidgets.length) {
            setPage([index, index > currentIndex ? 1 : -1]);
        }
    };

    if (enabledWidgets.length === 0) {
        return (
            <div className="mobile-dashboard-empty">
                <div className="mobile-empty-state">
                    <Grid3x3 className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4" />
                    <h2 className="text-xl font-medium text-ui-text-secondary mb-2">
                        No widgets enabled
                    </h2>
                    <p className="text-sm text-ui-text-tertiary mb-6">
                        Add widgets to get started
                    </p>
                    <button
                        onClick={onWidgetsClick}
                        className="mobile-nav-button bg-ui-accent-primary hover:bg-ui-accent-primary-hover"
                    >
                        <Menu className="w-5 h-5" />
                        <span>Add Widgets</span>
                    </button>
                </div>
            </div>
        );
    }

    const currentWidget = enabledWidgets[currentIndex];
    const widgetDef = currentWidget ? getWidgetById(currentWidget.id) : null;

    return (
        <div className="mobile-dashboard">
            {/* Top Navigation Bar - Auto-hide */}
            <AnimatePresence>
                {showNav && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="mobile-top-nav"
                    >
                        <div className="mobile-top-nav-content">
                            <button
                                onClick={onWidgetsClick}
                                className="mobile-nav-button"
                                aria-label="Widget Menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <div className="mobile-widget-title">
                                <span className="text-sm font-medium text-ui-text-primary">
                                    {widgetDef?.title || 'Widget'}
                                </span>
                                <span className="text-xs text-ui-text-tertiary">
                                    {currentIndex + 1} / {enabledWidgets.length}
                                </span>
                            </div>

                            <button
                                onClick={onSettingsClick}
                                className="mobile-nav-button"
                                aria-label="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Widget Carousel */}
            <div className="mobile-widget-container">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={{
                            enter: (dir: number) => ({
                                x: dir > 0 ? '100%' : '-100%',
                                opacity: 0,
                            }),
                            center: {
                                x: 0,
                                opacity: 1,
                            },
                            exit: (dir: number) => ({
                                x: dir > 0 ? '-100%' : '100%',
                                opacity: 0,
                            }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: {
                                type: "spring",
                                stiffness: 400,
                                damping: 40,
                                mass: 0.8,
                            },
                            opacity: { duration: 0.15 },
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{
                            left: currentIndex === 0 ? 0.1 : 0.2,
                            right: currentIndex === enabledWidgets.length - 1 ? 0.1 : 0.2,
                        }}
                        dragMomentum={false}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={handleDragEnd}
                        className="mobile-widget-slide"
                        style={{
                            position: 'absolute',
                            inset: 0,
                        }}
                    >
                        {widgetDef && (
                            <div className="mobile-widget-content">
                                <Suspense
                                    fallback={
                                        <div className="mobile-widget-loader">
                                            <Loader />
                                        </div>
                                    }
                                >
                                    <widgetDef.component />
                                </Suspense>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows - Only show when nav is visible */}
                <AnimatePresence>
                    {showNav && enabledWidgets.length > 1 && (
                        <>
                            {currentIndex > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onClick={() => paginate(-1)}
                                    className="mobile-arrow mobile-arrow-left"
                                    aria-label="Previous widget"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </motion.button>
                            )}

                            {currentIndex < enabledWidgets.length - 1 && (
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={() => paginate(1)}
                                    className="mobile-arrow mobile-arrow-right"
                                    aria-label="Next widget"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </motion.button>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Navigation Dots - Auto-hide */}
            <AnimatePresence>
                {showNav && enabledWidgets.length > 1 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="mobile-bottom-nav"
                    >
                        <div className="mobile-dots-container">
                            {enabledWidgets.map((widget, index) => {
                                const def = getWidgetById(widget.id);
                                return (
                                    <button
                                        key={widget.id}
                                        onClick={() => goToWidget(index)}
                                        className={`mobile-dot ${index === currentIndex
                                            ? 'mobile-dot-active'
                                            : 'mobile-dot-inactive'
                                            }`}
                                        aria-label={`Go to ${def?.title || 'widget'}`}
                                        title={def?.title}
                                    >
                                        {index === currentIndex && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="mobile-dot-indicator"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 500,
                                                    damping: 30,
                                                }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Swipe Hint - Only show on first load */}
            {enabledWidgets.length > 1 && (
                <div className="mobile-swipe-hint">
                    <motion.div
                        animate={{
                            x: [0, 20, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: 3,
                            ease: "easeInOut",
                        }}
                        className="mobile-swipe-icon"
                    >
                        <ChevronRight className="w-6 h-6 text-ui-text-tertiary opacity-50" />
                    </motion.div>
                </div>
            )}
        </div>
    );
}
