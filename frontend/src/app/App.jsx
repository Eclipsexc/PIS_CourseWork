import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '../widgets/navbar/Navbar';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { TemplatesPage } from '../features/templates/pages/TemplatesPage';
import { TemplateCreatePage } from '../features/templates/pages/TemplateCreatePage';
import { TemplateDetailPage } from '../features/templates/pages/TemplateDetailPage';
import { SharedTemplatePage } from '../features/templates/pages/SharedTemplatePage';
import { AttemptsPage } from '../features/attempts/pages/AttemptsPage';
import { AttemptDetailPage } from '../features/attempts/pages/AttemptDetailPage';
import { AttemptResultPage } from '../features/attempts/pages/AttemptResultPage';
import { MentorPage } from '../features/mentor/pages/MentorPage';
import { MentorReviewPage } from '../features/mentor/pages/MentorReviewPage';
import { useAuthStore } from '../features/auth/store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isHydrating } = useAuthStore();
  const location = useLocation();

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isHydrating } = useAuthStore();

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();

    const handleUnauthorized = () => initializeAuth();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [initializeAuth]);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-16">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
            <Route path="/templates/create" element={<ProtectedRoute><TemplateCreatePage /></ProtectedRoute>} />
            <Route path="/templates/create-ai" element={<Navigate to="/templates/create" replace />} />
            <Route path="/templates/:templateId" element={<ProtectedRoute><TemplateDetailPage /></ProtectedRoute>} />
            <Route path="/shared/:token" element={<SharedTemplatePage />} />
            <Route path="/attempts" element={<ProtectedRoute><AttemptsPage /></ProtectedRoute>} />
            <Route path="/attempts/:attemptId" element={<ProtectedRoute><AttemptDetailPage /></ProtectedRoute>} />
            <Route path="/attempts/:attemptId/result" element={<ProtectedRoute><AttemptResultPage /></ProtectedRoute>} />
            <Route path="/mentor" element={<ProtectedRoute><MentorPage /></ProtectedRoute>} />
            <Route path="/mentor/attempts/:attemptId" element={<ProtectedRoute><MentorReviewPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
