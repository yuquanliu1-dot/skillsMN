import React, { useState } from 'react';
import { SetupDialog } from './components/SetupDialog';

const App: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    // Check if setup is needed
    const checkSetup = async () => {
      try {
        const response = await window.electronAPI.configGet();
        const config = response.data;

        // Show setup dialog if project directory is not configured
        if (!config.projectSkillDir) {
          setShowSetup(true);
        }
      } catch (error) {
        console.error('Failed to check setup:', error);
        setShowSetup(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSetup();
  }, []);

  const handleSetupComplete = (projectDir: string) => {
    console.log('Setup complete:', projectDir);
    setShowSetup(false);
    // Trigger skill list load or other initialization
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500"></div>
          <p className="mt-4 text-gray-400">Loading SkillsMM...</p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return <SetupDialog onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-primary-400">SkillsMM</h1>
      </header>
      <main className="container mx-auto p-6">
        <div className="rounded-lg bg-gray-800 p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Skill Management Center</h2>
          <p className="text-gray-400 mb-4">
            Your local Claude Code skill management dashboard
          </p>
          <p className="text-sm text-gray-500">
            Configuration complete! Start managing your skills.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
