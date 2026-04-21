# Ping Runner - Frontend Dashboard

A modern, high-performance dashboard for monitoring and managing your service uptime. Built with React, Vite, and Tailwind CSS.

## 🚀 Overview
This is the client-side application for the Ping Runner ecosystem. It provides a real-time interface to track the health of your web services, manage your monitoring registry, and view uptime analytics at a glance.

### Key Features
- **Real-time Health Monitoring**: Live status indicators and response time tracking (10s polling).
- **Service Management**: Add, edit, pause, and delete services directly from the dashboard.
- **Manual Pinging**: Trigger an immediate health check with a single click.
- **Health History**: Visual bar charts showing the last 24 ping results for each service.
- **OAuth Integration**: Seamless login experience using Google and GitHub via the backend.
- **Responsive Design**: Beautifully crafted dark-mode interface optimized for all screen sizes.

## 🛠 Tech Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **API Client**: [Axios](https://axios-http.com/) (with automatic snake_case/camelCase conversion)
- **Icons/Fonts**: Google Fonts (Outfit, Inter)

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have the [Ping Runner Backend](https://github.com/your-repo/ping-runner-backend) running or accessible.

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# URL of your NestJS backend API
VITE_API_URL="http://localhost:3000/api"
```

### 4. Run Development Server
```bash
pnpm dev
```
The dashboard will be available at `http://localhost:5173`.

## 📦 Build for Production
```bash
pnpm build
```
The output will be in the `dist/` folder, ready to be hosted on Vercel, Netlify, or Render Static Sites.

## 📝 Folder Structure
- `src/App.tsx`: Main dashboard component and state management.
- `src/lib/api.ts`: Centralized Axios instance with interceptors for case conversion.
- `src/index.css`: Global styles and Tailwind CSS v4 configuration.

## 📜 License
MIT
