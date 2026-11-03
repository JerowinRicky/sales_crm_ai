import React, {
    useEffect,
    useState
  } from 'react';
  
  import {
    useNavigate,
    useParams
  } from 'react-router-dom';
  
  import toast from 'react-hot-toast';
  
  import {
    tasksAPI
  } from '../../services/api';
  
  import TaskForm from '../../components/tasks/TaskForm';
  
  export default function EditTaskPage() {
  
    const { id } = useParams();
  
    const navigate = useNavigate();
  
    const [task, setTask] =
      useState(null);
  
    const [loading, setLoading] =
      useState(true);
  
    const [saving, setSaving] =
      useState(false);
  
  
    const loadTask = async () => {
  
      try {
  
        setLoading(true);
  
        const res =
          await tasksAPI.getById(id);
  
        setTask(
          res?.data || null
        );
  
      } catch (error) {
  
        console.error(error);
  
        toast.error(
          error.message ||
          'Failed to load task'
        );
  
        navigate('/tasks');
  
      } finally {
  
        setLoading(false);
  
      }
  
    };
  
  
    useEffect(() => {
  
      loadTask();
  
    }, [id]);
  
  
    const handleSubmit = async data => {
  
      try {
  
        setSaving(true);
  
        await tasksAPI.update(
          id,
          data
        );
  
        toast.success(
          'Task updated successfully'
        );
  
        navigate(`/tasks/${id}`);
  
      } catch (error) {
  
        console.error(error);
  
        toast.error(
          error.message ||
          'Failed to update task'
        );
  
      } finally {
  
        setSaving(false);
  
      }
  
    };
  
  
    if (loading) {
  
      return (
        <div className="p-6">
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500">
            Loading task...
          </div>
        </div>
      );
  
    }
  
  
    if (!task) {
      return null;
    }
  
  
    return (
      <div className="min-h-screen bg-gray-50">
  
        <div className="px-6 py-4">
  
          <h1 className="text-xl font-semibold text-gray-900">
            Edit Task
          </h1>
  
        </div>
  
  
        <div className="max-w-6xl mx-auto px-6 pb-10">
  
          <TaskForm
            initialData={task}
            onSubmit={handleSubmit}
            saving={saving}
          />
  
        </div>
  
      </div>
    );
  }