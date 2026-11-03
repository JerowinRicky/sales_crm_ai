import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  authAPI,
  tasksAPI,
  contactsAPI
} from '../../services/api';

const RELATED_TYPES = [
  'Customer',
  'Lead',
  'Product',
  'Campaign',
  'Quote',
  'Sales Order',
  'Invoice',
  'Contract'
];

const STATUSES = [
  'Not Started',
  'Deferred',
  'In Progress',
  'Completed',
  'Waiting for Input'
];

const PRIORITIES = ['Low', 'Medium', 'High'];

const emptyForm = {
  task_subject: '',
  due_date: '',
  completed_date: '',
  task_status: 'Not Started',
  reminder: false,
  priority: 'High',
  task_owner_id: '',
  task_to_type: 'Contact',
  task_to_id: '',
  related_to_type: '',
  related_to_id: '',
  description: ''
};

export default function TaskForm({
  initialData = null,
  onSubmit,
  saving = false
}) {
  const [form, setForm] = useState(initialData || emptyForm);
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [relatedRecords, setRelatedRecords] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const isEdit = Boolean(initialData?.id);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await authAPI.getMe();
        const user = res?.user || res?.data || res;
        setCurrentUser(user);

        if (!isEdit && user?.id) {
          setForm(prev => ({ ...prev, task_owner_id: user.id }));
        }
      } catch (error) {
        console.error('Failed to load current user', error);
      }
    };
    loadUser();
  }, [isEdit]);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await contactsAPI.getAll();
        setContacts(res?.data || []);
      } catch (error) {
        console.error('Failed to load contacts', error);
      }
    };
    loadContacts();
  }, []);

  useEffect(() => {
    if (initialData?.related_to_type) {
      loadRelatedRecords(initialData.related_to_type);
    }
  }, [initialData?.related_to_type]);

  const loadRelatedRecords = async type => {
    if (!type) {
      setRelatedRecords([]);
      return;
    }

    try {
      setLoadingRelated(true);
      const apiType = type.toLowerCase().replaceAll(' ', '-');
      const res = await tasksAPI.getRelated(apiType);
      setRelatedRecords(res?.data || []);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to load ${type} records`);
    } finally {
      setLoadingRelated(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRelatedType = async type => {
    setForm(prev => ({
      ...prev,
      related_to_type: type,
      related_to_id: ''
    }));
    setRelatedRecords([]);
    await loadRelatedRecords(type);
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (!form.task_subject.trim()) {
      toast.error('Task subject is required');
      return;
    }
    if (!form.due_date) {
      toast.error('Due date is required');
      return;
    }
    if (!form.task_owner_id) {
      toast.error('Task owner is required');
      return;
    }

    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border shadow-sm"
    >
      {/* TASK INFORMATION */}
      <section className="p-6">
        <div className="flex items-start">
          <div className="w-72 flex items-center gap-2">
            <ChevronDown size={17} />
            <h2 className="font-semibold text-gray-900">
              Task Information
            </h2>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Subject
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.task_subject}
                onChange={e =>
                  updateField('task_subject', e.target.value)
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-md outline-none focus:border-blue-500"
                placeholder="Enter task subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => updateField('due_date', e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completed Date
              </label>
              <input
                type="date"
                value={form.completed_date || ''}
                onChange={e =>
                  updateField('completed_date', e.target.value)
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Status
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={form.task_status}
                onChange={e =>
                  updateField('task_status', e.target.value)
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white"
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder
              </label>
              <input
                type="checkbox"
                checked={Boolean(form.reminder)}
                onChange={e =>
                  updateField('reminder', e.target.checked)
                }
                className="w-4 h-4 mt-2"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* ADDITIONAL INFORMATION */}
      <section className="p-6">
        <div className="flex items-start">
          <div className="w-72 flex items-center gap-2">
            <ChevronDown size={17} />
            <h2 className="font-semibold text-gray-900">
              Additional Information
            </h2>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={e =>
                  updateField('priority', e.target.value)
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Owner
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={currentUser?.name || ''}
                readOnly
                className="w-full h-10 px-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task To
              </label>
              <div className="flex gap-2">
                <select
                  value={form.task_to_type}
                  onChange={e =>
                    updateField('task_to_type', e.target.value)
                  }
                  className="w-36 h-10 px-3 border border-gray-300 rounded-md bg-white"
                >
                  <option value="Contact">Contact</option>
                </select>

                <select
                  value={form.task_to_id || ''}
                  onChange={e =>
                    updateField('task_to_id', e.target.value)
                  }
                  className="flex-1 h-10 px-3 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Select Contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.contact_person ||
                        contact.name ||
                        contact.full_name ||
                        contact.email ||
                        `Contact #${contact.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related To
              </label>
              <div className="flex gap-2">
                <select
                  value={form.related_to_type}
                  onChange={e => handleRelatedType(e.target.value)}
                  className="w-36 h-10 px-3 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Select</option>
                  {RELATED_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={form.related_to_id || ''}
                  disabled={!form.related_to_type || loadingRelated}
                  onChange={e =>
                    updateField('related_to_id', e.target.value)
                  }
                  className="flex-1 h-10 px-3 border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingRelated
                      ? 'Loading...'
                      : form.related_to_type
                        ? `Select ${form.related_to_type}`
                        : 'Select record'}
                  </option>
                  {relatedRecords.map(record => (
                    <option key={record.id} value={record.id}>
                      {record.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={5}
                value={form.description || ''}
                onChange={e =>
                  updateField('description', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                placeholder="Enter description"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 px-6 pb-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
}