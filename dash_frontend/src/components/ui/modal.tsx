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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`relative bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full mx-4 ${sizeClasses[size]}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <h3 className="text-xl font-semibold text-white">{title}</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors"
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
            icon: <MdWarning size={24} />,
            iconColor: "text-yellow-500",
            confirmColor: "bg-yellow-600 hover:bg-yellow-700"
        },
        danger: {
            icon: <MdError size={24} />,
            iconColor: "text-red-500",
            confirmColor: "bg-red-600 hover:bg-red-700"
        },
        info: {
            icon: <MdInfo size={24} />,
            iconColor: "text-blue-500",
            confirmColor: "bg-blue-600 hover:bg-blue-700"
        }
    };

    const config = typeConfig[type];

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="text-center">
                <div className={`mx-auto mb-4 ${config.iconColor}`}>
                    {config.icon}
                </div>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 text-white rounded-lg transition-colors ${config.confirmColor}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
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
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                        <span className="bg-gray-700 px-2 py-1 rounded">{widget.category}</span>
                        <span className="bg-gray-700 px-2 py-1 rounded">Size: {widget.size}</span>
                    </div>
                </div>

                <div>
                    <h5 className="font-medium text-gray-300 mb-2">Description</h5>
                    <p className="text-gray-400 leading-relaxed">
                        {widget.description || "No description available for this widget."}
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-700">
                    <h5 className="font-medium text-gray-300 mb-2">Actions</h5>
                    <p className="text-gray-400 text-sm">
                        Right-click this widget to access quick actions like refresh, resize, or remove.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
