# VeraFi Frontend

React-based web application for the VeraFi Identity Verification Platform.

## Overview

The VeraFi frontend provides a modern, responsive user interface for identity verification workflows including document upload, face recognition, and liveness detection. Built with React, TypeScript, and shadcn/ui components.

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Zustand** - State management (via contexts)

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── contexts/      # React context providers
│   │   └── ui/            # shadcn/ui components
│   ├── pages/             # Page components
│   │   ├── verification/  # Verification workflow pages
│   │   └── ...            # Other pages
│   ├── services/          # API service layer
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   └── App.tsx            # Main application component
├── public/                # Static assets
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn package manager

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment (optional):
   ```bash
   cp env_example .env
   ```

   Edit `.env` if needed:
   ```env
   # Backend API URL (used by Vite proxy)
   VITE_API_BACKEND_URL=http://localhost:8000

   # Legacy microservice URL (not currently used)
   VITE_API_BASE_URL=http://localhost:8001
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:8080 (or the port shown in terminal).

### Build

Create a production build:
```bash
npm run build
```

Build output will be in the `dist/` directory.

Preview production build:
```bash
npm run preview
```

## Key Features

### Authentication
- Multi-factor authentication (password and OTP)
- Role-based access control (Product Owner, Admin, Operator)
- Session management with secure token handling

### Verification Workflow
- Document upload and preview
- Real-time document analysis
- Face extraction and comparison
- Video-based liveness detection
- Step-by-step verification flow with progress tracking

### User Management
- Tenant onboarding and management
- User creation and role assignment
- Subscription plan management
- Usage tracking and analytics

### UI Features
- Responsive design for mobile and desktop
- Dark/light theme support
- Customizable theme colors
- Progressive Web App (PWA) capabilities
- Internationalization support

## API Integration

The frontend communicates exclusively with the backend API (not directly with the microservice). API calls are made through service modules in `src/services/`:

- `api.ts` - Base Axios instance with interceptors
- `authService.ts` - Authentication and OTP
- `verificationService.ts` - Document verification
- `userService.ts` - User management
- `tenantService.ts` - Tenant management
- `subscriptionService.ts` - Subscription plans
- `configService.ts` - System configuration

The Vite proxy (`vite.config.ts`) forwards `/api` requests to the backend during development.

## Configuration

### Vite Configuration

Key settings in `vite.config.ts`:
- **Proxy**: Forwards API requests to backend
- **Base URL**: For deployment path
- **Build**: Optimized production builds with code splitting

### Tailwind Configuration

Custom theme configuration in `tailwind.config.ts`:
- Extended color palette
- Custom animations
- Typography plugin
- shadcn/ui integration

### Environment Variables

Supported environment variables:
- `VITE_API_BACKEND_URL` - Backend API base URL
- `VITE_API_BASE_URL` - Legacy microservice URL (unused)
- `VITE_BASE_URL` - Application base path for deployment

## Components

### Core Components

- **AppLayout** - Main application layout with sidebar and header
- **AppSidebar** - Navigation sidebar with role-based menu items
- **AppHeader** - Top navigation bar with user menu
- **RoleGuard** - Route protection based on user roles

### Verification Components

- **DocumentCard** - Document upload and preview
- **FaceRecognition** - Selfie capture and face extraction
- **VideoCapture** - Liveness detection with video recording
- **DriverLicenseData** / **PassportData** - Document data display

### Context Providers

- **AuthContext** - Authentication state and user session
- **VerificationContext** - Verification workflow state
- **AppearanceContext** - Theme and appearance settings

## Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow functional component patterns with hooks
- Use proper TypeScript types (avoid `any`)
- Keep components focused and single-responsibility

### Component Development

- Place reusable components in `src/components/`
- Place page components in `src/pages/`
- Use shadcn/ui components from `src/components/ui/`
- Create custom hooks in `src/hooks/` for shared logic

### State Management

- Use React Context for global state
- Use local state (`useState`) for component-specific state
- Keep API calls in service modules, not components

## Building for Production

### Standard Build

```bash
npm run build
```

### Development Build

Build with development environment settings:
```bash
npm run build:dev
```

### Deployment

The built files in `dist/` can be served by:
- Static file server (Nginx, Apache)
- Node.js server (serve, http-server)
- Process manager (PM2)
- CDN (Cloudflare, AWS CloudFront)

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## PWA Support

The application includes Progressive Web App support:
- Installable on mobile and desktop
- Offline-capable (with service worker)
- App manifest for native-like experience
- Install prompts for supported browsers

PWA configuration in `manifest.json` and service worker registration in `src/main.tsx`.

## Troubleshooting

### Build Errors

If you encounter build errors:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use clean install
npm ci
```

### Port Conflicts

If port 8080 is in use, Vite will automatically use the next available port. Check the terminal output for the actual URL.

### API Connection Issues

- Verify backend is running on the expected port
- Check `VITE_API_BACKEND_URL` in `.env` or `vite.config.ts`
- Review browser console for CORS or network errors

## License

This project is part of the VeraFi Identity Verification Platform for AcuFi.
