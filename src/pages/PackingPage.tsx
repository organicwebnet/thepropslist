import { useParams, useNavigate } from 'react-router-dom';
import { PackingList } from '../components/packing';
import { useShow } from '../hooks/useShow';
import { useProps } from '../hooks/useProps';
import { usePacking } from '../hooks/usePacking';
import { ArrowLeft } from 'lucide-react';
import { TabNavigation } from '../components/TabNavigation';

export function PackingPage() {
  const navigate = useNavigate();
  const { showId } = useParams<{ showId: string }>();
  const { show, loading: showLoading, error: showError } = useShow(showId);
  const { props, loading: propsLoading, error: propsError } = useProps(showId);
  const { boxes, loading: boxesLoading, createBox, updateBox, deleteBox } = usePacking(showId);

  if (showLoading || propsLoading || boxesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle errors
  if (showError || propsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400">Error loading data</p>
          <p className="text-gray-400 mt-2">{showError?.message || propsError?.message}</p>
          <button
            onClick={() => navigate('/packing')}
            className="mt-4 text-primary hover:text-primary/80"
          >
            Back to Show Selection
          </button>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400">Show not found</p>
          <button
            onClick={() => navigate('/packing')}
            className="mt-4 text-primary hover:text-primary/80"
          >
            Back to Show Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <TabNavigation 
        activeTab="packing" 
        setActiveTab={(tab: 'props' | 'shows' | 'packing') => navigate(`/${tab}`)} 
        navigate={navigate} 
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/packing')}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Show Selection</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-200">{show.name}</h1>
        </div>
        <PackingList
          show={show}
          props={props}
          boxes={boxes}
          isLoading={showLoading || propsLoading || boxesLoading}
          onCreateBox={createBox}
          onUpdateBox={updateBox}
          onDeleteBox={deleteBox}
        />
      </div>
    </>
  );
} 