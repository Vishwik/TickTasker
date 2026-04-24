import React, { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import { ProfileProvider } from './context/ProfileContext';
import ConflictModal from './components/Sync/ConflictModal';
import Layout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <Tasks />;
      case 'analytics': return <Analytics />;
      default: return <Dashboard />;
    }
  };

  return (
    <TaskProvider>
      <ProfileProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          {renderContent()}
        </Layout>
        <ConflictModal />
      </ProfileProvider>
    </TaskProvider>
  );
}

export default App;
