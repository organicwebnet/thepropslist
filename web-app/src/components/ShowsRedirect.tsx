import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useFirebase } from '../contexts/FirebaseContext';

const ShowsRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useWebAuth();
  const { service } = useFirebase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkShows = async () => {
      if (!user?.uid) {
        navigate('/login');
        return;
      }

      console.log('ShowsRedirect: Starting show check', { 
        userId: user.uid, 
        userProfile: userProfile?.role,
        isGod: userProfile?.role === 'god'
      });

      try {
        // Check if user has any shows - check multiple ways
        const [createdByShows, userIdShows, collaborativeShows] = await Promise.all([
          // Shows created by this user
          service.getDocuments('shows', {
            where: [['createdBy', '==', user.uid]]
          }).catch((err) => {
            console.error('ShowsRedirect: Error fetching createdBy shows:', err);
            return [];
          }),
          // Shows with userId field (legacy)
          service.getDocuments('shows', {
            where: [['userId', '==', user.uid]]
          }).catch((err) => {
            console.error('ShowsRedirect: Error fetching userId shows:', err);
            return [];
          }),
          // Shows where user is a collaborator
          service.getDocuments('shows', {
            where: [['collaborators', 'array-contains', user.uid]]
          }).catch((err) => {
            console.error('ShowsRedirect: Error fetching collaborative shows:', err);
            return [];
          })
        ]);

        // Combine and deduplicate shows
        const allShows = [...createdByShows, ...userIdShows, ...collaborativeShows];
        const uniqueShows = allShows.filter((show, index, self) => 
          index === self.findIndex(s => s.id === show.id)
        );

        console.log('ShowsRedirect: Found shows for user', { 
          userId: user.uid, 
          userRole: userProfile?.role,
          createdByCount: createdByShows.length, 
          userIdCount: userIdShows.length,
          collaborativeCount: collaborativeShows.length,
          totalUnique: uniqueShows.length,
          createdByShows: createdByShows.map(s => ({ id: s.id, name: s.data?.name })),
          userIdShows: userIdShows.map(s => ({ id: s.id, name: s.data?.name })),
          collaborativeShows: collaborativeShows.map(s => ({ id: s.id, name: s.data?.name }))
        });

        if (uniqueShows.length === 0) {
          // No shows found, but if user is god, they might have access to all shows
          if (userProfile?.role === 'god') {
            console.log('ShowsRedirect: God user with no direct shows, checking for any shows in system');
            try {
              const allSystemShows = await service.getDocuments('shows').catch((err) => {
                console.error('ShowsRedirect: Error fetching all shows for god user:', err);
                return [];
              });
              console.log('ShowsRedirect: All system shows for god user:', allSystemShows.length);
              if (allSystemShows.length > 0) {
                console.log('ShowsRedirect: God user found system shows, redirecting to shows list');
                navigate('/shows/list');
                return;
              }
            } catch (error) {
              console.error('ShowsRedirect: Error checking all shows for god user:', error);
            }
          }
          
          // No shows, redirect to create first show
          console.log('ShowsRedirect: No shows found, redirecting to create show');
          navigate('/shows/new');
        } else {
          // Has shows, show the actual shows list
          console.log('ShowsRedirect: Shows found, redirecting to shows list');
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

    // Only run if we have user and userProfile is loaded (or we're not waiting for it)
    if (user?.uid && (userProfile !== undefined || userProfile === null)) {
      // If user is god, just go directly to shows list
      if (userProfile?.role === 'god') {
        console.log('ShowsRedirect: God user detected, going directly to shows list');
        navigate('/shows/list');
        setLoading(false);
        return;
      }
      
      checkShows();
    }
  }, [navigate, user?.uid, userProfile, service]);

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
