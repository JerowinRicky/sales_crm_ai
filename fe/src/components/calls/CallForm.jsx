import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  authAPI,
  contactsAPI,
  callsAPI
} from '../../services/api';

const CALL_TYPES = ['Outbound', 'Inbound', 'Missed'];

const CALL_STATUSES = [
  'Completed',
  'Scheduled',
  'Overdue',
  'Cancelled'
];

const CALL_PURPOSES = [
  'Prospecting',
  'Administrative',
  'Negotiation',
  'Demo',
  'Project',
  'Desk'
];

const CALL_RESULTS = [
  'Interested',
  'Not Interested',
  'No response/Busy',
  'Requested more info',
  'Requested call back',
  'Invalid number'
];

const REMINDERS = [
  'None',
  '5 minutes before',
  '10 minutes before',
  '15 minutes before',
  '30 minutes before',
  '1 hour before'
];

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

const toDateTimeLocal = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function CallForm({
  initialData = null,
  onSubmit,
  saving = false,
  mode = 'schedule'
}) {
  const isEdit = Boolean(initialData);
  const isSchedule = mode === 'schedule';
  const isLog = mode === 'log';

  const [form, setForm] = useState({
    call_subject: isLog
      ? 'Outgoing Call to Unknown'
      : 'Call scheduled with Unknown',
    call_type: 'Outbound',
    call_status: isLog ? 'Completed' : 'Scheduled',
    start_time: '',
    duration_minutes: '00',
    duration_seconds: '00',
    call_purpose: '',
    call_result: '',
    reminder: 'None',
    call_owner_id: '',
    call_owner_name: '',
    call_to_type: 'Contact',
    call_to_id: '',
    related_to_type: 'Customer',
    related_to_id: '',
    description: ''
  });

  const [contacts, setContacts] = useState([]);
  const [relatedRecords, setRelatedRecords] = useState([]);

  /* ------------------------------------------------------------
     LOAD CURRENT USER + EDIT DATA
  ------------------------------------------------------------ */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await authAPI.getMe();
        const payload = response?.data ?? response;
        const user =
          payload?.data?.user ?? payload?.user ?? payload?.data ?? payload;

        if (isEdit) {
          setForm(prev => ({
            ...prev,
            ...initialData,
            start_time: toDateTimeLocal(initialData.start_time),
            duration_minutes: String(
              initialData.duration_minutes ?? 0
            ).padStart(2, '0'),
            duration_seconds: String(
              initialData.duration_seconds ?? 0
            ).padStart(2, '0'),
            call_owner_id: initialData.call_owner_id || user?.id || '',
            call_owner_name:
              initialData.call_owner_name ||
              user?.name ||
              user?.username ||
              ''
          }));
        } else {
          setForm(prev => ({
            ...prev,
            call_owner_id: user?.id || '',
            call_owner_name: user?.name || user?.username || '',
            call_status: isLog ? 'Completed' : 'Scheduled',
            call_subject: isLog
              ? 'Outgoing Call to Unknown'
              : 'Call scheduled with Unknown',
            start_time: toDateTimeLocal(new Date())
          }));
        }
      } catch (error) {
        console.error('Load call data error:', error);
        toast.error('Failed to load call data');
      }
    };

    loadInitialData();
  }, [initialData, isEdit, isLog]);

  /* ------------------------------------------------------------
     LOAD CONTACTS
  ------------------------------------------------------------ */
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const response = await contactsAPI.getAll();
        const payload = response?.data ?? response;
        setContacts(payload?.data ?? payload ?? []);
      } catch (error) {
        console.error('Contacts error:', error);
      }
    };
    loadContacts();
  }, []);

  /* ------------------------------------------------------------
     LOAD RELATED RECORDS
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!form.related_to_type) {
      setRelatedRecords([]);
      return;
    }

    const loadRelated = async () => {
      try {
        const type = form.related_to_type
          .toLowerCase()
          .replaceAll(' ', '-');
        const response = await callsAPI.getRelated(type);
        const payload = response?.data ?? response;
        setRelatedRecords(payload?.data ?? payload ?? []);
      } catch (error) {
        console.error('Related records error:', error);
        setRelatedRecords([]);
      }
    };

    loadRelated();
  }, [form.related_to_type]);

  /* ------------------------------------------------------------
     FIELD UPDATE
  ------------------------------------------------------------ */
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  /* ------------------------------------------------------------
     SUBMIT
  ------------------------------------------------------------ */
  const handleSubmit = e => {
    e.preventDefault();

    if (!form.call_subject.trim()) {
      toast.error('Call subject is required');
      return;
    }

    if (!form.start_time) {
      toast.error('Start time is required');
      return;
    }

    const payload = {
      ...form,

      // Schedule: no duration
      ...(isSchedule && {
        duration_minutes: 0,
        duration_seconds: 0
      }),

      // Log: numeric duration, no reminder
      ...(isLog && {
        duration_minutes: Number(form.duration_minutes || 0),
        duration_seconds: Number(form.duration_seconds || 0),
        reminder: 'None'
      })
    };

    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm"
    >
      {/* ==========================================================
          CALL INFORMATION
      =========================================================== */}
      <section className="p-6">
        <div className="grid grid-cols-[220px_1fr] gap-8">
          <SectionTitle title="Call Information" />

          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {/* CALL SUBJECT */}
            <div className="col-span-2">
              <Field label="Call Subject" required>
                <input
                  value={form.call_subject}
                  onChange={e =>
                    updateField('call_subject', e.target.value)
                  }
                  className="input"
                  placeholder="Enter call subject"
                />
              </Field>
            </div>

            {/* CALL TYPE */}
            <div className="col-span-2">
              <Field label="Call Type" required>
                <RadioGroup
                  name="call_type"
                  value={form.call_type}
                  options={CALL_TYPES}
                  onChange={value => updateField('call_type', value)}
                />
              </Field>
            </div>

            {/* CALL STATUS */}
            <div className="col-span-2">
              <Field label="Call Status" required>
                <RadioGroup
                  name="call_status"
                  value={form.call_status}
                  options={CALL_STATUSES}
                  onChange={value => updateField('call_status', value)}
                />
              </Field>
            </div>

            {/* START TIME */}
            <Field label="Start Time" required>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e =>
                  updateField('start_time', e.target.value)
                }
                className="input"
              />
            </Field>

            {/* DURATION — LOG MODE ONLY */}
            {isLog ? (
              <Field label="Duration">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={form.duration_minutes}
                    onChange={e =>
                      updateField('duration_minutes', e.target.value)
                    }
                    className="input w-24"
                    placeholder="00"
                  />
                  <span className="text-sm text-gray-500">min</span>

                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={form.duration_seconds}
                    onChange={e =>
                      updateField('duration_seconds', e.target.value)
                    }
                    className="input w-24"
                    placeholder="00"
                  />
                  <span className="text-sm text-gray-500">sec</span>
                </div>
              </Field>
            ) : (
              <div />
            )}

            {/* CALL PURPOSE */}
            <Field label="Call Purpose">
              <Select
                value={form.call_purpose}
                options={CALL_PURPOSES}
                onChange={value => updateField('call_purpose', value)}
                placeholder="Select"
              />
            </Field>

            {/* CALL RESULT */}
            <Field label="Call Result">
              <Select
                value={form.call_result}
                options={CALL_RESULTS}
                onChange={value => updateField('call_result', value)}
                placeholder="Select"
              />
            </Field>

            {/* REMINDER — SCHEDULE MODE ONLY */}
            {isSchedule && (
              <Field label="Reminder">
                <Select
                  value={form.reminder}
                  options={REMINDERS}
                  onChange={value => updateField('reminder', value)}
                />
              </Field>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-100" />

      {/* ==========================================================
          ADDITIONAL INFORMATION
      =========================================================== */}
      <section className="p-6">
        <div className="grid grid-cols-[220px_1fr] gap-8">
          <SectionTitle title="Additional Information" />

          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {/* CALL OWNER */}
            <Field label="Call Owner" required>
              <input
                type="text"
                value={form.call_owner_name || ''}
                readOnly
                className="input bg-gray-50 cursor-not-allowed"
                placeholder="Loading..."
              />
            </Field>

            {/* CALL TO */}
            <Field label="Call To">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <input
                  value="Contact"
                  readOnly
                  className="input bg-gray-50 text-gray-600"
                />
                <select
                  value={form.call_to_id}
                  onChange={e =>
                    updateField('call_to_id', e.target.value)
                  }
                  className="input"
                >
                  <option value="">Select contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.contact_name ||
                        contact.name ||
                        contact.full_name ||
                        contact.company_name ||
                        `Contact #${contact.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            {/* RELATED TO */}
            <Field label="Related To">
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <select
                  value={form.related_to_type}
                  onChange={e => {
                    updateField('related_to_type', e.target.value);
                    updateField('related_to_id', '');
                  }}
                  className="input"
                >
                  {RELATED_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={form.related_to_id}
                  onChange={e =>
                    updateField('related_to_id', e.target.value)
                  }
                  className="input"
                >
                  <option value="">Select</option>
                  {relatedRecords.map(record => (
                    <option key={record.id} value={record.id}>
                      {record.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            {/* DESCRIPTION */}
            <div className="col-span-2">
              <Field label="Description">
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={e =>
                    updateField('description', e.target.value)
                  }
                  className="input resize-none"
                  placeholder="Enter call description"
                />
              </Field>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          FOOTER
      =========================================================== */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------
   SECTION TITLE
------------------------------------------------------------ */
function SectionTitle({ title }) {
  return (
    <div className="flex items-start gap-2">
      <ChevronDown size={17} className="mt-0.5 text-gray-500" />
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

/* ------------------------------------------------------------
   FIELD
------------------------------------------------------------ */
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------
   SELECT
------------------------------------------------------------ */
function Select({ value, options, onChange, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="input"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------
   RADIO GROUP
------------------------------------------------------------ */
function RadioGroup({ name, value, options, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {options.map(option => (
        <label
          key={option}
          className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {option}
        </label>
      ))}
    </div>
  );
}