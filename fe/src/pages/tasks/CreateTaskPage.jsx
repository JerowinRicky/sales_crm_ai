import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { tasksAPI } from '../../services/api';
import TaskForm from '../../components/tasks/TaskForm';

export default function CreateTaskPage() {

  const navigate = useNavigate();

  const [saving, setSaving] =
    useState(false);

  const handleSubmit = async data => {

    try {

      setSaving(true);

      await tasksAPI.create(data);

      toast.success(
        'Task created successfully'
      );

      navigate('/tasks');

    } catch (error) {

      console.error(error);

      toast.error(
        error.message ||
        'Failed to create task'
      );

    } finally {

      setSaving(false);

    }

  };


  return (
    <div className="min-h-screen bg-gray-50">

      <div className="px-6 py-4">

        <h1 className="text-xl font-semibold text-gray-900">
          Create Task
        </h1>

      </div>


      <div className="max-w-6xl mx-auto px-6 pb-10">

        <TaskForm
          onSubmit={handleSubmit}
          saving={saving}
        />

      </div>

    </div>
  );
}