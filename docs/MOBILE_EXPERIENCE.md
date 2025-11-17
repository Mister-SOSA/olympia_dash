# Mobile Dashboard Experience

## Overview

The Olympia Dashboard now features a **completely redesigned mobile experience** that transforms the desktop grid layout into a beautiful, swipeable carousel of full-screen widgets.

## Key Features

### 🎯 Mobile-First Design
- **One Widget Per Screen**: Each widget occupies the entire screen for maximum visibility and usability
- **Swipe Navigation**: Intuitive left/right swipes to navigate between widgets
- **Auto-Hiding Controls**: Navigation elements fade away for an immersive experience
- **Touch-Optimized**: All interactions are designed for touch devices

### 📱 Responsive Breakpoint
- **Automatic Detection**: Switches to mobile mode at 768px and below
- **Zero Configuration**: No manual switching required - it just works!

### 🎨 User Interface Elements

#### Top Navigation Bar (Auto-Hide)
- **Menu Button**: Access widget management
- **Widget Title**: Shows current widget name and position (e.g., "Sales Overview 1/5")
- **Settings Button**: Quick access to settings and logout

#### Widget Carousel
- **Full-Screen Widgets**: Each widget renders at maximum size for optimal viewing
- **Smooth Animations**: Beautiful transitions between widgets with spring physics
- **Drag Support**: Pull widgets left/right to preview the next/previous widget
- **Momentum Scrolling**: Flick gestures for quick navigation

#### Bottom Navigation (Auto-Hide)
- **Widget Dots**: Visual indicators showing all available widgets
- **Active Indicator**: Animated dot highlights the current widget
- **Quick Jump**: Tap any dot to instantly jump to that widget
- **Responsive Layout**: Dots wrap gracefully on smaller screens

#### Side Arrows
- **Contextual Display**: Only appear when there are adjacent widgets
- **Left Arrow**: Navigate to previous widget
- **Right Arrow**: Navigate to next widget
- **Auto-Hide**: Fade away with other navigation elements

### ✨ Special States

#### Empty State
When no widgets are enabled, displays a helpful message with:
- Large icon
- Clear instructions
- "Add Widgets" button for quick access

#### Swipe Hint
On first load with multiple widgets:
- Animated chevron appears briefly
- Guides users to discover swipe functionality
- Automatically fades after 4 seconds

### 🔒 Permissions Integration
- Only shows widgets the user has access to
- Seamlessly filters based on widget permissions
- Consistent with desktop experience

## Technical Implementation

### Components

#### `MobileDashboard.tsx`
The main mobile dashboard component featuring:
- Framer Motion for smooth animations
- PanInfo tracking for gesture detection
- Auto-hiding navigation with timeout management
- Widget permission filtering

#### `useMediaQuery.ts`
Custom React hook for responsive design:
- `useIsMobile()`: Returns true for screens ≤768px
- `useIsTablet()`: Returns true for screens 769px-1024px
- `useIsDesktop()`: Returns true for screens ≥1025px
- `useIsTouchDevice()`: Detects touch-capable devices

### CSS Architecture

Mobile styles are organized in `globals.css`:
- **Mobile Dashboard**: Core layout and structure
- **Top Navigation**: Auto-hiding top bar with gradient
- **Widget Container**: Carousel and slide animations
- **Bottom Navigation**: Dots and indicators
- **Responsive Overrides**: Media queries for mobile-specific behavior
- **Landscape Support**: Optimized padding for landscape mode

### Animations

All animations use Framer Motion:
- **Page Transitions**: Spring physics (stiffness: 300, damping: 30)
- **Navigation Fade**: 300ms fade in/out
- **Gesture Tracking**: Real-time opacity based on drag position
- **Active Indicator**: Shared layout animation for smooth transitions

## Usage

### For Users

1. **Navigate Between Widgets**:
   - Swipe left/right
   - Tap side arrows
   - Tap bottom dots
   - Use keyboard (if connected)

2. **Reveal Navigation**:
   - Touch the screen
   - Move the mouse (tablets)
   - Navigation auto-hides after 3 seconds

3. **Manage Widgets**:
   - Tap menu button (top-left)
   - Add/remove widgets
   - Changes sync immediately

4. **Access Settings**:
   - Tap settings button (top-right)
   - Same settings as desktop
   - Logout option available

### For Developers

#### Adding Mobile-Specific Widget Styles

```css
@media (max-width: 768px) {
  .your-widget-class {
    /* Mobile-specific styles */
    font-size: 0.875rem;
    padding: 0.5rem;
  }
}
```

#### Testing Mobile View

1. **Browser DevTools**:
   - Open DevTools (F12)
   - Toggle device toolbar
   - Select a mobile device or set width to ≤768px

2. **Real Device Testing**:
   - Connect to local dev server
   - Access via device IP
   - Test touch gestures naturally

#### Customizing Breakpoint

Modify the breakpoint in `useMediaQuery.ts`:

```typescript
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
// Change 768px to your desired breakpoint
```

## Performance

### Optimizations
- **Lazy Loading**: Widgets use React.lazy() for code splitting
- **Suspense Boundaries**: Loading states prevent layout shift
- **Debounced Events**: Auto-hide timeout prevents excessive re-renders
- **Layout Animations**: GPU-accelerated transforms (translate, scale)
- **Conditional Rendering**: Mobile/desktop components never render simultaneously

### Best Practices
- Widgets should handle responsive sizing internally
- Avoid fixed dimensions in widget components
- Use relative units (rem, %, vh/vw) instead of pixels
- Test with Chrome DevTools Performance tab

## Browser Support

- **iOS Safari**: ✅ Full support (iOS 12+)
- **Chrome Mobile**: ✅ Full support
- **Firefox Mobile**: ✅ Full support
- **Samsung Internet**: ✅ Full support
- **Edge Mobile**: ✅ Full support

### Required Features
- CSS Grid
- CSS Custom Properties (variables)
- Touch Events
- Viewport units (vh, vw)
- CSS `env()` for safe areas

## Future Enhancements

Potential improvements:
- [ ] Pull-to-refresh widget data
- [ ] Pinch-to-zoom for detailed charts
- [ ] Widget search/filter in mobile menu
- [ ] Haptic feedback on navigation
- [ ] Offline support with service workers
- [ ] Voice commands for navigation
- [ ] Widget previews in carousel
- [ ] Customizable swipe sensitivity

## Troubleshooting

### Navigation doesn't auto-hide
- Check if touch events are firing
- Verify `hideNavTimeout` cleanup
- Test in incognito mode (extensions may interfere)

### Widgets appear clipped
- Ensure widget doesn't use fixed heights
- Check for overflow: hidden on parent
- Verify safe area insets are applied

### Swipe gestures not working
- Confirm touch-action CSS isn't blocking
- Check browser console for errors
- Test with different swipe velocities

### Performance issues
- Profile with React DevTools
- Check for memory leaks in widget components
- Reduce animation complexity
- Enable hardware acceleration

## Related Files

- `/src/components/MobileDashboard.tsx` - Main mobile component
- `/src/components/Dashboard.tsx` - Routing logic
- `/src/hooks/useMediaQuery.ts` - Responsive detection
- `/src/styles/globals.css` - Mobile styles (search "MOBILE DASHBOARD")

## Support

For issues or questions:
1. Check this README
2. Review component comments
3. Test in browser DevTools
4. Check browser console for errors
