interface TabNavigationProps {
  activeTab: 'props' | 'shows' | 'packing';
  setActiveTab: (tab: 'props' | 'shows' | 'packing') => void;
  navigate: (path: string) => void;
}

export function TabNavigation({ activeTab, setActiveTab, navigate }: TabNavigationProps) {
  return (
    <div className="mb-6">
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('props');
              navigate('/props');
            }}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'props'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Props
          </button>
          <button
            onClick={() => {
              setActiveTab('shows');
              navigate('/shows');
            }}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'shows'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Shows
          </button>
          <button
            onClick={() => {
              setActiveTab('packing');
              navigate('/packing');
            }}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'packing'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Packing
          </button>
        </nav>
      </div>
    </div>
  );
} 