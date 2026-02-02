/**
 * Standardized UI Components for Olympia Dashboard
 * 
 * This module exports all the standardized modal, dialog, drawer, and sheet
 * components that integrate with the theme system. Use these components
 * instead of creating custom modal implementations.
 * 
 * ## Modal/Dialog Components
 * 
 * ### Dialog (centered modal)
 * Use for forms, confirmations, and focused interactions.
 * ```tsx
 * import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
 * 
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <DialogContent size="md">
 *     <DialogHeader>
 *       <DialogTitle>Edit Profile</DialogTitle>
 *     </DialogHeader>
 *     <DialogBody>Content here</DialogBody>
 *     <DialogFooter>
 *       <Button onClick={handleSave}>Save</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 * 
 * ### AlertDialog / ConfirmDialog
 * Use for confirmations that require explicit user action.
 * ```tsx
 * import { ConfirmDialog } from '@/components/ui/alert-dialog';
 * 
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Item?"
 *   description="This action cannot be undone."
 *   type="danger"
 *   confirmText="Delete"
 *   onConfirm={handleDelete}
 * />
 * ```
 * 
 * ### Sheet (slide-out panel)
 * Use for settings panels, navigation menus, or side content.
 * ```tsx
 * import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
 * 
 * <Sheet open={isOpen} onOpenChange={setIsOpen}>
 *   <SheetContent side="right">
 *     <SheetHeader>
 *       <SheetTitle>Settings</SheetTitle>
 *     </SheetHeader>
 *     <SheetBody>Content here</SheetBody>
 *   </SheetContent>
 * </Sheet>
 * ```
 * 
 * ### Drawer (mobile-friendly bottom sheet)
 * Use for mobile menus and touch-friendly interactions. Supports swipe gestures.
 * ```tsx
 * import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from '@/components/ui/drawer';
 * 
 * <Drawer open={isOpen} onOpenChange={setIsOpen}>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Options</DrawerTitle>
 *     </DrawerHeader>
 *     <DrawerBody>Content here</DrawerBody>
 *   </DrawerContent>
 * </Drawer>
 * ```
 * 
 * ## Key Features
 * 
 * - ✅ Consistent close behavior: All components close on outside click and Escape key by default
 * - ✅ Theme integration: All components use CSS variables (--ui-*) for colors
 * - ✅ Accessible: Built on Radix UI primitives with full ARIA support
 * - ✅ Animated: Smooth enter/exit animations
 * - ✅ Focus management: Proper focus trapping and restoration
 * - ✅ Responsive: Mobile-friendly with touch support (Drawer)
 * 
 * ## Size Variants
 * 
 * Dialog sizes: "sm" | "md" | "lg" | "xl" | "full"
 * Sheet sides: "top" | "right" | "bottom" | "left"
 * Drawer directions: "top" | "bottom" | "left" | "right"
 * 
 * ## Customization
 * 
 * All components accept className prop for additional styling:
 * ```tsx
 * <DialogContent size="md" className="my-custom-class">
 * ```
 * 
 * Control close behavior:
 * ```tsx
 * <DialogContent closeOnOutsideClick={false} closeOnEscape={true}>
 * ```
 */

// Dialog - Centered modal dialogs
export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogBody,
} from './dialog';

// AlertDialog - Confirmation dialogs
export {
    AlertDialog,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
    ConfirmDialog,
} from './alert-dialog';

// Sheet - Side panels
export {
    Sheet,
    SheetPortal,
    SheetOverlay,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
    SheetBody,
} from './sheet';

// Drawer - Mobile-friendly bottom sheets
export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
    DrawerBody,
} from './drawer';

// Legacy components (deprecated, use above instead)
export { Modal, ConfirmModal, InfoModal } from './modal';
