import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { meetingsAPI } from '../../services/api';
import MeetingForm from '../../components/meetings/MeetingForm';

export default function EditMeetingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadMeeting = async () => {
      try {
        setLoading(true);
        const response = await meetingsAPI.getById(id);
        const payload = response?.data ?? response;
        const data = payload?.data ?? payload;
        setMeeting(data);
      } catch (error) {
        console.error(error);
        toast.error(error?.message || 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    loadMeeting();
  }, [id]);

  const handleSubmit = async data => {
    try {
      setSaving(true);
      await meetingsAPI.update(id, data);
      toast.success('Meeting updated successfully');
      navigate(`/meetings/${id}`);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Failed to update meeting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            Loading meeting...
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h2 className="font-semibold text-gray-800">Meeting not found</h2>
            <button
              type="button"
              onClick={() => navigate('/meetings')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to Meetings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Edit Meeting
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Update meeting details and participants
          </p>
        </div>

        <MeetingForm
          initialData={meeting}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  );
}