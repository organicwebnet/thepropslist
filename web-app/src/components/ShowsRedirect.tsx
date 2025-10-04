import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useFirebase } from '../contexts/FirebaseContext';

const ShowsRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWebAuth();
  const { service } = useFirebase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkShows = async () => {
      if (!user?.uid) {
        navigate('/login');
        return;
      }

      try {
        // Check if user has any shows
        const shows = await service.getDocuments('shows', {
          where: [['createdBy', '==', user.uid]]
        });

        if (shows.length === 0) {
          // No shows, redirect to create first show
          navigate('/shows/new');
        } else {
          // Has shows, show the actual shows list
          navigate('/shows/list');
        }
      } catch (error) {
        console.error('Error checking shows:', error);
        // On error, redirect to create show
        navigate('/shows/new');
      } finally {
        setLoading(false);
      }
    };

    checkShows();
  }, [navigate, user?.uid, service]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-pb-gray">Loading shows...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-pb-gray">Redirecting...</div>
    </div>
  );
};

export default ShowsRedirect;
