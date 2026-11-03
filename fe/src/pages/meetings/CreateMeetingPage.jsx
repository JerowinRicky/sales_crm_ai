import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { authAPI, meetingsAPI } from '../../services/api';
import MeetingForm from '../../components/meetings/MeetingForm';

export default function CreateMeetingPage() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      const payload = response?.data ?? response;
      const user = payload?.data ?? payload;
      setCurrentUser(user);
    } catch (error) {
      console.error('Load current user error:', error);
      toast.error('Failed to load current user');
    }
  };

  const handleSubmit = async data => {
    try {
      setSaving(true);
      await meetingsAPI.create(data);
      toast.success('Meeting created successfully');
      navigate('/meetings');
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Failed to create meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Create Meeting
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule a new meeting with participants
          </p>
        </div>

        <MeetingForm
          currentUser={currentUser}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  );
}