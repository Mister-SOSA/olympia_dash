'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, THEMES } from '@/contexts/ThemeContext';
import { preferencesService } from '@/lib/preferences';
import { User } from '@/lib/auth';
import {
    TIMEZONE_OPTIONS,
    DATE_FORMAT_OPTIONS,
    DATETIME_SETTINGS,
    APPEARANCE_SETTINGS,
} from '@/constants/settings';
import {
    MdCheck,
    MdArrowForward,
    MdArrowBack,
    MdPalette,
    MdSchedule,
    MdTune,
    MdClose,
} from 'react-icons/md';

interface OnboardingFlowProps {
    user: User | null;
    onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'theme' | 'appearance' | 'datetime' | 'complete';

const STEPS: OnboardingStep[] = ['welcome', 'theme', 'appearance', 'datetime', 'complete'];

// Reusable animated container for step content
const StepContainer = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full"
    >
        {children}
    </motion.div>
);

// Step indicator - minimal dots
const StepIndicator = ({ steps, currentStep }: { steps: OnboardingStep[]; currentStep: OnboardingStep }) => {
    const currentIndex = steps.indexOf(currentStep);

    return (
        <div className="flex items-center justify-center gap-1.5">
            {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;

                return (
                    <div
                        key={step}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${isCompleted || isCurrent
                                ? 'bg-ui-accent-primary'
                                : 'bg-ui-border-primary'
                            } ${isCurrent ? 'w-4' : ''}`}
                    />
                );
            })}
        </div>
    );
};

// Welcome Step Component
const WelcomeStep = ({ user, onNext }: { user: User | null; onNext: () => void }) => {
    return (
        <StepContainer>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-10">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-5xl mb-5"
                >
                    👋
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-ui-text-primary mb-2"
                >
                    Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-ui-text-secondary max-w-sm mb-8"
                >
                    Let's personalize your dashboard. This only takes a minute.
                </motion.p>

                <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={onNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg font-medium transition-colors"
                >
                    Get Started
                    <MdArrowForward className="w-4 h-4" />
                </motion.button>
            </div>
        </StepContainer>
    );
};

// Theme Selection Step
const ThemeStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const { theme, setTheme } = useTheme();
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>(
        THEMES.find(t => t.id === theme)?.category as 'dark' | 'light' || 'dark'
    );

    const filteredThemes = THEMES.filter(t => t.category === themeCategory);

    return (
        <StepContainer>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-5 py-4 border-b border-ui-border-primary bg-ui-bg-secondary/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-ui-accent-primary/10 rounded-lg">
                            <MdPalette className="w-5 h-5 text-ui-accent-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-ui-text-primary">Theme</h2>
                            <p className="text-xs text-ui-text-secondary">Pick a color scheme</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Category Toggle */}
                    <div className="flex gap-1 p-1 bg-ui-bg-tertiary rounded-lg mb-4">
                        <button
                            onClick={() => setThemeCategory('dark')}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${themeCategory === 'dark'
                                    ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                    : 'text-ui-text-secondary hover:text-ui-text-primary'
                                }`}
                        >
                            Dark
                        </button>
                        <button
                            onClick={() => setThemeCategory('light')}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${themeCategory === 'light'
                                    ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                    : 'text-ui-text-secondary hover:text-ui-text-primary'
                                }`}
                        >
                            Light
                        </button>
                    </div>

                    {/* Theme Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {filteredThemes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={`relative rounded-lg border transition-colors overflow-hidden ${theme === t.id
                                        ? 'border-ui-accent-primary ring-1 ring-ui-accent-primary'
                                        : 'border-ui-border-primary hover:border-ui-border-secondary'
                                    }`}
                            >
                                {/* Theme Preview */}
                                <div
                                    className="aspect-[4/3] p-2 flex flex-col gap-1"
                                    style={{ backgroundColor: t.colors[2] }}
                                >
                                    <div className="flex gap-1">
                                        <div className="h-1 w-4 rounded-full" style={{ backgroundColor: t.colors[0] }} />
                                        <div className="h-1 w-1.5 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                                    </div>
                                    <div className="flex-1 flex items-end gap-0.5">
                                        <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[0], height: '40%' }} />
                                        <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[1], height: '70%' }} />
                                        <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[0], height: '55%' }} />
                                    </div>
                                </div>

                                {/* Theme Name */}
                                <div className="px-2 py-1.5 bg-ui-bg-secondary/80 flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-ui-text-primary truncate">{t.name}</span>
                                    {theme === t.id && (
                                        <MdCheck className="w-3 h-3 text-ui-accent-primary flex-shrink-0" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-ui-border-primary bg-ui-bg-secondary/30">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary rounded-lg transition-colors"
                    >
                        <MdArrowBack className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        className="flex items-center gap-1.5 px-4 py-2 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Continue
                        <MdArrowForward className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </StepContainer>
    );
};

// Appearance Step (Font Size, Animations, etc.)
const AppearanceStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(
        preferencesService.get(APPEARANCE_SETTINGS.fontSize.key, APPEARANCE_SETTINGS.fontSize.default) as 'small' | 'medium' | 'large'
    );
    const [animations, setAnimations] = useState<boolean>(
        preferencesService.get(APPEARANCE_SETTINGS.animations.key, APPEARANCE_SETTINGS.animations.default) as boolean
    );
    const [compactMode, setCompactMode] = useState<boolean>(
        preferencesService.get(APPEARANCE_SETTINGS.compactMode.key, APPEARANCE_SETTINGS.compactMode.default) as boolean
    );

    const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
        setFontSize(size);
        preferencesService.set(APPEARANCE_SETTINGS.fontSize.key, size);
    };

    const handleAnimationsChange = (enabled: boolean) => {
        setAnimations(enabled);
        preferencesService.set(APPEARANCE_SETTINGS.animations.key, enabled);
    };

    const handleCompactModeChange = (enabled: boolean) => {
        setCompactMode(enabled);
        preferencesService.set(APPEARANCE_SETTINGS.compactMode.key, enabled);
    };

    return (
        <StepContainer>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-5 py-4 border-b border-ui-border-primary bg-ui-bg-secondary/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-ui-accent-secondary/10 rounded-lg">
                            <MdTune className="w-5 h-5 text-ui-accent-secondary" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-ui-text-primary">Appearance</h2>
                            <p className="text-xs text-ui-text-secondary">Customize display settings</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Font Size */}
                    <div>
                        <h3 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mb-3">
                            Font Size
                        </h3>
                        <div className="flex gap-2">
                            {(['small', 'medium', 'large'] as const).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => handleFontSizeChange(size)}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${fontSize === size
                                            ? 'bg-ui-accent-primary text-white'
                                            : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggle Settings */}
                    <div>
                        <h3 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mb-3">
                            Display
                        </h3>
                        <div className="bg-ui-bg-secondary border border-ui-border-primary rounded-lg divide-y divide-ui-border-primary">
                            {/* Animations Toggle */}
                            <div className="flex items-center justify-between p-4">
                                <div>
                                    <div className="text-sm font-medium text-ui-text-primary">Animations</div>
                                    <div className="text-xs text-ui-text-secondary">Smooth transitions</div>
                                </div>
                                <button
                                    onClick={() => handleAnimationsChange(!animations)}
                                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${animations ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                                        }`}
                                >
                                    <motion.div
                                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                        animate={{ x: animations ? 20 : 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>

                            {/* Compact Mode Toggle */}
                            <div className="flex items-center justify-between p-4">
                                <div>
                                    <div className="text-sm font-medium text-ui-text-primary">Compact Mode</div>
                                    <div className="text-xs text-ui-text-secondary">Denser layouts</div>
                                </div>
                                <button
                                    onClick={() => handleCompactModeChange(!compactMode)}
                                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${compactMode ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                                        }`}
                                >
                                    <motion.div
                                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                        animate={{ x: compactMode ? 20 : 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-ui-border-primary bg-ui-bg-secondary/30">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary rounded-lg transition-colors"
                    >
                        <MdArrowBack className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        className="flex items-center gap-1.5 px-4 py-2 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Continue
                        <MdArrowForward className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </StepContainer>
    );
};

// Date & Time Step
const DateTimeStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const [timezone, setTimezone] = useState<string>(
        preferencesService.get(DATETIME_SETTINGS.timezone.key, DATETIME_SETTINGS.timezone.default) as string
    );
    const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(
        preferencesService.get(DATETIME_SETTINGS.clockFormat.key, DATETIME_SETTINGS.clockFormat.default) as '12h' | '24h'
    );
    const [dateFormat, setDateFormat] = useState<string>(
        preferencesService.get(DATETIME_SETTINGS.dateFormat.key, DATETIME_SETTINGS.dateFormat.default) as string
    );

    const handleTimezoneChange = (tz: string) => {
        setTimezone(tz);
        preferencesService.set(DATETIME_SETTINGS.timezone.key, tz);
    };

    const handleClockFormatChange = (format: '12h' | '24h') => {
        setClockFormat(format);
        preferencesService.set(DATETIME_SETTINGS.clockFormat.key, format);
    };

    const handleDateFormatChange = (format: string) => {
        setDateFormat(format);
        preferencesService.set(DATETIME_SETTINGS.dateFormat.key, format);
    };

    // Get current time preview
    const now = new Date();
    const timePreview = clockFormat === '12h'
        ? now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <StepContainer>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-5 py-4 border-b border-ui-border-primary bg-ui-bg-secondary/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <MdSchedule className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-ui-text-primary">Date & Time</h2>
                            <p className="text-xs text-ui-text-secondary">Regional preferences</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Clock Format */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider">
                                Clock Format
                            </h3>
                            <span className="text-sm font-mono text-ui-accent-primary">{timePreview}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleClockFormatChange('12h')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${clockFormat === '12h'
                                        ? 'bg-ui-accent-primary text-white'
                                        : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                    }`}
                            >
                                12-Hour
                            </button>
                            <button
                                onClick={() => handleClockFormatChange('24h')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${clockFormat === '24h'
                                        ? 'bg-ui-accent-primary text-white'
                                        : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                    }`}
                            >
                                24-Hour
                            </button>
                        </div>
                    </div>

                    {/* Timezone */}
                    <div>
                        <h3 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mb-3">
                            Timezone
                        </h3>
                        <select
                            value={timezone}
                            onChange={(e) => handleTimezoneChange(e.target.value)}
                            className="w-full px-3 py-2.5 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all cursor-pointer"
                        >
                            {TIMEZONE_OPTIONS.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Format */}
                    <div>
                        <h3 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mb-3">
                            Date Format
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {DATE_FORMAT_OPTIONS.slice(0, 4).map((df) => (
                                <button
                                    key={df.value}
                                    onClick={() => handleDateFormatChange(df.value)}
                                    className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${dateFormat === df.value
                                            ? 'bg-ui-accent-primary text-white'
                                            : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                        }`}
                                >
                                    {df.example}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-ui-border-primary bg-ui-bg-secondary/30">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary rounded-lg transition-colors"
                    >
                        <MdArrowBack className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        className="flex items-center gap-1.5 px-4 py-2 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Continue
                        <MdArrowForward className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </StepContainer>
    );
};

// Complete Step
const CompleteStep = ({ onComplete }: { onComplete: () => void }) => {
    const handleComplete = () => {
        // Mark onboarding as complete
        preferencesService.set('onboarding.completed', true);
        preferencesService.set('onboarding.completedAt', new Date().toISOString());
        onComplete();
    };

    return (
        <StepContainer>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-10">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-5xl mb-5"
                >
                    🎉
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-ui-text-primary mb-2"
                >
                    You're all set
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-ui-text-secondary max-w-sm mb-8"
                >
                    Your dashboard is ready. An admin will grant you access to widgets.
                    You can change settings anytime from the dock.
                </motion.p>

                <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg font-medium transition-colors"
                >
                    Go to Dashboard
                    <MdArrowForward className="w-4 h-4" />
                </motion.button>
            </div>
        </StepContainer>
    );
};

// Main Onboarding Flow Component
export default function OnboardingFlow({ user, onComplete }: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');

    const goNext = useCallback(() => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex < STEPS.length - 1) {
            setCurrentStep(STEPS[currentIndex + 1]);
        }
    }, [currentStep]);

    const goBack = useCallback(() => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1]);
        }
    }, [currentStep]);

    // Handle skip
    const handleSkip = useCallback(() => {
        preferencesService.set('onboarding.completed', true);
        preferencesService.set('onboarding.skipped', true);
        preferencesService.set('onboarding.completedAt', new Date().toISOString());
        onComplete();
    }, [onComplete]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && currentStep !== 'complete') {
                handleSkip();
            }
            if ((e.key === 'Enter' || e.key === 'ArrowRight') && currentStep !== 'complete' && currentStep !== 'welcome') {
                goNext();
            }
            if (e.key === 'ArrowLeft' && currentStep !== 'welcome' && currentStep !== 'complete') {
                goBack();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, goNext, goBack, handleSkip]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={handleSkip}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary overflow-hidden"
                >
                    {/* Header with step indicator and close */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-ui-border-primary">
                        {currentStep !== 'welcome' && currentStep !== 'complete' ? (
                            <StepIndicator steps={STEPS} currentStep={currentStep} />
                        ) : (
                            <div />
                        )}
                        {currentStep !== 'complete' && (
                            <button
                                onClick={handleSkip}
                                className="p-1.5 hover:bg-ui-bg-tertiary rounded-lg transition-colors text-ui-text-muted hover:text-ui-text-secondary"
                                title="Skip setup (Esc)"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="h-[480px]">
                        <AnimatePresence mode="wait">
                            {currentStep === 'welcome' && (
                                <WelcomeStep key="welcome" user={user} onNext={goNext} />
                            )}
                            {currentStep === 'theme' && (
                                <ThemeStep key="theme" onNext={goNext} onBack={goBack} />
                            )}
                            {currentStep === 'appearance' && (
                                <AppearanceStep key="appearance" onNext={goNext} onBack={goBack} />
                            )}
                            {currentStep === 'datetime' && (
                                <DateTimeStep key="datetime" onNext={goNext} onBack={goBack} />
                            )}
                            {currentStep === 'complete' && (
                                <CompleteStep key="complete" onComplete={onComplete} />
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
