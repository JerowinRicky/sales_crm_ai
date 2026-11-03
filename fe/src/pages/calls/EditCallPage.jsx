import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import CallForm from '../../components/calls/CallForm';
import { callsAPI } from '../../services/api';

export default function EditCallPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCall = async () => {
      try {
        const response = await callsAPI.getById(id);
        const payload = response?.data ?? response;
        setCall(payload?.data ?? payload);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load call');
      } finally {
        setLoading(false);
      }
    };

    loadCall();
  }, [id]);

  const handleSubmit = async data => {
    try {
      setSaving(true);
      const response = await callsAPI.update(id, data);
      const payload = response?.data ?? response;

      toast.success(payload?.message || 'Call updated successfully');
      navigate(`/calls/${id}`);
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || 'Failed to update call'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            Loading call...
          </div>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h2 className="font-semibold text-gray-800">Call not found</h2>
            <button
              type="button"
              onClick={() => navigate('/calls')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to Calls
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
            Edit Call
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Update call details
          </p>
        </div>

        <CallForm
          initialData={call}
          mode={call.call_status === 'Completed' ? 'log' : 'schedule'}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  );
}