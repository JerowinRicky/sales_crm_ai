import React, { useEffect, useState } from 'react';

import { ChevronDown, Search, X } from 'lucide-react';

import toast from 'react-hot-toast';



import {

  authAPI,

  contactsAPI,

  meetingsAPI

} from '../../services/api';



const MEETING_STATUSES = [

  'Not Started',

  'Deferred',

  'In Progress',

  'Completed',
  'Visited',

  'Waiting For Input'

];



const CUSTOMER_TYPES = ['New', 'Existing'];



const MEETING_TYPES = ['In Person', 'Online'];



const REMINDERS = [

  'None',

  'At time of meeting',

  '5 mins before',

  '10 mins before',

  '15 mins before',

  '30 mins before',

  '1 hour before',

  '2 hour before',

  '1 day before',

  '2 day before'

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



const MEETING_VENUES = ['Client location', 'Office', 'Online', 'Other'];



const PARTICIPANT_TYPES = ['Contacts', 'Users', 'Groups', 'Databases'];



const toDateTimeLocal = value => {

  if (!value) return '';

  const clean = typeof value === 'string' ? value.replace(/\.\d{3}Z$|Z$/, '') : value;

  const date = new Date(clean);

  if (Number.isNaN(date.getTime())) return '';

  const pad = n => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(

    date.getDate()

  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

};



export default function MeetingForm({

  initialData = null,

  onSubmit,

  saving = false

}) {

  const isEdit = Boolean(initialData);



  const [form, setForm] = useState({

    meeting_subject: '',

    from_date: '',

    to_date: '',

    meeting_status: 'Not Started',

    customer_type: 'New',

    meeting_type: 'In Person',

    location: '',

    meeting_venue: 'Client location',

    participants_reminder: 'None',

    reminder: 'None',

    all_day: false,



    meeting_owner_id: '',

    meeting_owner_name: '',



    meeting_to_type: 'Contact',

    meeting_to_id: '',



    related_to_type: 'Customer',

    related_to_id: '',



    description: ''

  });



  const [relatedRecords, setRelatedRecords] = useState([]);

  const [contacts, setContacts] = useState([]);

  const [participants, setParticipants] = useState([]);

  const [showParticipantModal, setShowParticipantModal] = useState(false);

  const [participantType, setParticipantType] = useState('Contacts');

  const [participantSearch, setParticipantSearch] = useState('');

  const [participantResults, setParticipantResults] = useState([]);

  const [selectedParticipants, setSelectedParticipants] = useState([]);



  /* ------------------------------------------------------------

     LOAD CURRENT USER

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

            from_date: toDateTimeLocal(initialData.from_date),

            to_date: toDateTimeLocal(initialData.to_date),

            meeting_owner_id:

              initialData.meeting_owner_id || user?.id || '',

            meeting_owner_name:

              initialData.meeting_owner_name ||

              user?.name ||

              user?.username ||

              ''

          }));

        } else {

          setForm(prev => ({

            ...prev,

            meeting_owner_id: user?.id || '',

            meeting_owner_name: user?.name || user?.username || ''

          }));

        }

      } catch (error) {

        console.error('Failed to load current user:', error);

        toast.error('Failed to load meeting owner');

      }

    };



    loadInitialData();

  }, [initialData, isEdit]);



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

        const type = form.related_to_type.toLowerCase().replaceAll(' ', '-');

        const response = await meetingsAPI.getRelated(type);

        const payload = response?.data ?? response;

        setRelatedRecords(payload?.data ?? payload ?? []);

      } catch (error) {

        console.error(error);

        setRelatedRecords([]);

      }

    };



    loadRelated();

  }, [form.related_to_type]);



  /* ------------------------------------------------------------

     LOAD EXISTING PARTICIPANTS WHEN EDITING

  ------------------------------------------------------------ */

  useEffect(() => {

    if (!initialData?.participants) return;

    setSelectedParticipants(initialData.participants);

  }, [initialData]);



  /* ------------------------------------------------------------

     FIELD UPDATE

  ------------------------------------------------------------ */

  const updateField = (field, value) => {

    setForm(prev => ({ ...prev, [field]: value }));

  };



  /* ------------------------------------------------------------

     PARTICIPANT MODAL LOGIC

  ------------------------------------------------------------ */

  const openParticipantModal = () => {

    setShowParticipantModal(true);

    loadParticipantRecords(participantType, participantSearch);

  };



  const loadParticipantRecords = async (type, search) => {

    try {

      const response = await meetingsAPI.getParticipants({ type, search });

      const payload = response?.data ?? response;

      setParticipantResults(payload?.data ?? payload ?? []);

    } catch (error) {

      console.error(error);

      toast.error('Failed to load participants');

    }

  };



  const handleParticipantType = type => {

    setParticipantType(type);

    loadParticipantRecords(type, participantSearch);

  };



  const handleParticipantSearch = value => {

    setParticipantSearch(value);

    loadParticipantRecords(participantType, value);

  };



  const normalizeType = type => type.replace(/s$/, '');



  const isSelected = person => {

    const normalizedType = normalizeType(participantType);

    return selectedParticipants.some(

      item =>

        item.participant_type === normalizedType &&

        item.participant_id === person.id

    );

  };



  const toggleParticipant = person => {

    const normalizedType = normalizeType(participantType);

    const exists = isSelected(person);



    if (exists) {

      setSelectedParticipants(prev =>

        prev.filter(

          item =>

            !(

              item.participant_type === normalizedType &&

              item.participant_id === person.id

            )

        )

      );

    } else {

      setSelectedParticipants(prev => [

        ...prev,

        {

          participant_type: normalizedType,

          participant_id: person.id,

          participant_name: person.name,

          participant_email: person.email

        }

      ]);

    }

  };



  const removeParticipant = index => {

    setSelectedParticipants(prev => prev.filter((_, i) => i !== index));

  };



  /* ------------------------------------------------------------

     SUBMIT

  ------------------------------------------------------------ */

  const handleSubmit = e => {

    e.preventDefault();



    if (!form.meeting_subject.trim()) {

      toast.error('Meeting subject is required');

      return;

    }



    if (!form.from_date || !form.to_date) {

      toast.error('From date and To date are required');

      return;

    }



    const payload = {

      ...form,

      participants: selectedParticipants.map(participant => ({

        participant_type: participant.participant_type,

        participant_id: participant.participant_id

      }))

    };



    onSubmit(payload);

  };



  return (

    <form

      onSubmit={handleSubmit}

      className="bg-white rounded-xl border border-gray-200 shadow-sm"

    >

      {/* ==========================================================

          MEETING INFORMATION

      =========================================================== */}

      <section className="p-6">

        <div className="grid grid-cols-[190px_1fr] gap-8">

          <div className="flex items-start gap-2">

            <ChevronDown size={16} className="mt-1 text-gray-500" />

            <h2 className="text-sm font-semibold text-gray-900">

              Meeting Information

            </h2>

          </div>



          <div className="grid grid-cols-2 gap-x-8 gap-y-5">

            <Field label="Meeting Subject" required>

              <input

                value={form.meeting_subject}

                onChange={e =>

                  updateField('meeting_subject', e.target.value)

                }

                className="input"

                placeholder="New Meeting"

              />

            </Field>



            <Field label="Meeting Status" required>

              <Select

                value={form.meeting_status}

                options={MEETING_STATUSES}

                onChange={value => updateField('meeting_status', value)}

              />

            </Field>



            <Field label="From Date" required>

              <input

                type="datetime-local"

                value={form.from_date}

                onChange={e => updateField('from_date', e.target.value)}

                className="input"

              />

            </Field>



            <Field label="To Date" required>

              <input

                type="datetime-local"

                value={form.to_date}

                onChange={e => updateField('to_date', e.target.value)}

                className="input"

              />

            </Field>



            <Field label="Customer Type" required>

              <Select

                value={form.customer_type}

                options={CUSTOMER_TYPES}

                onChange={value => updateField('customer_type', value)}

              />

            </Field>



            <Field label="Meeting Type" required>

              <Select

                value={form.meeting_type}

                options={MEETING_TYPES}

                onChange={value => updateField('meeting_type', value)}

              />

            </Field>



            <Field label="Meeting Venue">

              <Select

                value={form.meeting_venue}

                options={MEETING_VENUES}

                onChange={value => updateField('meeting_venue', value)}

              />

            </Field>



            <Field label="Location">

              <input

                value={form.location}

                onChange={e => updateField('location', e.target.value)}

                className="input"

                placeholder="Enter location"

              />

            </Field>



            <Field label="Participants Reminder">

              <Select

                value={form.participants_reminder}

                options={REMINDERS}

                onChange={value =>

                  updateField('participants_reminder', value)

                }

              />

            </Field>



            <Field label="All Day">

              <label className="inline-flex items-center gap-2 h-10 cursor-pointer">

                <input

                  type="checkbox"

                  checked={form.all_day}

                  onChange={e =>

                    updateField('all_day', e.target.checked)

                  }

                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"

                />

                <span className="text-sm text-gray-700">

                  {form.all_day ? 'Yes' : 'No'}

                </span>

              </label>

            </Field>



            {/* PARTICIPANTS — full width row */}

            <div className="col-span-2">

              <Field label="Participants">

                <div className="flex flex-wrap items-center gap-2">

                  {selectedParticipants.length === 0 ? (

                    <span className="text-sm text-gray-500">

                      No participants added

                    </span>

                  ) : (

                    selectedParticipants.map((p, index) => (

                      <span

                        key={`${p.participant_type}-${p.participant_id}-${index}`}

                        className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"

                      >

                        {p.participant_name ||

                          `${p.participant_type} #${p.participant_id}`}

                        <button

                          type="button"

                          onClick={() => removeParticipant(index)}

                          className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-blue-100"

                        >

                          <X size={12} />

                        </button>

                      </span>

                    ))

                  )}



                  <button

                    type="button"

                    onClick={openParticipantModal}

                    className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50"

                  >

                    + Add

                  </button>

                </div>

              </Field>

            </div>

          </div>

        </div>

      </section>



      <div className="border-t border-gray-100" />



      {/* ==========================================================

          ADDITIONAL INFORMATION

      =========================================================== */}

      <section className="p-6">

        <div className="grid grid-cols-[190px_1fr] gap-8">

          <div className="flex items-start gap-2">

            <ChevronDown size={16} className="mt-1 text-gray-500" />

            <h2 className="text-sm font-semibold text-gray-900">

              Additional Information

            </h2>

          </div>



          <div className="grid grid-cols-2 gap-x-8 gap-y-5">

            {/* OWNER */}

            <Field label="Meeting Owner" required>

              <input

                type="text"

                value={form.meeting_owner_name || ''}

                readOnly

                className="input bg-gray-50 text-gray-700 cursor-not-allowed"

                placeholder="Loading..."

              />

            </Field>



            {/* MEETING TO */}

            <Field label="Meeting To">

              <div className="grid grid-cols-[110px_1fr] gap-2">

                <input

                  value="Contact"

                  readOnly

                  className="input bg-gray-50 text-gray-600"

                />

                <select

                  value={form.meeting_to_id}

                  onChange={e =>

                    updateField('meeting_to_id', e.target.value)

                  }

                  className="input"

                >

                  <option value="">Select contact</option>

                  {contacts.map(contact => (

                    <option key={contact.id} value={contact.id}>

                      {contact.contact_name ||

                        contact.name ||

                        contact.full_name ||

                        contact.email ||

                        `Contact #${contact.id}`}

                    </option>

                  ))}

                </select>

              </div>

            </Field>



            {/* RELATED */}

            <Field label="Related To">

              <div className="grid grid-cols-[110px_1fr] gap-2">

                <select

                  value={form.related_to_type}

                  onChange={e => {

                    updateField('related_to_type', e.target.value);

                    updateField('related_to_id', '');

                  }}

                  className="input"

                >

                  <option value="">Select</option>

                  {RELATED_TYPES.map(type => (

                    <option key={type} value={type}>

                      {type}

                    </option>

                  ))}

                </select>



                <select

                  value={form.related_to_id}

                  disabled={!form.related_to_type}

                  onChange={e =>

                    updateField('related_to_id', e.target.value)

                  }

                  className="input disabled:bg-gray-100"

                >

                  <option value="">

                    {form.related_to_type

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

            </Field>



            {/* REMINDER */}

            <Field label="Reminder">

              <Select

                value={form.reminder}

                options={REMINDERS}

                onChange={value => updateField('reminder', value)}

              />

            </Field>



            {/* DESCRIPTION — full width */}

            <div className="col-span-2">

              <Field label="Description">

                <textarea

                  rows={5}

                  value={form.description}

                  onChange={e =>

                    updateField('description', e.target.value)

                  }

                  className="input resize-none"

                  placeholder="Enter meeting description"

                />

              </Field>

            </div>

          </div>

        </div>

      </section>



      {/* FOOTER */}

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

          className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"

        >

          {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}

        </button>

      </div>



      {/* ==========================================================

          PARTICIPANT MODAL

      =========================================================== */}

      {showParticipantModal && (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">

            {/* MODAL HEADER */}

            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">

              <h2 className="text-lg font-semibold text-gray-900">

                Add Participants

              </h2>

              <button

                type="button"

                onClick={() => setShowParticipantModal(false)}

                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"

              >

                <X size={18} />

              </button>

            </div>



            {/* SEARCH BAR */}

            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">

              <select

                value={participantType}

                onChange={e => handleParticipantType(e.target.value)}

                className="input w-40"

              >

                {PARTICIPANT_TYPES.map(type => (

                  <option key={type} value={type}>

                    {type}

                  </option>

                ))}

              </select>



              <div className="relative flex-1">

                <Search

                  size={17}

                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"

                />

                <input

                  value={participantSearch}

                  onChange={e =>

                    handleParticipantSearch(e.target.value)

                  }

                  placeholder="Search..."

                  className="input pl-9"

                />

              </div>

            </div>



            {/* RESULTS */}

            <div className="flex-1 overflow-y-auto">

              {participantResults.length === 0 ? (

                <div className="p-10 text-center text-gray-500 text-sm">

                  No participants found

                </div>

              ) : (

                participantResults.map(person => (

                  <label

                    key={person.id}

                    className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"

                  >

                    <input

                      type="checkbox"

                      checked={isSelected(person)}

                      onChange={() => toggleParticipant(person)}

                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"

                    />



                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">

                      {(person.name || 'P').charAt(0).toUpperCase()}

                    </div>



                    <div className="min-w-0">

                      <div className="text-sm font-medium text-gray-800 truncate">

                        {person.name}

                      </div>

                      {person.email && (

                        <div className="text-xs text-gray-500 truncate">

                          {person.email}

                        </div>

                      )}

                    </div>

                  </label>

                ))

              )}

            </div>



            {/* FOOTER */}

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">

              <span className="text-sm text-gray-500">

                {selectedParticipants.length} selected

              </span>

              <button

                type="button"

                onClick={() => setShowParticipantModal(false)}

                className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"

              >

                Done

              </button>

            </div>

          </div>

        </div>

      )}

    </form>

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

function Select({ value, options, onChange }) {

  return (

    <select

      value={value}

      onChange={e => onChange(e.target.value)}

      className="input"

    >

      {options.map(option => (

        <option key={option} value={option}>

          {option}

        </option>

      ))}

    </select>

  );

}