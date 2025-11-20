import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const getGlobalVar = (name, defaultValue = '') => {
  if (typeof window !== 'undefined' && window[name]) {
    return window[name];
  }
  return defaultValue;
};

let supabase = null;

const initializeSupabase = () => {
  if (supabase) return supabase;
  
  try {
    const supabaseUrl = getGlobalVar('__supabase_url');
    const supabaseKey = getGlobalVar('__supabase_anon_key');
    
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase initialized successfully');
      return supabase;
    } else {
      console.warn('⚠️ Supabase credentials not configured. Some features will not work.');
      return null;
    }
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return null;
  }
};

const getUserId = () => {
  try {
    const authToken = getGlobalVar('__initial_auth_token');
    if (authToken) {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      return payload.sub || payload.user_id || payload.id || crypto.randomUUID();
    }
    return crypto.randomUUID();
  } catch (error) {
    return crypto.randomUUID();
  }
};

const userId = getUserId();

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const generateBoundingBox = (landmarks) => {
  if (!landmarks || landmarks.length === 0) return null;
  
  const lats = landmarks.map(l => l.latitude);
  const lngs = landmarks.map(l => l.longitude);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  return {
    type: "Polygon",
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]]
  };
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

const registerServiceWorker = () => {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service Worker registration failed:', err);
    });
  } else if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister().catch(() => {});
        });
      });
    }
  }
};

