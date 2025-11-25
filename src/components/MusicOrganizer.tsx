import { useState, useEffect } from 'react';
import { SpotifyAPI } from '@/lib/spotify-api';
import type { CollectionInfo } from '@/types/spotify';
import { LoadingScreen } from './LoadingScreen';
import { MainApp } from './MainApp';

interface MusicOrganizerProps {
  accessToken: string;
}

export function MusicOrganizer({ accessToken }: MusicOrganizerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const api = new SpotifyAPI(accessToken);
      
      // Get user profile
      setLoadingMessage('Getting your profile...');
      const user = await api.getCurrentUser();
      setUserId(user.id);
      setLoadingProgress(10);

      // Get collection info from localStorage
      const storedInfo = localStorage.getItem('collection_info');
      if (!storedInfo) {
        throw new Error('No collection information found');
      }
      
      const info: CollectionInfo = JSON.parse(storedInfo);
      setCollectionInfo(info);
      setLoadingProgress(20);

      // Start loading music based on collection type
      setLoadingMessage('Loading your music...');
      await loadMusic(api, info, user.id);

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize app');
    }
  };

  const loadMusic = async (
    api: SpotifyAPI,
    info: CollectionInfo,
    userId: string
  ) => {
    // This will be implemented with the actual music loading logic
    // For now, just simulate loading
    setLoadingProgress(50);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoadingProgress(100);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-slate-300">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingScreen
        progress={loadingProgress}
        message={loadingMessage}
        collectionType={collectionInfo?.type || 'saved'}
      />
    );
  }

  return (
    <MainApp
      accessToken={accessToken}
      userId={userId!}
      collectionInfo={collectionInfo!}
    />
  );
}

