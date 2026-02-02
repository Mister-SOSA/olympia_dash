"use client";

/**
 * @deprecated This file contains legacy modal components for backward compatibility.
 * For new components, use the standardized components:
 * - Dialog, DialogContent, etc. from "@/components/ui/dialog"
 * - ConfirmDialog from "@/components/ui/alert-dialog"
 * - Sheet, SheetContent, etc. from "@/components/ui/sheet"
 * - Drawer, DrawerContent, etc. from "@/components/ui/drawer"
 */

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
} from "./dialog";
import { ConfirmDialog } from "./alert-dialog";

// ============================================
// Legacy Modal Component (Backward Compatible)
// ============================================

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg";
    /** @deprecated Use closeOnOutsideClick instead */
    preventClose?: boolean;
    closeOnOutsideClick?: boolean;
}

/**
 * @deprecated Use `Dialog` from "@/components/ui/dialog" instead.
 * This component is maintained for backward compatibility.
 */
export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
    preventClose = false,
    closeOnOutsideClick,
}: ModalProps) {
    const shouldCloseOnOutside = closeOnOutsideClick ?? !preventClose;

    const sizeMap = {
        sm: "sm" as const,
        md: "md" as const,
        lg: "xl" as const,
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                size={sizeMap[size]}
                closeOnOutsideClick={shouldCloseOnOutside}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogBody>{children}</DialogBody>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// Legacy ConfirmModal Component (Backward Compatible)
// ============================================

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

/**
 * @deprecated Use `ConfirmDialog` from "@/components/ui/alert-dialog" instead.
 * This component is maintained for backward compatibility.
 */
export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = "warning",
    confirmText = "Confirm",
    cancelText = "Cancel",
}: ConfirmModalProps) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title={title}
            description={message}
            type={type}
            confirmText={confirmText}
            cancelText={cancelText}
            onConfirm={handleConfirm}
        />
    );
}

// ============================================
// Legacy InfoModal Component (Backward Compatible)
// ============================================

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

/**
 * @deprecated Use `Dialog` from "@/components/ui/dialog" instead.
 * This component is maintained for backward compatibility.
 */
export function InfoModal({ isOpen, onClose, widget }: InfoModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Widget Information" size="md">
            <div className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold text-ui-text-primary mb-2">{widget.title}</h4>
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