const App = () => {
  const [view, setView] = useState('mapper');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [closestLandmarks, setClosestLandmarks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [agentStats, setAgentStats] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLandmarkName, setNewLandmarkName] = useState('');
  const [newLandmarkDescription, setNewLandmarkDescription] = useState('');
  const [voiceNote, setVoiceNote] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [boundingBox, setBoundingBox] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      initializeSupabase();
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!supabase) return;
      
      try {
        const authToken = getGlobalVar('__initial_auth_token');
        if (authToken) {
          const { error } = await supabase.auth.setSession({
            access_token: authToken,
            refresh_token: ''
          });
          if (error) console.error('Auth error:', error);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };
    
    initializeAuth();
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        setShowSyncModal(true);
      }
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue.length]);

  useEffect(() => {
    const appId = getGlobalVar('__app_id', 'default-app');
    const stored = localStorage.getItem(`offline_queue_${appId}`);
    if (stored) {
      try {
        setOfflineQueue(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading offline queue:', error);
      }
    }
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        calculateClosestLandmarks(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocationError(`Error getting location: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const calculateClosestLandmarks = (lat, lng) => {
    if (landmarks.length === 0) {
      setClosestLandmarks([]);
      return;
    }
    
    const distances = landmarks.map(landmark => ({
      ...landmark,
      distance: haversineDistance(lat, lng, landmark.latitude, landmark.longitude)
    }));
    
    distances.sort((a, b) => a.distance - b.distance);
    setClosestLandmarks(distances.slice(0, 5));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNote(reader.result);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const saveLandmark = async (landmarkData) => {
    if (!supabase) {
      console.warn('Supabase not initialized. Cannot save landmark.');
      return { success: false, error: 'Supabase not configured' };
    }
    
    try {
      const appId = getGlobalVar('__app_id', 'default-app');
      const { data, error } = await supabase
        .from('landmarks')
        .insert([{
          app_id: appId,
          user_id: userId,
          name: landmarkData.name,
          description: landmarkData.description || '',
          latitude: landmarkData.latitude,
          longitude: landmarkData.longitude,
          voice_note: landmarkData.voiceNote || null,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving landmark:', error);
      return { success: false, error };
    }
  };

  const handleAddLandmark = async () => {
    if (!currentLocation || !newLandmarkName.trim()) {
      return;
    }
    
    const landmarkData = {
      name: newLandmarkName.trim(),
      description: newLandmarkDescription.trim(),
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      voiceNote: voiceNote
    };
    
    if (isOnline) {
      const result = await saveLandmark(landmarkData);
      if (!result.success) {
        // If save fails, add to offline queue
        addToOfflineQueue(landmarkData);
      }
    } else {
      addToOfflineQueue(landmarkData);
    }
    
    // Reset form
    setNewLandmarkName('');
    setNewLandmarkDescription('');
    setVoiceNote(null);
    setShowAddModal(false);
  };

  const addToOfflineQueue = (landmarkData) => {
    const appId = getGlobalVar('__app_id', 'default-app');
    const queue = [...offlineQueue, { ...landmarkData, id: Date.now() }];
    setOfflineQueue(queue);
    localStorage.setItem(`offline_queue_${appId}`, JSON.stringify(queue));
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isOnline || !supabase) return;
    
    setIsSyncing(true);
    const appId = getGlobalVar('__app_id', 'default-app');
    const queue = [...offlineQueue];
    const failed = [];
    
    for (const item of queue) {
      const result = await saveLandmark(item);
      if (!result.success) {
        failed.push(item);
      }
    }
    
    setOfflineQueue(failed);
    localStorage.setItem(`offline_queue_${appId}`, JSON.stringify(failed));
    setIsSyncing(false);
    setShowSyncModal(false);
  };

  useEffect(() => {
    if (!supabase) return;
    
    const appId = getGlobalVar('__app_id', 'default-app');
    const channel = supabase
      .channel('landmarks-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'landmarks',
          filter: `app_id=eq.${appId}`
        },
        () => {
          loadLandmarks();
        }
      )
      .subscribe();
    
    loadLandmarks();
    
    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadLandmarks = async () => {
    if (!supabase) {
      console.warn('Supabase not initialized. Cannot load landmarks.');
      return;
    }
    
    try {
      const appId = getGlobalVar('__app_id', 'default-app');
      const { data, error } = await supabase
        .from('landmarks')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setLandmarks(data || []);
      
      if (data && data.length > 0) {
        setBoundingBox(generateBoundingBox(data));
      }
      
      if (currentLocation) {
        calculateClosestLandmarks(currentLocation.latitude, currentLocation.longitude);
      }
    } catch (error) {
      console.error('Error loading landmarks:', error);
    }
  };

  const loadAgentStats = async () => {
    if (!supabase) {
      console.warn('Supabase not initialized. Cannot load agent stats.');
      return;
    }
    
    try {
      const appId = getGlobalVar('__app_id', 'default-app');
      const { data, error } = await supabase
        .from('landmarks')
        .select('user_id')
        .eq('app_id', appId);
      
      if (error) throw error;
      
      const statsMap = {};
      data.forEach(landmark => {
        statsMap[landmark.user_id] = (statsMap[landmark.user_id] || 0) + 1;
      });
      
      const stats = Object.entries(statsMap).map(([userId, count]) => ({
        userId,
        count
      })).sort((a, b) => b.count - a.count);
      
      setAgentStats(stats);
    } catch (error) {
      console.error('Error loading agent stats:', error);
    }
  };

  useEffect(() => {
    if (view !== 'admin' || !supabase) return;
    
    const appId = getGlobalVar('__app_id', 'default-app');
    const channel = supabase
      .channel('agent-stats-channel')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'landmarks',
          filter: `app_id=eq.${appId}`
        },
        () => {
          loadAgentStats();
        }
      )
      .subscribe();
    
    loadAgentStats();
    
    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [view]);

  const MapperView = () => (
    <div className="p-4 md:p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">User ID</p>
        <p className="font-mono text-base font-bold text-gray-900 break-all">{userId}</p>
      </div>

      <div className="bg-white shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-5 text-gray-900 border-b border-gray-200 pb-3">Current Location</h2>
        <button
          onClick={getCurrentLocation}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-1.5 px-4 text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          Get My Location
        </button>
        
        {locationError && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800">
            <p className="font-medium">{locationError}</p>
          </div>
        )}
        
        {currentLocation && (
          <div className="mt-5 p-5 bg-gray-50 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Latitude</p>
                <p className="font-mono text-base font-bold text-gray-900">{currentLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Longitude</p>
                <p className="font-mono text-base font-bold text-gray-900">{currentLocation.longitude.toFixed(6)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-5 border-b border-gray-200 pb-3">
          <h2 className="text-2xl font-bold text-gray-900">Add New Landmark</h2>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!currentLocation}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-4 text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
          >
            Add Landmark
          </button>
        </div>
        <p className="text-gray-600 text-sm">
          {!currentLocation ? 'Get your location first to add a landmark' : 'Click the button to add a new landmark at your current location'}
        </p>
      </div>

      <div className="bg-white shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-5 text-gray-900 border-b border-gray-200 pb-3">Closest Landmarks</h2>
        {!currentLocation ? (
          <p className="text-gray-500 py-4">Get your location to see the closest landmarks</p>
        ) : closestLandmarks.length === 0 ? (
          <p className="text-gray-500 py-4">No landmarks found</p>
        ) : (
          <div className="space-y-3">
            {closestLandmarks.map((landmark, index) => (
              <div key={landmark.id || index} className="border border-gray-200 p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{landmark.name}</h3>
                    {landmark.description && (
                      <p className="text-gray-600 text-sm mt-1">{landmark.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2 font-mono">
                      Lat: {landmark.latitude.toFixed(6)}, Lng: {landmark.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-bold text-blue-600 text-lg">{landmark.distance.toFixed(2)} km</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-5 text-gray-900 border-b border-gray-200 pb-3">All Landmarks ({landmarks.length})</h2>
        {landmarks.length === 0 ? (
          <p className="text-gray-500 py-4">No landmarks added yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {landmarks.map((landmark) => (
              <div key={landmark.id} className="border border-gray-200 p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md">
                <h3 className="font-semibold text-lg text-gray-900">{landmark.name}</h3>
                {landmark.description && (
                  <p className="text-gray-600 text-sm mt-1">{landmark.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  Lat: {landmark.latitude.toFixed(6)}, Lng: {landmark.longitude.toFixed(6)}
                </p>
                {landmark.voice_note && (
                  <div className="mt-3">
                    <audio controls className="w-full max-w-md">
                      <source src={landmark.voice_note} type="audio/webm" />
                    </audio>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {boundingBox && (
        <div className="bg-white shadow-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-5 text-gray-900 border-b border-gray-200 pb-3">GeoJSON Bounding Box</h2>
          <pre className="bg-gray-50 p-4 border border-gray-200 overflow-x-auto text-xs font-mono">
            {JSON.stringify(boundingBox, null, 2)}
          </pre>
        </div>
      )}

      <div className={`p-5 border-l-4 shadow-md ${isOnline ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-semibold text-sm uppercase tracking-wide ${isOnline ? 'text-green-800' : 'text-yellow-800'}`}>
              Status: {isOnline ? 'Online' : 'Offline'}
            </p>
            {offlineQueue.length > 0 && (
              <p className="text-sm text-gray-700 mt-1">
                {offlineQueue.length} landmark(s) queued for sync
              </p>
            )}
          </div>
          {offlineQueue.length > 0 && isOnline && (
            <button
              onClick={() => setShowSyncModal(true)}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-1.5 px-4 text-sm transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const AdminView = () => (
    <div className="p-4 md:p-6">
      <div className="bg-white shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b border-gray-200 pb-3">Agent Performance Tracking</h2>
        
        {agentStats.length === 0 ? (
          <p className="text-gray-500 py-4">No agent data available</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    User ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Landmarks Mapped
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agentStats.map((stat, index) => (
                  <tr key={stat.userId} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100">
                      <div className="text-sm font-mono text-gray-900 break-all">{stat.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100">
                      <div className="text-sm font-bold text-gray-900">{stat.count}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 shadow-sm">
          <p className="text-sm text-gray-700">Total Agents: <span className="font-bold text-gray-900">{agentStats.length}</span></p>
          <p className="text-sm text-gray-700 mt-2">Total Landmarks: <span className="font-bold text-gray-900">{agentStats.reduce((sum, stat) => sum + stat.count, 0)}</span></p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {!supabase && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  ⚠️ Supabase not configured. Please set your Supabase credentials in the .env file or main.jsx.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Shopora Maps</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => setView('mapper')}
                className={`px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  view === 'mapper'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Mapper View
              </button>
              <button
                onClick={() => setView('admin')}
                className={`px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  view === 'admin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Admin Panel
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {view === 'mapper' ? <MapperView /> : <AdminView />}
      </main>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewLandmarkName('');
          setNewLandmarkDescription('');
          setVoiceNote(null);
          if (isRecording) stopRecording();
        }}
        title="Add New Landmark"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Landmark Name *
            </label>
            <input
              type="text"
              value={newLandmarkName}
              onChange={(e) => setNewLandmarkName(e.target.value)}
              placeholder="e.g., Mama Nneka's Kiosk"
              className="w-full border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={newLandmarkDescription}
              onChange={(e) => setNewLandmarkDescription(e.target.value)}
              placeholder="Add a description..."
              rows="3"
              className="w-full border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Note (Optional)
            </label>
            <div className="space-y-2">
              {!isRecording && !voiceNote && (
                <button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-1.5 px-4 text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Start Recording
                </button>
              )}
              
              {isRecording && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-red-50 border-l-4 border-red-500">
                    <div className="w-3 h-3 bg-red-600 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Recording... {recordingTime}s</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-semibold py-1.5 px-4 text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Stop Recording
                  </button>
                </div>
              )}
              
              {voiceNote && !isRecording && (
                <div className="space-y-2">
                  <audio controls className="w-full">
                    <source src={voiceNote} type="audio/webm" />
                  </audio>
                  <button
                    onClick={() => {
                      setVoiceNote(null);
                      audioChunksRef.current = [];
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove Voice Note
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {currentLocation && (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 border border-gray-200">
              Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={() => {
                setShowAddModal(false);
                setNewLandmarkName('');
                setNewLandmarkDescription('');
                setVoiceNote(null);
                if (isRecording) stopRecording();
              }}
              className="px-4 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLandmark}
              disabled={!newLandmarkName.trim() || !currentLocation}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
            >
              Save Landmark
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Sync Offline Data"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            You have <span className="font-semibold">{offlineQueue.length}</span> landmark(s) waiting to be synced.
          </p>
          {isSyncing ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-3 text-gray-700 font-medium">Syncing...</p>
            </div>
          ) : (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={syncOfflineQueue}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Sync Now
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;

