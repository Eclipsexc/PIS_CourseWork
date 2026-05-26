# PrepAI Frontend

Modern React frontend for the AI-Powered Preparation Platform, built with Vite, React, and Tailwind CSS.

## Features

- 🎨 Beautiful UI with gradient buttons and glass-morphism effects (Statify-inspired)
- 🌙 Dark theme with animated backgrounds
- ⚡ Fast development with Vite
- 🎭 Smooth animations with Framer Motion
- 🔐 JWT authentication
- 📱 Fully responsive design
- 🎯 State management with Zustand
- 🔥 Hot toast notifications

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set API URL (default: http://localhost:8000)
```

### Development

```bash
# Start development server
npm run dev

# Frontend will be available at http://localhost:3000
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── UI.jsx       # Button, Card, Input, Badge, etc.
│   │   └── Navbar.jsx   # Navigation bar
│   ├── pages/           # Page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── DashboardPage.jsx
│   ├── services/        # API services
│   │   └── api.js       # Axios instance and API calls
│   ├── store/           # Zustand stores
│   │   └── authStore.js # Authentication state
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## UI Components

### Button
```jsx
import { Button } from './components/UI';

<Button variant="gradient" size="lg" icon={Sparkles}>
  Click Me
</Button>
```

Variants: `gradient`, `outline`, `ghost`, `danger`, `success`

### GlassCard
```jsx
import { GlassCard } from './components/UI';

<GlassCard hover>
  <h2>Card Title</h2>
  <p>Card content</p>
</GlassCard>
```

### Input
```jsx
import { Input } from './components/UI';
import { Mail } from 'lucide-react';

<Input
  label="Email"
  type="email"
  icon={Mail}
  placeholder="your@email.com"
/>
```

### Badge
```jsx
import { Badge } from './components/UI';

<Badge variant="success">Active</Badge>
```

Variants: `success`, `warning`, `error`, `info`

## Styling

The project uses Tailwind CSS with custom utilities:

- `.btn-gradient` - Gradient button with hover effects
- `.glass-card` - Glass-morphism card
- `.gradient-text` - Gradient text effect
- `.input-field` - Styled input field
- `.animated-bg` - Animated gradient background

## API Integration

API calls are handled through `src/services/api.js`:

```javascript
import { authAPI, templatesAPI, attemptsAPI } from './services/api';

// Login
const result = await authAPI.login({ email, password });

// Get templates
const templates = await templatesAPI.getAll();

// Create attempt
const attempt = await attemptsAPI.create({ template_id: 1 });
```

## State Management

Authentication state is managed with Zustand:

```javascript
import { useAuthStore } from './store/authStore';

const { user, isAuthenticated, login, logout } = useAuthStore();
```

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:8000
```

## Available Routes

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Dashboard (protected)
- `/templates` - Templates list (protected)
- `/attempts` - Attempts list (protected)
- `/mentor` - Mentor panel (protected, mentor only)

## Design System

### Colors

- Primary: Purple to Pink gradient
- Success: Green
- Warning: Yellow
- Error: Red
- Info: Blue
- Dark: Slate shades

### Animations

- Floating elements
- Gradient animations
- Hover effects
- Page transitions
- Loading spinners

## Contributing

1. Follow the existing code style
2. Use functional components with hooks
3. Keep components small and reusable
4. Use Tailwind utility classes
5. Add animations with Framer Motion

## License

MIT
