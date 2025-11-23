import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  MapPin, Search, X, Plus, Trash2, Mic, MicOff, Check, AlertCircle, Info,
  ChevronDown, Copy, Wifi, WifiOff, Map, Users, Trophy, BarChart3, Bookmark,
  Bell, MapIcon, Loader2, CheckCircle, XCircle, InfoIcon, HelpCircle, Clock,
  Navigation, Play, Square, Volume2, ChevronRight, Award, User
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 transform transition-all duration-300 ease-out animate-slideUp">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light transition-all duration-200 hover:scale-110 active:scale-95"
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

const SlidePanel = ({ isOpen, onClose, title, children }) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Slide Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 bg-gradient-to-r from-teal-50 to-green-50 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
              <p className="text-xs text-gray-600">Add a new place to the map</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-all duration-200 transform hover:scale-110 active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
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

const Notification = ({ message, type = 'success', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const IconComponent = type === 'success' ? CheckCircle : type === 'error' ? XCircle : InfoIcon;

  return (
    <div className={`fixed top-20 right-4 ${bgColor} text-white px-6 py-4 shadow-2xl z-50 animate-slideUp flex items-center gap-3 min-w-[300px] max-w-md`}>
      <IconComponent className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-semibold">{message}</p>
      <button onClick={onClose} className="text-white hover:text-gray-200 transition-all duration-200">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

const Tooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs font-medium whitespace-nowrap z-50 animate-fadeIn">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

const HelpCard = ({ title, steps, onClose }) => (
  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 animate-fadeIn">
    <div className="flex items-start justify-between mb-2">
      <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
        <HelpCircle className="w-4 h-4" />
        {title}
      </h3>
      {onClose && (
        <button onClick={onClose} className="text-blue-600 hover:text-blue-800 text-lg font-bold">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
    <ol className="list-decimal list-inside space-y-1 text-xs text-blue-800">
      {steps.map((step, idx) => (
        <li key={idx}>{step}</li>
      ))}
    </ol>
  </div>
);

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
  const [landmarkToDelete, setLandmarkToDelete] = useState(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [micError, setMicError] = useState(null);
  const [clickedMapLocation, setClickedMapLocation] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [filterDistance, setFilterDistance] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const currentMarkerRef = useRef(null);

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
      setLocationError('Your device does not support location services. Please use a different device.');
      setNotification({ message: 'Your device does not support location services.', type: 'error' });
      return;
    }
    
    setIsLoadingLocation(true);
    setLocationError(null);
    setNotification({ message: 'Finding your location...', type: 'info' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLoadingLocation(false);
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentLocation(loc);
        calculateClosestLandmarks(loc.latitude, loc.longitude);
        setNotification({ message: '✓ Location found successfully!', type: 'success' });
        
        if (mapInstanceRef.current && typeof window.L !== 'undefined') {
          const L = window.L;
          const currentIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [30, 46],
            iconAnchor: [15, 46],
            popupAnchor: [1, -40],
            shadowSize: [46, 46]
          });

          if (currentMarkerRef.current) {
            currentMarkerRef.current.setLatLng([loc.latitude, loc.longitude]);
          } else {
            currentMarkerRef.current = L.marker([loc.latitude, loc.longitude], { icon: currentIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('<b style="font-family: Raleway, sans-serif; font-size: 14px;">📍 Your Current Location</b>');
          }

          mapInstanceRef.current.setView([loc.latitude, loc.longitude], 15);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
        let errorMsg = 'Unable to get your location. ';
        let solutionMsg = '';
        if (error.code === 1) {
          errorMsg += 'Please allow location access in your browser settings.';
          solutionMsg = 'Click the lock icon in your browser address bar and allow location access.';
        } else if (error.code === 2) {
          errorMsg += 'Location is unavailable. Please check your GPS.';
          solutionMsg = 'Make sure your device GPS is turned on and you are in an area with good signal.';
        } else {
          errorMsg += 'Please try again.';
          solutionMsg = 'Wait a few seconds and try clicking the "Find My Location" button again.';
        }
        setLocationError(errorMsg);
        setNotification({ message: `${errorMsg} ${solutionMsg}`, type: 'error' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
      setMicError(null);
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
      if (error.name === 'NotFoundError' || error.name === 'NotAllowedError') {
        setMicError('Microphone not found or permission denied. Please check your device settings and allow microphone access.');
      } else {
        setMicError('Unable to start recording. Please check your microphone connection and try again.');
      }
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
    const locationToUse = clickedMapLocation || currentLocation;
    if (!locationToUse || !newLandmarkName.trim()) {
      setNotification({ message: 'Please enter a name for this place.', type: 'error' });
      return;
    }
    
    const landmarkData = {
      name: newLandmarkName.trim(),
      description: newLandmarkDescription.trim(),
      latitude: locationToUse.latitude,
      longitude: locationToUse.longitude,
      voiceNote: voiceNote
    };
    
    if (isOnline) {
      const result = await saveLandmark(landmarkData);
      if (result.success) {
        setNotification({ message: `✓ "${landmarkData.name}" saved successfully!`, type: 'success' });
        setNewLandmarkName('');
        setNewLandmarkDescription('');
        setVoiceNote(null);
        setClickedMapLocation(null);
        setShowAddModal(false);
        loadLandmarks();
      } else {
        addToOfflineQueue(landmarkData);
        setNotification({ message: 'Saved offline. Will sync when connection is restored.', type: 'info' });
        setNewLandmarkName('');
        setNewLandmarkDescription('');
        setVoiceNote(null);
        setClickedMapLocation(null);
        setShowAddModal(false);
      }
    } else {
      addToOfflineQueue(landmarkData);
      setNotification({ message: `✓ "${landmarkData.name}" saved offline. Will sync when you're back online.`, type: 'info' });
      setNewLandmarkName('');
      setNewLandmarkDescription('');
      setVoiceNote(null);
      setClickedMapLocation(null);
      setShowAddModal(false);
    }
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
    setNotification({ message: `Syncing ${offlineQueue.length} place(s)...`, type: 'info' });
    const appId = getGlobalVar('__app_id', 'default-app');
    const queue = [...offlineQueue];
    const failed = [];
    let successCount = 0;
    
    for (const item of queue) {
      const result = await saveLandmark(item);
      if (result.success) {
        successCount++;
      } else {
        failed.push(item);
      }
    }
    
    setOfflineQueue(failed);
    localStorage.setItem(`offline_queue_${appId}`, JSON.stringify(failed));
    setIsSyncing(false);
    setShowSyncModal(false);
    
    if (successCount > 0) {
      setNotification({ message: `✓ Successfully synced ${successCount} place(s)!`, type: 'success' });
      loadLandmarks();
    }
    if (failed.length > 0) {
      setNotification({ message: `${failed.length} place(s) failed to sync. Will retry later.`, type: 'error' });
    }
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

  const deleteLandmark = async (landmarkId) => {
    if (!supabase) {
      console.warn('Supabase not initialized. Cannot delete landmark.');
      setNotification({ message: 'Unable to delete. Please check your connection.', type: 'error' });
      return;
    }
    
    try {
      const landmark = landmarks.find(l => l.id === landmarkId);
      const { error } = await supabase
        .from('landmarks')
        .delete()
        .eq('id', landmarkId);
      
      if (error) throw error;
      
      setNotification({ message: `✓ "${landmark?.name || 'Place'}" deleted successfully.`, type: 'success' });
      loadLandmarks();
      setLandmarkToDelete(null);
      
      if (mapInstanceRef.current && markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        updateMapMarkers(landmarks.filter(l => l.id !== landmarkId));
      }
    } catch (error) {
      console.error('Error deleting landmark:', error);
      setNotification({ message: 'Failed to delete. Please try again.', type: 'error' });
    }
  };

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

  // LEAFLET MAP INITIALIZATION WITH PROPER LOADING AND CLEANUP
  useEffect(() => {
    if (view !== 'mapper') {
      // Cleanup when not in mapper view
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        currentMarkerRef.current = null;
      }
      return;
    }

    // Wait for Leaflet to load
    let initAttempts = 0;
    const maxAttempts = 20;
    const initInterval = 100;

    const initMap = () => {
      initAttempts++;

      if (initAttempts > maxAttempts) {
        console.error('❌ Failed to initialize map: Leaflet not loaded or container not ready');
        return;
      }

      // Check if Leaflet is loaded
      if (typeof window === 'undefined' || !window.L) {
        setTimeout(initMap, initInterval);
        return;
      }

      // Check if container exists and has dimensions
      if (!mapRef.current) {
        setTimeout(initMap, initInterval);
        return;
      }

      const container = mapRef.current;
      const hasDimensions = container.offsetWidth > 0 && container.offsetHeight > 0;

      if (!hasDimensions) {
        setTimeout(initMap, initInterval);
        return;
      }

      // Check if map already exists - don't reinitialize
      if (mapInstanceRef.current) {
        // Just invalidate size if map exists
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);
        return;
      }
      
      // Double check container doesn't already have a map
      if (container._leaflet_id) {
        console.log('⚠️ Container already has a map instance, skipping initialization');
        return;
      }

        // Initialize the map
      try {
        const L = window.L;
        console.log('🗺️ Initializing map...', { width: container.offsetWidth, height: container.offsetHeight });

        // Ensure container is visible
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';

        const map = L.map(container, {
          center: [4.0511, 9.7679], // Douala, Cameroon
          zoom: 13,
          zoomControl: true,
          preferCanvas: false,
          fadeAnimation: true,
          zoomAnimation: true
        });

        // Add tile layer with error handling - try CartoDB as alternative
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          subdomains: 'abcd'
        });

        tileLayer.on('tileerror', (error, tile) => {
          console.warn('⚠️ Tile load error:', error, tile);
        });

        tileLayer.on('tileload', (e) => {
          console.log('✅ Tile loaded:', e.tile.src);
        });

        tileLayer.addTo(map);
        
        // Force tile layer to load and map to render
        setTimeout(() => {
          map.invalidateSize();
          map.setView([4.0511, 9.7679], 13, { animate: false });
          tileLayer.redraw();
          console.log('🔄 Map view set, tiles should be visible now');
        }, 200);

        // Create layer group for markers
        markersLayerRef.current = L.layerGroup().addTo(map);
        
        // Add a test marker to verify map is working
        const testIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        const testMarker = L.marker([4.0511, 9.7679], { icon: testIcon })
          .addTo(map)
          .bindPopup('<b style="font-family: Raleway, sans-serif;">Test Marker - If you see this, the map is working!</b>')
          .openPopup();
        console.log('📍 Test marker added at center');

        // Click handler for adding places
        map.on('click', (e) => {
          const clickedLoc = { latitude: e.latlng.lat, longitude: e.latlng.lng };
          setClickedMapLocation(clickedLoc);
          setCurrentLocation(clickedLoc);
          calculateClosestLandmarks(clickedLoc.latitude, clickedLoc.longitude);
          
          if (currentMarkerRef.current) {
            currentMarkerRef.current.setLatLng([clickedLoc.latitude, clickedLoc.longitude]);
          } else {
            const currentIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [30, 46],
              iconAnchor: [15, 46],
              popupAnchor: [1, -40],
              shadowSize: [46, 46]
            });
            currentMarkerRef.current = L.marker([clickedLoc.latitude, clickedLoc.longitude], { icon: currentIcon })
              .addTo(map)
              .bindPopup('<b style="font-family: Raleway, sans-serif; font-size: 14px;">📍 Selected Location</b>');
          }
          map.setView([clickedLoc.latitude, clickedLoc.longitude], 15);
          
          if (!showAddModal) {
            setShowAddModal(true);
            setNotification({ message: '📍 Location selected! Now give it a name.', type: 'info' });
          }
        });

        // Wait for map to be ready
        map.whenReady(() => {
          setTimeout(() => {
            map.invalidateSize();
            // Force a view refresh
            map.setView([4.0511, 9.7679], 13);
            
            // Ensure all Leaflet elements are visible
            const leafletContainer = container.querySelector('.leaflet-container') || container;
            if (leafletContainer) {
              leafletContainer.style.display = 'block';
              leafletContainer.style.visibility = 'visible';
              leafletContainer.style.opacity = '1';
            }
            
            // Force all tiles to be visible (but don't override transform - Leaflet needs it)
            const tiles = container.querySelectorAll('.leaflet-tile');
            tiles.forEach(tile => {
              tile.style.display = 'block';
              tile.style.visibility = 'visible';
              tile.style.opacity = '1';
            });
            
            // Check tile images - Leaflet uses img tags directly in tile containers
            const tileImages = container.querySelectorAll('img.leaflet-tile-image, .leaflet-tile img, img[src*="basemaps"], img[src*="tile"]');
            console.log('🔍 Searching for tile images...');
            console.log('Tiles found:', tiles.length);
            console.log('Tile images found:', tileImages.length);
            
            tileImages.forEach((img, idx) => {
              img.style.display = 'block';
              img.style.visibility = 'visible';
              img.style.opacity = '1';
              img.style.position = 'absolute';
              console.log(`Tile ${idx} src:`, img.src.substring(0, 50) + '...', 'loaded:', img.complete, 'naturalWidth:', img.naturalWidth);
            });
            
            // Also check all images in the container
            const allImages = container.querySelectorAll('img');
            console.log('All images in container:', allImages.length);
            allImages.forEach((img, idx) => {
              if (img.src && (img.src.includes('tile') || img.src.includes('basemaps'))) {
                img.style.display = 'block';
                img.style.visibility = 'visible';
                img.style.opacity = '1';
              }
            });
            
            console.log('✅ Map initialized successfully');
            console.log('Map center:', map.getCenter());
            console.log('Map zoom:', map.getZoom());
            console.log('Container classes:', container.className);
          }, 500);
        });

        // Also invalidate size after a longer delay to ensure tiles load and stay visible
        setTimeout(() => {
          if (mapInstanceRef.current && mapRef.current) {
            const container = mapRef.current;
            mapInstanceRef.current.invalidateSize();
            mapInstanceRef.current.setView([4.0511, 9.7679], 13, { animate: false });
            
            // Force all tile images to be visible - check multiple selectors
            const allImages = container.querySelectorAll('img');
            let tileImageCount = 0;
            allImages.forEach(img => {
              if (img.src && (img.src.includes('tile') || img.src.includes('basemaps') || img.src.includes('openstreetmap'))) {
                img.style.display = 'block';
                img.style.visibility = 'visible';
                img.style.opacity = '1';
                img.style.pointerEvents = 'auto';
                tileImageCount++;
              }
            });
            
            // Also check for tiles in Leaflet's structure
            const leafletTiles = container.querySelectorAll('.leaflet-tile-container img, .leaflet-tile-pane img');
            leafletTiles.forEach(img => {
              img.style.display = 'block';
              img.style.visibility = 'visible';
              img.style.opacity = '1';
            });
            
            // Force redraw of all layers
            mapInstanceRef.current.eachLayer((layer) => {
              if (layer.redraw) layer.redraw();
            });
            
            console.log('🔄 Map refreshed, tile images made visible:', tileImageCount, 'total images:', allImages.length);
          }
        }, 2000);

        mapInstanceRef.current = map;
      } catch (error) {
        console.error('❌ Error initializing map:', error);
        setTimeout(initMap, 500);
      }
    };

    // Start initialization
    setTimeout(initMap, 100);

    // Cleanup function
    return () => {
      // Only cleanup if view is changing away from mapper
      // Don't cleanup on every re-render
      if (view !== 'mapper' && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error in cleanup:', e);
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        currentMarkerRef.current = null;
      }
    };
  }, [view]);

  const updateMapMarkers = (landmarksData) => {
    if (!mapInstanceRef.current || !markersLayerRef.current || typeof window.L === 'undefined') return;
    const L = window.L;

    markersLayerRef.current.clearLayers();

    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [30, 46],
      iconAnchor: [15, 46],
      popupAnchor: [1, -40],
      shadowSize: [46, 46]
    });

    landmarksData.forEach((landmark) => {
      const distance = currentLocation 
        ? haversineDistance(currentLocation.latitude, currentLocation.longitude, landmark.latitude, landmark.longitude)
        : null;
      
      const marker = L.marker([landmark.latitude, landmark.longitude], { icon: redIcon })
        .addTo(markersLayerRef.current)
        .bindPopup(`
          <div style="font-family: Raleway, sans-serif; min-width: 180px;">
            <b style="font-size: 15px; color: #1f2937; display: block; margin-bottom: 6px;">${landmark.name}</b>
            ${landmark.description ? `<p style="font-size: 12px; color: #6b7280; margin: 4px 0;">${landmark.description}</p>` : ''}
            ${distance !== null ? `<p style="font-size: 11px; color: #059669; margin-top: 4px; font-weight: 600;">📍 ${distance.toFixed(1)} km away</p>` : ''}
            <button onclick="window.deleteLandmarkFromMap('${landmark.id}')" style="margin-top: 8px; padding: 6px 12px; background: #dc2626; color: white; border: none; cursor: pointer; font-size: 12px; font-weight: bold; width: 100%; font-family: Raleway, sans-serif;">Delete</button>
          </div>
        `);
      
      marker.on('click', () => {
        setSelectedLandmark(landmark);
      });
    });
  };

  useEffect(() => {
    updateMapMarkers(landmarks);
  }, [landmarks, currentLocation]);

  // Handle window resize to update map size
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current.invalidateSize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  useEffect(() => {
    window.deleteLandmarkFromMap = (id) => {
      const landmark = landmarks.find(l => l.id === id);
      if (landmark) {
        setLandmarkToDelete(landmark);
      }
    };
  }, [landmarks]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showBoundingBox, setShowBoundingBox] = useState(false);

  const filteredLandmarks = landmarks
    .map(landmark => {
      const distance = currentLocation 
        ? haversineDistance(currentLocation.latitude, currentLocation.longitude, landmark.latitude, landmark.longitude)
        : null;
      return { ...landmark, distance };
    })
    .filter(landmark => {
      const matchesSearch = landmark.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (landmark.description && landmark.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filterDistance && landmark.distance !== null) {
        return matchesSearch && landmark.distance <= filterDistance;
      }
      
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'distance' && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });

  const MapperView = () => (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Left Panel - Filters */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            <Tooltip text="Click to show or hide helpful tips">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1.5 text-gray-500 hover:text-teal-600 transition-all duration-300"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>

          {showHelp && (
            <HelpCard
              title="How to Use This App"
              steps={[
                'Click "Find My Location" to get your current position',
                'Click anywhere on the map to add a new place',
                'Give your place a simple name (e.g., "Mama Nneka\'s Shop")',
                'Optionally add a description or record a voice note',
                'Click "Save Place" to save it',
                'View nearby places in the list on the right'
              ]}
              onClose={() => setShowHelp(false)}
            />
          )}
          
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">Find My Location</label>
                <Tooltip text="This will find your exact position using GPS">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </Tooltip>
              </div>
              <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-95"
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finding...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>Find My Location</span>
                  </>
                )}
              </button>
              {locationError && (
                <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-500">
                  <p className="text-xs text-red-700 font-medium">{locationError}</p>
                </div>
              )}
            </div>

            {currentLocation && (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 animate-fadeIn">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-bold text-green-900">Location Found</p>
                </div>
                <p className="text-xs text-green-700 font-mono">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
                <p className="text-[10px] text-green-600 mt-1">You can now add places on the map</p>
              </div>
            )}

            {closestLandmarks.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Nearest Places</label>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {closestLandmarks.slice(0, 5).map((landmark, index) => (
                    <div 
                      key={landmark.id || index}
                      className="p-3 bg-gradient-to-r from-teal-50 to-green-50 border-l-4 border-teal-500 hover:bg-teal-100 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md"
                      onClick={() => {
                        if (mapInstanceRef.current && typeof window.L !== 'undefined') {
                          mapInstanceRef.current.setView([landmark.latitude, landmark.longitude], 16);
                          const marker = markersLayerRef.current?.getLayers().find(l => {
                            const latlng = l.getLatLng();
                            return Math.abs(latlng.lat - landmark.latitude) < 0.0001 && 
                                   Math.abs(latlng.lng - landmark.longitude) < 0.0001;
                          });
                          if (marker) {
                            marker.openPopup();
                          }
                        }
                        setSelectedLandmark(landmark);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900 mb-1">{landmark.name}</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-teal-600" />
                            <p className="text-xs font-semibold text-teal-700">{landmark.distance.toFixed(1)} km away</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-teal-600 bg-teal-200 px-2 py-0.5">#{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {boundingBox && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowBoundingBox(!showBoundingBox)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 hover:text-teal-600 transition-all duration-300 mb-2"
                >
                  <span>GeoJSON Bounding Box</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showBoundingBox ? 'rotate-180' : ''}`} />
                </button>
                {showBoundingBox && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200">
                    <div className="mb-2">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(JSON.stringify(boundingBox, null, 2));
                            setCopiedToClipboard(true);
                            setTimeout(() => setCopiedToClipboard(false), 2000);
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-all duration-300"
                      >
                        {copiedToClipboard ? '✓ Copied!' : 'Copy JSON'}
                      </button>
                    </div>
                    <pre className="text-[9px] text-gray-700 font-mono whitespace-pre-wrap overflow-auto max-h-32">
                      {JSON.stringify(boundingBox, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Status</span>
                <span className={`text-xs font-semibold ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              {offlineQueue.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">{offlineQueue.length} item(s) queued</p>
                  {isOnline && (
                    <button
                      onClick={() => setShowSyncModal(true)}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-1.5 px-3 transition-all duration-300"
                    >
                      Sync Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panel - Map (Expanded) */}
      <div className="flex-1 relative bg-gray-100" style={{ minHeight: '500px', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* The actual Leaflet map container */}
        <div 
          ref={mapRef} 
          id="leaflet-map-container"
          style={{ 
            height: '100%',
            width: '100%',
            position: 'relative',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            backgroundColor: '#e5e7eb'
          }}
        />

        {!mapInstanceRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100" style={{ zIndex: 10 }}>
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">Loading map...</p>
              <p className="text-xs text-gray-500 mt-1">Please wait while we load the map</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Search Results */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-5 border-b border-gray-200 sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">All Places</h2>
              <p className="text-xs text-gray-500">{filteredLandmarks.length} of {landmarks.length} places</p>
            </div>
            <Tooltip text="Sort places by different criteria">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-300 px-2 py-1.5 bg-white hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-300"
              >
                <option value="recent">Recently Added</option>
                <option value="name">Name A-Z</option>
                {currentLocation && <option value="distance">Nearest First</option>}
              </select>
            </Tooltip>
          </div>
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search places by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300 hover:border-gray-400"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          {currentLocation && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700">Filter by distance:</label>
              <select 
                value={filterDistance || ''}
                onChange={(e) => setFilterDistance(e.target.value ? parseFloat(e.target.value) : null)}
                className="text-xs border border-gray-300 px-2 py-1 bg-white hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-300"
              >
                <option value="">All distances</option>
                <option value="1">Within 1 km</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
              </select>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {filteredLandmarks.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-600 mb-1">No places found</p>
              <p className="text-xs text-gray-500 mb-4">
                {searchQuery ? 'Try a different search term' : 'Click anywhere on the map to add your first place'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    if (!currentLocation) {
                      getCurrentLocation();
                    }
                    setTimeout(() => setShowAddModal(true), 1000);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  Add Your First Place
                </button>
              )}
            </div>
          ) : (
            filteredLandmarks.map((landmark) => {
              const createdDate = new Date(landmark.created_at);
              const timeAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60));
              const timeText = timeAgo < 60 ? `${timeAgo} min ago` : 
                             timeAgo < 1440 ? `${Math.floor(timeAgo / 60)} hr ago` :
                             `${Math.floor(timeAgo / 1440)} days ago`;
              
              return (
                <div 
                  key={landmark.id}
                  className={`bg-white border-2 ${selectedLandmark?.id === landmark.id ? 'border-teal-500 shadow-lg' : 'border-gray-200'} p-4 hover:shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-95`}
                  onClick={() => {
                    if (mapInstanceRef.current && typeof window.L !== 'undefined') {
                      mapInstanceRef.current.setView([landmark.latitude, landmark.longitude], 16);
                      const marker = markersLayerRef.current?.getLayers().find(l => {
                        const latlng = l.getLatLng();
                        return Math.abs(latlng.lat - landmark.latitude) < 0.0001 && 
                               Math.abs(latlng.lng - landmark.longitude) < 0.0001;
                      });
                      if (marker) {
                        marker.openPopup();
                      }
                    }
                    setSelectedLandmark(landmark);
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-green-100 flex-shrink-0 flex items-center justify-center border-2 border-teal-200">
                      <MapPin className="w-8 h-8 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate flex-1">{landmark.name}</h3>
                        <Tooltip text="Delete this place">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLandmarkToDelete(landmark);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 transition-all duration-300 ml-2 flex-shrink-0 transform hover:scale-110 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                      {landmark.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{landmark.description}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                        {landmark.distance !== null && (
                          <span className="flex items-center gap-1 text-teal-600 font-semibold">
                            <MapPin className="w-3 h-3" />
                            {landmark.distance.toFixed(1)} km
                          </span>
                        )}
                        <span className="text-gray-400">•</span>
                        <span>{timeText}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-mono text-[10px]">{landmark.latitude.toFixed(4)}, {landmark.longitude.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                  {landmark.voice_note && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-semibold text-gray-700">Voice Note</span>
                      </div>
                      <audio controls className="w-full h-9">
                        <source src={landmark.voice_note} type="audio/webm" />
                      </audio>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const AdminView = () => {
    const totalLandmarks = agentStats.reduce((sum, stat) => sum + stat.count, 0);
    const topAgent = agentStats.length > 0 ? agentStats[0] : null;
    
    return (
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Agents</p>
                    <p className="text-2xl font-bold text-gray-900">{agentStats.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Landmarks</p>
                    <p className="text-2xl font-bold text-gray-900">{totalLandmarks}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Average per Agent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {agentStats.length > 0 ? Math.round(totalLandmarks / agentStats.length) : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performer */}
            {topAgent && (
              <div className="bg-gradient-to-r from-teal-50 to-green-50 border-2 border-teal-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                    🏆
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Top Performer</p>
                    <p className="text-sm font-bold text-gray-900">{topAgent.count} landmarks mapped</p>
                  </div>
                </div>
                <p className="text-xs font-mono text-gray-600 break-all">{topAgent.userId}</p>
              </div>
            )}

            {/* Agent Performance Table */}
            <div className="bg-white border-2 border-gray-200 shadow-sm transition-all duration-300">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Agent Performance Tracking</h2>
                <p className="text-xs text-gray-500 mt-1">Real-time tracking of all field agents and their mapped locations</p>
              </div>
              
              {agentStats.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-gray-500">No agent data available yet</p>
                  <p className="text-xs text-gray-400 mt-1">Agents will appear here once they start mapping locations</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Agent ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Landmarks Mapped
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agentStats.map((stat, index) => {
                        const percentage = totalLandmarks > 0 ? Math.round((stat.count / totalLandmarks) * 100) : 0;
                        return (
                          <tr key={stat.userId} className={`hover:bg-teal-50 transition-all duration-300 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {index === 0 && <span className="text-lg">🥇</span>}
                                {index === 1 && <span className="text-lg">🥈</span>}
                                {index === 2 && <span className="text-lg">🥉</span>}
                                <span className="text-sm font-bold text-gray-900">#{index + 1}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-mono text-gray-900 break-all max-w-md">{stat.userId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-lg font-bold text-teal-600">{stat.count}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 h-2 max-w-[100px]">
                                  <div 
                                    className="bg-teal-600 h-2 transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-semibold text-gray-600">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!supabase && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 animate-fadeIn transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-500 transition-all duration-300" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium">
                  ⚠️ Supabase not configured. Please set your Supabase credentials in the .env file or main.jsx.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <header className="bg-white border-b border-gray-200 shadow-sm transition-all duration-300 sticky top-0 z-50">
        <div className="px-8 py-4">
          <div className="flex items-center">
            {/* Left Section - Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 shadow-md flex items-center justify-center">
                <MapIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Shopora Maps</h1>
                <p className="text-xs text-gray-600 font-mono">Agent ID: {userId.substring(0, 8)}...</p>
              </div>
            </div>

            {/* Center Section - Search Bar */}
            <div className="flex-1 flex justify-center px-8">
              <div className="relative w-full max-w-lg">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all duration-300 hover:border-gray-400"
                />
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Right Section - Navigation & Actions */}
            <div className="flex items-center gap-6 flex-shrink-0">
              {/* Navigation Tabs */}
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => setView('mapper')}
                  className={`relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    view === 'mapper'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Map
                  {view === 'mapper' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 animate-fadeIn"></span>
                  )}
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={`relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    view === 'admin'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Admin
                  {view === 'admin' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 animate-fadeIn"></span>
                  )}
                </button>
              </nav>

              {/* Action Icons */}
              <div className="flex items-center gap-3">
                <button 
                  className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 group"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </button>
                
                <button 
                  className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
                  title="Bookmarks"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
                
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95">
                  U
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="transition-all duration-300">
        {view === 'mapper' ? <MapperView /> : <AdminView />}
      </main>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Floating Action Button for Quick Add */}
      {view === 'mapper' && (
        <Tooltip text="Click to add a new place at your current location">
          <button
            onClick={() => {
              if (!currentLocation) {
                getCurrentLocation();
                setTimeout(() => setShowAddModal(true), 1500);
              } else {
                setShowAddModal(true);
              }
            }}
            className="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        </Tooltip>
      )}

      <SlidePanel
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewLandmarkName('');
          setNewLandmarkDescription('');
          setVoiceNote(null);
          if (isRecording) stopRecording();
        }}
        title="Add a New Place"
      >
        <div className="p-6 space-y-6">
          <HelpCard
            title="Quick Guide"
            steps={[
              'Give your place a simple, easy-to-remember name',
              'Optionally add a description to help others find it',
              'You can record a voice note to describe the place',
              'Click "Save Place" when you\'re done'
            ]}
          />
          
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-l-4 border-blue-500 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-1">📍 Location Selected</p>
                <p className="text-xs text-blue-800 mb-2 font-mono">
                  {(clickedMapLocation || currentLocation) 
                    ? `${(clickedMapLocation || currentLocation).latitude.toFixed(6)}, ${(clickedMapLocation || currentLocation).longitude.toFixed(6)}`
                    : 'No location selected'}
                </p>
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <InfoIcon className="w-3 h-3" />
                  Click anywhere on the map to change location
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              What is this place called? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newLandmarkName}
              onChange={(e) => setNewLandmarkName(e.target.value)}
              placeholder="e.g., Mama Nneka's Shop, The Big Tree, My House"
              className="w-full border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300 hover:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1.5">Give it a simple, easy-to-remember name</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Tell us more about this place <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={newLandmarkDescription}
              onChange={(e) => setNewLandmarkDescription(e.target.value)}
              placeholder="e.g., A small shop that sells groceries, or A tall tree near the road"
              rows="4"
              className="w-full border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300 hover:border-gray-400 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Record a Voice Note <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">You can record your voice to describe this place</p>
            <div className="space-y-3">
              {!isRecording && !voiceNote && (
                <button
                  onClick={startRecording}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3.5 px-5 text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Recording</span>
                </button>
              )}
              
              {micError && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 animate-fadeIn transition-all duration-300">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{micError}</p>
                  </div>
                </div>
              )}
              
              {isRecording && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center space-x-3 p-3 bg-red-50 border-2 border-red-500 transition-all duration-300">
                    <div className="w-3 h-3 bg-red-600 animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-900">Recording... {recordingTime}s</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-3.5 px-5 text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              )}
              
              {voiceNote && !isRecording && (
                <div className="space-y-3 bg-green-50 p-4 border-2 border-green-300">
                  <p className="text-xs font-semibold text-green-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Voice Note Recorded
                  </p>
                  <audio controls className="w-full h-9">
                    <source src={voiceNote} type="audio/webm" />
                  </audio>
                  <button
                    onClick={() => {
                      setVoiceNote(null);
                      audioChunksRef.current = [];
                      setMicError(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Voice Note
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 pt-4 pb-2 -mx-6 px-6 space-y-3">
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewLandmarkName('');
                  setNewLandmarkDescription('');
                  setVoiceNote(null);
                  setClickedMapLocation(null);
                  setMicError(null);
                  if (isRecording) stopRecording();
                }}
                className="px-5 py-2.5 text-sm border-2 border-gray-300 hover:bg-gray-50 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLandmark}
                disabled={!newLandmarkName.trim() || (!currentLocation && !clickedMapLocation)}
                className="px-5 py-2.5 text-sm bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:-translate-y-0.5 active:scale-95 disabled:transform-none flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Place</span>
              </button>
            </div>
          </div>
        </div>
      </SlidePanel>

      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Sync Offline Data"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-700">
            You have <span className="font-semibold">{offlineQueue.length}</span> landmark(s) waiting to be synced.
          </p>
          {isSyncing ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-3 text-xs text-gray-700 font-medium">Syncing...</p>
            </div>
          ) : (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-1.5 text-xs border border-gray-300 hover:bg-gray-50 transition-all duration-300 font-medium transform hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={syncOfflineQueue}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95"
              >
                Sync Now
              </button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!landmarkToDelete}
        onClose={() => setLandmarkToDelete(null)}
        title="Delete Landmark"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-700">
            Are you sure you want to delete <span className="font-semibold">"{landmarkToDelete?.name}"</span>?
          </p>
          <p className="text-[10px] text-gray-500">
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={() => setLandmarkToDelete(null)}
              className="px-4 py-1.5 text-xs border border-gray-300 hover:bg-gray-50 transition-all duration-300 font-medium transform hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteLandmark(landmarkToDelete.id)}
              className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;

