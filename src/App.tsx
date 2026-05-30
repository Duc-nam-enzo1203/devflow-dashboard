import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Partners from './pages/Partners';
import Calendar from './pages/Calendar';
import Planning from './pages/Planning';
import Settings from './pages/Settings';
import Timeline from './pages/Timeline';
import Team from './pages/Team';
import Kanban from './pages/Kanban';
import ProjectDetails from './pages/ProjectDetails';
import DailyLog from './pages/DailyLog';
import Notes from './pages/Notes';
import Login from './pages/Login';
import PublicPartnerStatus from './pages/PublicPartnerStatus';
import PublicProjectDetails from './pages/PublicProjectDetails';
import NotFound from './pages/NotFound';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { EventsProvider } from './context/EventsContext';
import { ProjectsProvider } from './context/ProjectsContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ProjectsProvider>
          <EventsProvider>
            <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<PublicPartnerStatus />} />
                <Route path="/project/:id" element={<PublicProjectDetails />} />
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="partners" element={<Partners />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="planning" element={<Planning />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="timeline" element={<Timeline />} />
                  <Route path="team" element={<Team />} />
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="projects/:slug" element={<ProjectDetails />} />
                  <Route path="daily-log" element={<DailyLog />} />
                  <Route path="notes" element={<Notes />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </EventsProvider>
      </ProjectsProvider>
    </SettingsProvider>
  </ThemeProvider>
  );
}
