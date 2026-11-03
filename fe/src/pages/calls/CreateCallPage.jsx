import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import CallForm from '../../components/calls/CallForm';
import { callsAPI } from '../../services/api';

export default function CreateCallPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [saving, setSaving] = useState(false);

  const callMode =
    mode || (location.pathname.includes('/calls/log') ? 'log' : 'schedule');

  const handleSubmit = async data => {
    try {
      setSaving(true);
      const response = await callsAPI.create(data);
      const payload = response?.data ?? response;

      toast.success(payload?.message || 'Call created successfully');

      // Try to get the ID from different response shapes
      const newId = payload?.data?.id ?? payload?.id;
      if (newId) {
        navigate(`/calls/${newId}`);
      } else {
        navigate('/calls');
      }
    } catch (error) {
      console.error('Create call error:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to create call'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {callMode === 'log' ? 'Log a Call' : 'Schedule a Call'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {callMode === 'log'
              ? 'Record details of a call that already happened'
              : 'Plan a call for the future'}
          </p>
        </div>

        <CallForm mode={callMode} onSubmit={handleSubmit} saving={saving} />
      </div>
    </div>
  );
}