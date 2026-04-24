import React, { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import ConflictModal from './components/Sync/ConflictModal';
import Layout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import AuthScreen from './components/AuthScreen';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, authLoading } = useProfile();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <Tasks />;
      case 'analytics': return <Analytics />;
      default: return <Dashboard />;
    }
  };

  // If still loading auth state, AuthScreen handles the spinner
  if (authLoading || !user) {
    return <AuthScreen />;
  }

  return (
    <TaskProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
    </TaskProvider>
  );
}

function App() {
  return (
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  );
}

export default App;
