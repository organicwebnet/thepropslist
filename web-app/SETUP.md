# Props Bible Homepage Template - Setup Instructions

This template provides a pixel-perfect recreation of the Props Bible homepage dashboard using React, Tailwind CSS, and Framer Motion.

## 📋 Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or later)
- **npm** or **yarn**
- A modern web browser

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

or if you prefer yarn:

```bash
yarn install
```

### 2. Start Development Server

```bash
npm run dev
```

or:

```bash
yarn dev
```

The application will open in your browser at `http://localhost:3000`

## 📁 Project Structure

```
template/
├── src/
│   ├── PropsBibleHomepage.tsx  # Main component
│   ├── App.tsx                 # App wrapper
│   ├── main.tsx               # Entry point
│   └── index.css              # Styles with Tailwind
├── index.html                 # HTML template
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind configuration
├── vite.config.js            # Vite configuration
├── tsconfig.json             # TypeScript config
└── postcss.config.js         # PostCSS config
```

## 🎨 Features Implemented

### Visual Elements
- ✅ Dark purple gradient background
- ✅ Responsive sidebar with Quick Actions and Navigation
- ✅ Show banner with animated progress bar
- ✅ Statistics cards with icons and hover effects
- ✅ Color-coded Production Management cards
- ✅ Recent Props Activity feed
- ✅ Department Status section with progress indicators

### Animations
- ✅ Staggered entrance animations
- ✅ Hover effects on interactive elements
- ✅ Smooth progress bar animations
- ✅ Card scaling and transitions

### Responsive Design
- ✅ Mobile-first responsive layout
- ✅ Adaptive grid systems
- ✅ Flexible sidebar behavior
- ✅ Optimized for desktop and tablet viewing

## 🎯 Customization

### Colors
The template uses a custom color palette defined in `tailwind.config.js`:

```javascript
colors: {
  'pb-primary': '#6366f1',    // Main purple
  'pb-secondary': '#8b5cf6',  // Secondary purple
  'pb-accent': '#ec4899',     // Pink accent
  'pb-success': '#10b981',    // Green
  'pb-warning': '#f59e0b',    // Orange
  'pb-blue': '#3b82f6',       // Blue
  // ... more colors
}
```

### Typography
The template uses Inter font family for clean, modern typography:

```css
font-family: 'Inter', system-ui, sans-serif
```

### Icons
Icons are provided by Lucide React. To add new icons:

```tsx
import { NewIcon } from 'lucide-react';

<NewIcon className="w-5 h-5 text-pb-primary" />
```

## ⚡ Performance Optimizations

- **Code Splitting**: Automatic with Vite
- **Tree Shaking**: Unused code removal
- **Optimized Images**: Responsive image handling
- **Minimal Bundle**: Only necessary dependencies included

## 🔧 Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🎨 Design System

### Component Hierarchy
1. **Header**: Logo, platform badge, notifications
2. **Sidebar**: Quick actions and navigation menu
3. **Main Content**: 
   - Show banner with progress
   - Statistics grid
   - Production management cards
   - Activity feed
   - Department status

### Color Usage
- **Primary**: Main UI elements, buttons, links
- **Secondary**: Supporting elements, hover states
- **Accent**: Notifications, highlights, CTAs
- **Success**: Positive states, completion indicators
- **Warning**: Attention states, pending items
- **Error**: Error states, critical alerts

### Animation Principles
- **Entrance**: Staggered fade-in with slight movement
- **Interaction**: Gentle scaling and color transitions
- **Progress**: Smooth percentage-based animations
- **Feedback**: Immediate visual response to user actions

## 🛠 Development Tips

### Adding New Sections
1. Create new motion variants for consistent animations
2. Use the established color palette
3. Follow the existing grid patterns
4. Maintain responsive behavior

### Custom Animations
```tsx
const customVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div variants={customVariants} />
```

### Responsive Breakpoints
- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up

## 📞 Support

For questions or issues with this template:

1. Check the console for any error messages
2. Ensure all dependencies are properly installed
3. Verify Node.js version compatibility
4. Review the browser developer tools for styling issues

## 📄 License

This template is provided as-is for development purposes. Please respect the original Props Bible design and branding. 