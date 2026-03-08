import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-primary-400">SkillsMM</h1>
      </header>
      <main className="container mx-auto p-6">
        <div className="rounded-lg bg-gray-800 p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to SkillsMM</h2>
          <p className="text-gray-400">
            Local skill management center for Claude Code
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
