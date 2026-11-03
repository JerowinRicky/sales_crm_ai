import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Crosshair, Search, X } from 'lucide-react';

// Uses the global `L` (Leaflet) loaded via CDN script tag in public/index.html.
// Click anywhere on the map to drop/move a marker; lat/lng are reported via onChange.
export default function MapPicker({ latitude, longitude, onChange, height = 280 }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const timerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [coordInput, setCoordInput] = useState('');

  // Keep latest onChange ref
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize map once on mount
  useEffect(() => {
    if (!window.L || !containerRef.current || mapRef.current) return;

    // Clean up any stale Leaflet id on container
    if (containerRef.current._leaflet_id) {
      delete containerRef.current._leaflet_id;
    }

    const startLat = latitude && !isNaN(Number(latitude)) ? Number(latitude) : 20.5937;
    const startLng = longitude && !isNaN(Number(longitude)) ? Number(longitude) : 78.9629;
    const zoom = latitude && longitude ? 14 : 5;

    let map = null;
    try {
      map = window.L.map(containerRef.current).setView([startLat, startLng], zoom);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
        markerRef.current = window.L.marker([startLat, startLng]).addTo(map);
        setCoordInput(`${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`);
      }

      const handleMapClick = (e) => {
        if (!e || !e.latlng) return;
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else if (mapRef.current && window.L) {
          markerRef.current = window.L.marker([lat, lng]).addTo(mapRef.current);
        }
        onChangeRef.current?.(lat, lng);
        setCoordInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      };

      map.on('click', handleMapClick);

      mapRef.current = map;
      setReady(true);

      timerRef.current = setTimeout(() => {
        if (mapRef.current && mapRef.current._container) {
          try {
            mapRef.current.invalidateSize();
          } catch (_) {}
        }
      }, 100);
    } catch (err) {
      console.warn('Map initialization failed:', err);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          console.warn('Leaflet cleanup warning:', e);
        }
        mapRef.current = null;
        markerRef.current = null;
      }
      if (containerRef.current && containerRef.current._leaflet_id) {
        delete containerRef.current._leaflet_id;
      }
    };
  }, []);

  // Sync marker when lat/lng change externally
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    
    if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      const pos = [Number(latitude), Number(longitude)];
      try {
        if (markerRef.current) {
          markerRef.current.setLatLng(pos);
        } else {
          markerRef.current = window.L.marker(pos).addTo(mapRef.current);
        }
        mapRef.current.setView(pos, 14);
        setCoordInput(`${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`);
      } catch (_) {}
    }
  }, [latitude, longitude, ready]);

  // Search for location using Nominatim with CORS proxy
  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowResults(false);
    
    try {
      // Try multiple proxy options for reliability
      const proxyUrls = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/'
      ];
      
      let data = null;
      
      // Try each proxy until one works
      for (const proxyUrl of proxyUrls) {
        try {
          const url = `${proxyUrl}https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'MapPicker App'
            }
          });
          
          if (response.ok) {
            data = await response.json();
            break;
          }
        } catch (error) {
          // Continue to next proxy
          continue;
        }
      }
      
      if (data && data.length > 0) {
        setSearchResults(data);
        setShowResults(true);
      } else {
        // Fallback: Try to detect if the query is coordinates
        const coordMatch = detectCoordinates(query);
        if (coordMatch) {
          const [lat, lng] = coordMatch;
          setSearchResults([{
            lat: lat.toString(),
            lon: lng.toString(),
            display_name: `${lat}, ${lng} (Coordinates)`
          }]);
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      
      // Fallback: Try to detect coordinates in the search query
      const coordMatch = detectCoordinates(query);
      if (coordMatch) {
        const [lat, lng] = coordMatch;
        setSearchResults([{
          lat: lat.toString(),
          lon: lng.toString(),
          display_name: `${lat}, ${lng} (Coordinates)`
        }]);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Helper function to detect coordinates in text
  const detectCoordinates = (text) => {
    // Try decimal degrees: 40.7128, -74.0060
    const match = text.match(/(-?\d{1,2}\.\d+)\s*[,，\s]+\s*(-?\d{1,3}\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }
    
    // Try to parse as two separate numbers
    const numbers = text.match(/-?\d+\.?\d*/g);
    if (numbers && numbers.length >= 2) {
      const lat = parseFloat(numbers[0]);
      const lng = parseFloat(numbers[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }
    
    return null;
  };

  // Handle search result selection
  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else if (mapRef.current && window.L) {
      markerRef.current = window.L.marker([lat, lng]).addTo(mapRef.current);
    }
    
    if (mapRef.current) {
      try {
        mapRef.current.setView([lat, lng], 14);
      } catch (_) {}
    }
    onChangeRef.current?.(lat, lng);
    setSearchQuery(result.display_name);
    setShowResults(false);
    setCoordInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  // Handle "Go to Location" button click - using onClick instead of form submit
  const handleGoToLocation = () => {
    if (!coordInput.trim()) {
      alert('Please enter coordinates');
      return;
    }
    
    // Try to detect coordinates in the input
    const coords = detectCoordinates(coordInput);
    if (coords) {
      const [lat, lng] = coords;
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else if (mapRef.current && window.L) {
        markerRef.current = window.L.marker([lat, lng]).addTo(mapRef.current);
      }
      
      if (mapRef.current) {
        try {
          mapRef.current.setView([lat, lng], 14);
        } catch (_) {}
      }
      onChangeRef.current?.(lat, lng);
      setCoordInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    // If coordinates not detected, try searching
    if (coordInput.trim().length > 2) {
      searchLocation(coordInput);
      setSearchQuery(coordInput);
    } else {
      alert('Please enter valid coordinates (e.g., 40.7128, -74.0060) or a location name');
    }
  };

  // Handle "Use my location" button click
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChangeRef.current?.(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your browser permissions.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const styles = {
    container: {
      position: 'relative'
    },
    searchContainer: {
      marginBottom: 8,
      position: 'relative'
    },
    searchRow: {
      display: 'flex',
      gap: 4,
      marginBottom: 4
    },
    searchInputWrapper: {
      flex: 1,
      position: 'relative'
    },
    searchInput: {
      width: '100%',
      padding: '6px 30px 6px 10px',
      borderRadius: '4px',
      border: '1px solid #d1d5db',
      fontSize: '13px',
      outline: 'none',
      backgroundColor: 'white'
    },
    clearButton: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      color: '#9ca3af',
      display: 'flex',
      alignItems: 'center'
    },
    searchButton: {
      padding: '6px 12px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      whiteSpace: 'nowrap'
    },
    searchButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    resultsDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      maxHeight: '200px',
      overflowY: 'auto',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      marginTop: 2
    },
    resultItem: {
      padding: '8px 12px',
      cursor: 'pointer',
      borderBottom: '1px solid #f3f4f6',
      fontSize: '13px'
    },
    resultItemHover: {
      background: '#f3f4f6'
    },
    resultName: {
      fontWeight: 500
    },
    resultCoords: {
      fontSize: '11px',
      color: '#6b7280'
    },
    coordRow: {
      display: 'flex',
      gap: 4
    },
    coordInput: {
      flex: 1,
      padding: '4px 10px',
      borderRadius: '4px',
      border: '1px solid #d1d5db',
      fontSize: '12px',
      fontFamily: 'monospace',
      outline: 'none',
      backgroundColor: 'white'
    },
    coordButton: {
      padding: '4px 12px',
      background: '#6b7280',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      whiteSpace: 'nowrap'
    },
    controlsRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    infoText: {
      fontSize: 12,
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    },
    locationButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      padding: '4px 12px',
      background: 'transparent',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '12px',
      backgroundColor: 'white'
    },
    mapContainer: {
      height,
      width: '100%',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      position: 'relative'
    },
    coordsDisplay: {
      fontSize: 11,
      color: '#9ca3af',
      marginTop: 6,
      fontFamily: 'monospace'
    },
    spinner: {
      width: 16,
      height: 16,
      border: '2px solid #e5e7eb',
      borderTop: '2px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  return (
    <div style={styles.container}>
      {/* Search and Controls */}
      <div style={styles.searchContainer}>
        {/* Search Bar */}
        <div style={styles.searchRow}>
          <div style={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="Search for a location or paste coordinates..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                if (value.length > 2) {
                  searchLocation(value);
                } else {
                  setShowResults(false);
                  setSearchResults([]);
                }
              }}
              style={styles.searchInput}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  searchLocation(searchQuery);
                }
              }}
            />
            {isSearching ? (
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                <div style={styles.spinner} />
              </div>
            ) : searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowResults(false);
                  setSearchResults([]);
                }}
                style={styles.clearButton}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => searchLocation(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              ...styles.searchButton,
              ...((isSearching || !searchQuery.trim()) ? styles.searchButtonDisabled : {})
            }}
          >
            <Search size={14} /> Search
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div style={styles.resultsDropdown}>
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => selectSearchResult(result)}
                style={{
                  ...styles.resultItem,
                  ...(index === searchResults.length - 1 ? { borderBottom: 'none' } : {})
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={styles.resultName}>{result.display_name}</div>
                <div style={styles.resultCoords}>
                  {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coordinate Input - Using div instead of form to prevent reload */}
        <div style={styles.coordRow}>
          <input
            type="text"
            placeholder="Paste coordinates (e.g., 40.7128, -74.0060)"
            value={coordInput}
            onChange={(e) => setCoordInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGoToLocation();
              }
            }}
            style={styles.coordInput}
          />
          <button
            type="button"
            onClick={handleGoToLocation}
            style={styles.coordButton}
          >
            Go to Location
          </button>
        </div>
      </div>

      {/* Map Controls Row */}
      <div style={styles.controlsRow}>
        <div style={styles.infoText}>
          <MapPin size={13} /> Click map, search, or paste coordinates
        </div>
        <button 
          type="button" 
          onClick={useMyLocation}
          style={styles.locationButton}
        >
          <Crosshair size={13} /> Use my location
        </button>
      </div>

      {/* Map Container */}
      <div ref={containerRef} style={styles.mapContainer} />

      {/* Current Coordinates Display */}
      {latitude && longitude && (
        <div style={styles.coordsDisplay}>
          📍 {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
        </div>
      )}

      {/* Add spinning animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}