"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdWarning, MdInfo, MdCheckCircle, MdError } from "react-icons/md";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl"
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`relative bg-ui-bg-secondary rounded-xl shadow-2xl border border-ui-border-primary w-full mx-4 ${sizeClasses[size]}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-ui-border-primary">
                            <h3 className="text-xl font-semibold text-ui-text-primary">{title}</h3>
                            <button
                                onClick={onClose}
                                className="text-ui-text-muted hover:text-ui-text-primary transition-colors"
                            >
                                <MdClose size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: "warning" | "danger" | "info";
    confirmText?: string;
    cancelText?: string;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = "warning",
    confirmText = "Confirm",
    cancelText = "Cancel"
}: ConfirmModalProps) {
    const typeConfig = {
        warning: {
            icon: <MdWarning size={20} />,
            iconColor: "text-yellow-500",
            confirmColor: "bg-yellow-600 hover:bg-yellow-500 text-white"
        },
        danger: {
            icon: <MdError size={20} />,
            iconColor: "text-red-500",
            confirmColor: "bg-red-600 hover:bg-red-500 text-white"
        },
        info: {
            icon: <MdInfo size={20} />,
            iconColor: "text-ui-accent-primary",
            confirmColor: "bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-white"
        }
    };

    const config = typeConfig[type];

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative bg-ui-bg-secondary rounded-lg shadow-xl border border-ui-border-primary w-full max-w-md overflow-hidden"
                    >
                        {/* Content */}
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={config.iconColor}>
                                    {config.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-ui-text-primary">{title}</h3>
                            </div>
                            <p className="text-ui-text-secondary leading-relaxed whitespace-pre-line">{message}</p>
                        </div>

                        {/* Actions */}
                        <div className="bg-ui-bg-tertiary px-6 py-4 flex gap-3 justify-end border-t border-ui-border-primary">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-5 py-2 text-sm font-semibold rounded-md transition-colors ${config.confirmColor}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    widget: {
        title: string;
        category: string;
        description?: string;
        size: string;
    };
}

export function InfoModal({ isOpen, onClose, widget }: InfoModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Widget Information" size="md">
            <div className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold text-white mb-2">{widget.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-ui-text-muted mb-4">
                        <span className="bg-ui-bg-tertiary px-2 py-1 rounded">{widget.category}</span>
                        <span className="bg-ui-bg-tertiary px-2 py-1 rounded">Size: {widget.size}</span>
                    </div>
                </div>

                <div>
                    <h5 className="font-medium text-ui-text-secondary mb-2">Description</h5>
                    <p className="text-ui-text-muted leading-relaxed">
                        {widget.description || "No description available for this widget."}
                    </p>
                </div>

                <div className="pt-4 border-t border-ui-border-primary">
                    <h5 className="font-medium text-ui-text-secondary mb-2">Actions</h5>
                    <p className="text-ui-text-muted text-sm">
                        Right-click this widget to access quick actions like refresh, resize, or remove.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
