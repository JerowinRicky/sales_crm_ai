import React, { useState, useEffect, useCallback } from 'react';
import { masterAPI } from '../../services/api';

// Cascading State → City selects backed by master_states / master_cities
// Props:
//   state, city            - current values (strings)
//   onStateChange(val)     - called with state name string
//   onCityChange(val)      - called with city name string
//   required               - bool
export default function CityStateSelect({ state, city, onStateChange, onCityChange, required = false }) {
  const [states, setStates]   = useState([]);
  const [cities, setCities]   = useState([]);
  const [stateId, setStateId] = useState('');

  // Load states once
  useEffect(() => {
    masterAPI.getStates()
      .then(r => setStates(r.data || []))
      .catch(() => {});
  }, []);

  // When states load, resolve the stateId matching the current state name
  useEffect(() => {
    if (!states.length || !state) return;
    const found = states.find(s => s.name === state);
    if (found) setStateId(String(found.id));
    else setStateId('');
  }, [states, state]);

  // Load cities when stateId changes
  useEffect(() => {
    if (!stateId) { setCities([]); return; }
    masterAPI.getCities({ state_id: stateId })
      .then(r => setCities(r.data || []))
      .catch(() => {});
  }, [stateId]);

  const handleStateChange = e => {
    const id = e.target.value;
    setStateId(id);
    const found = states.find(s => String(s.id) === id);
    onStateChange(found ? found.name : '');
    onCityChange(''); // reset city on state change
  };

  const handleCityChange = e => {
    onCityChange(e.target.value);
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      <div className="form-group" style={{ margin:0 }}>
        <label>State{required ? ' *' : ''}</label>
        <select value={stateId} onChange={handleStateChange} required={required}>
          <option value="">— Select State —</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="form-group" style={{ margin:0 }}>
        <label>City{required ? ' *' : ''}</label>
        {cities.length > 0 ? (
          <select value={city || ''} onChange={handleCityChange} required={required}>
            <option value="">— Select City —</option>
            {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        ) : (
          // Fallback free-text if no cities seeded for this state
          <input
            value={city || ''}
            onChange={e => onCityChange(e.target.value)}
            placeholder={stateId ? 'Enter city name' : 'Select state first'}
            disabled={!stateId}
          />
        )}
      </div>
    </div>
  );
}
