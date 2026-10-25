import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import GcpTopNav from './components/GcpTopNav';
import DriveSidebar from './components/DriveSidebar';
import DashboardPage from './pages/DashboardPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import ArchitecturePage from './pages/ArchitecturePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './App.css';

export default function App() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [metrics, setMetrics] = useState({ total: 0, completed: 0, failed: 0, processing: 0 });
  const [uploadHandler, setUploadHandler] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <div className="gcp-app-layout">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="gcp-app-layout">
      {/* Console Header */}
      <GcpTopNav
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      {/* Main Body: Sidebar + Content Stage */}
      <div className="gcp-body-container">
        {sidebarOpen && (
          <DriveSidebar
            currentFilter={activeFilter}
            onSelectFilter={setActiveFilter}
            onUploadFile={(file) => uploadHandler && uploadHandler(file)}
            uploading={uploading}
            metrics={metrics}
          />
        )}

        <main className="gcp-main-stage">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  onMetricsUpdate={setMetrics}
                  registerUploadHandler={setUploadHandler}
                  setGlobalUploading={setUploading}
                />
              }
            />
            <Route path="/document/:id" element={<DocumentDetailPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
