import React, { useEffect, useState, useRef } from 'react';

import { useNavigate, useParams } from 'react-router-dom';



import {

  ArrowLeft,

  Edit,

  MoreHorizontal,

  CheckCircle2,

  Users,

  CalendarDays,

  MapPin,

  Video,

  Clock,

  Copy,

  Trash2

} from 'lucide-react';



import toast from 'react-hot-toast';

import { format } from 'date-fns';



import { meetingsAPI } from '../../services/api';

import ConfirmModal from '../../components/common/ConfirmModal';



const statusClasses = {

  'Not Started': 'bg-gray-100 text-gray-700',

  Deferred: 'bg-orange-50 text-orange-700',

  'In Progress': 'bg-blue-100 text-blue-700',

  Completed: 'bg-emerald-100 text-emerald-700',
  Visited: 'bg-purple-100 text-purple-700',

  'Waiting For Input': 'bg-yellow-100 text-yellow-700'

};



const parseLocalDate = value => {

  if (!value) return null;

  const clean = typeof value === 'string' ? value.replace(/\.\d{3}Z$|Z$/, '') : value;

  const d = new Date(clean);

  return Number.isNaN(d.getTime()) ? null : d;

};



const formatDate = (value, pattern = 'EEE, dd-MMM-yyyy hh:mm a') => {

  if (!value) return '-';

  try {

    const d = parseLocalDate(value);

    if (!d) return value;

    return format(d, pattern);

  } catch {

    return value;

  }

};



export default function MeetingDetailsPage() {

  const { id } = useParams();

  const navigate = useNavigate();



  const [meeting, setMeeting] = useState(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [showMenu, setShowMenu] = useState(false);



  const [confirmDelete, setConfirmDelete] = useState(false);

  const [deleting, setDeleting] = useState(false);



  const [cloning, setCloning] = useState(false);

  const menuRef = useRef(null);



  useEffect(() => {

    function handleClickOutside(event) {

      if (menuRef.current && !menuRef.current.contains(event.target)) {

        setShowMenu(false);

      }

    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);



  const loadMeeting = async () => {

    try {

      setLoading(true);

      const response = await meetingsAPI.getById(id);

      const payload = response?.data ?? response;

      const data = payload?.data ?? payload;

      setMeeting(data || null);

    } catch (error) {

      console.error('Load meeting error:', error);

      toast.error(error?.message || 'Failed to load meeting');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    loadMeeting();

  }, [id]);



  const handleMarkCompleted = async () => {

    if (!meeting) return;



    try {

      setSaving(true);

      await meetingsAPI.update(id, {

        meeting_subject: meeting.meeting_subject,

        from_date: meeting.from_date,

        to_date: meeting.to_date,

        meeting_status: 'Completed',

        customer_type: meeting.customer_type,

        meeting_type: meeting.meeting_type,

        location: meeting.location || null,

        meeting_venue: meeting.meeting_venue || null,

        participants_reminder: meeting.participants_reminder || 'None',

        all_day: meeting.all_day ? 1 : 0,

        meeting_to_type: meeting.meeting_to_type || 'Contact',

        meeting_to_id: meeting.meeting_to_id || null,

        related_to_type: meeting.related_to_type || null,

        related_to_id: meeting.related_to_id || null,

        description: meeting.description || null,

        participants: (meeting.participants || []).map(participant => ({

          participant_type: participant.participant_type,

          participant_id: participant.participant_id

        }))

      });



      toast.success('Meeting marked as completed');

      await loadMeeting();

    } catch (error) {

      console.error(error);

      toast.error(error?.message || 'Failed to complete meeting');

    } finally {

      setSaving(false);

    }

  };



  const handleClone = async () => {

    setShowMenu(false);

    if (!meeting) return;



    try {

      setCloning(true);

      const response = await meetingsAPI.clone(id);

      const payload = response?.data ?? response;

      const data = payload?.data ?? payload;

      toast.success('Meeting cloned successfully');

      const newId = data?.id;

      if (newId) {

        navigate(`/meetings/${newId}`);

      }

    } catch (error) {

      console.error('Clone meeting error:', error);

      try {

        const createPayload = {

          meeting_subject: `${meeting.meeting_subject || 'Meeting'}_copy`,

          from_date: meeting.from_date,

          to_date: meeting.to_date,

          meeting_status: meeting.meeting_status || 'Not Started',

          customer_type: meeting.customer_type || 'New',

          meeting_type: meeting.meeting_type || 'In Person',

          location: meeting.location || null,

          meeting_venue: meeting.meeting_venue || null,

          participants_reminder: meeting.participants_reminder || 'None',

          reminder: meeting.reminder || 'None',

          all_day: meeting.all_day ? 1 : 0,

          meeting_owner_id: meeting.meeting_owner_id || null,

          meeting_to_type: meeting.meeting_to_type || 'Contact',

          meeting_to_id: meeting.meeting_to_id || null,

          related_to_type: meeting.related_to_type || null,

          related_to_id: meeting.related_to_id || null,

          description: meeting.description || null,

          participants: (meeting.participants || []).map(p => ({

            participant_type: p.participant_type,

            participant_id: p.participant_id

          }))

        };

        const fbRes = await meetingsAPI.create(createPayload);

        const fbPayload = fbRes?.data ?? fbRes;

        const fbData = fbPayload?.data ?? fbPayload;

        toast.success('Meeting cloned successfully');

        const newId = fbData?.id || fbData?.meetingId;

        if (newId) {

          navigate(`/meetings/${newId}`);

        } else {

          navigate('/meetings');

        }

      } catch (fbErr) {

        toast.error(error?.message || fbErr?.message || 'Failed to clone meeting');

      }

    } finally {

      setCloning(false);

    }

  };



  const handleDelete = () => {

    setShowMenu(false);

    setConfirmDelete(true);

  };



  const confirmDeleteMeeting = async () => {

    try {

      setDeleting(true);

      await meetingsAPI.remove(id);

      toast.success('Meeting deleted successfully');

      navigate('/meetings');

    } catch (error) {

      console.error(error);

      toast.error(error?.message || 'Failed to delete meeting');

    } finally {

      setDeleting(false);

    }

  };



  const closeConfirmDelete = () => {

    if (deleting) return;

    setConfirmDelete(false);

  };



  if (loading) {

    return (

      <div className="min-h-screen  p-6">

        <div className="max-w-[1400px] mx-auto">

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

        <div className="max-w-[1400px] mx-auto">

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



  const statusClass =

    statusClasses[meeting.meeting_status] || 'bg-gray-100 text-gray-700';



  return (

    <div className="min-h-screen  text-[#334155]">

      {/* DELETE MODAL */}

      <ConfirmModal

        isOpen={confirmDelete}

        title="Delete Meeting"

        message={`Are you sure you want to delete "${meeting.meeting_subject}"? This action cannot be undone.`}

        confirmText="Delete"

        cancelText="Cancel"

        variant="danger"

        onConfirm={confirmDeleteMeeting}

        onCancel={closeConfirmDelete}

        loading={deleting}

      />



      {/* HEADER */}

      <div className=" border-b border-gray-200">

        <div className="max-w-[1400px] mx-auto px-6 py-4">

          <div className="flex items-start justify-between">

            {/* LEFT */}

            <div className="flex items-start gap-4">

              <button

                type="button"

                onClick={() => navigate('/meetings')}

                className="mt-1 p-1 text-gray-600 hover:text-gray-900"

              >

                <ArrowLeft size={21} />

              </button>



              <div>

                <div className="flex items-center gap-3">

                  <h1 className="text-[20px] font-semibold text-[#111827]">

                    {meeting.meeting_subject}

                  </h1>

                  <span

                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}

                  >

                    {meeting.meeting_status}

                  </span>

                </div>



                <div className="flex items-center gap-2 mt-2 text-sm text-[#718096]">

                  <span>Meeting</span>

                  <span>·</span>

                  <span>Owned by {meeting.meeting_owner_name || '--'}</span>

                </div>

              </div>

            </div>



            {/* RIGHT */}

            <div className="flex items-center gap-2">

              {meeting.meeting_status !== 'Completed' && (

                <button

                  type="button"

                  disabled={saving}

                  onClick={handleMarkCompleted}

                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"

                >

                  <CheckCircle2 size={16} />

                  {saving ? 'Updating...' : 'Mark as Completed'}

                </button>

              )}



              <button

                type="button"

                onClick={() => navigate(`/meetings/${id}/edit`)}

                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"

              >

                <Edit size={16} />

                Edit

              </button>



              <div className="relative" ref={menuRef}>

                <button

                  type="button"

                  onClick={() => setShowMenu(!showMenu)}

                  className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"

                  title="More options"

                >

                  <MoreHorizontal size={18} />

                </button>



                {showMenu && (

                  <div className="absolute right-0 top-11 z-50 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">

                    <button

                      type="button"

                      disabled={cloning}

                      onClick={handleClone}

                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"

                    >

                      <Copy size={15} className="text-gray-500" />

                      {cloning ? 'Cloning...' : 'Clone'}

                    </button>

                    <button

                      type="button"

                      onClick={handleDelete}

                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"

                    >

                      <Trash2 size={15} className="text-red-500" />

                      Delete

                    </button>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      </div>



      {/* MAIN CONTENT */}

      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-[1fr_350px] gap-4">

        {/* LEFT */}

        <div className="space-y-4">

          {/* MEETING OVERVIEW */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-4 border-b border-gray-100">

              <h2 className="text-base font-semibold text-gray-900">

                Meeting Overview

              </h2>

            </div>



            <div className="px-6 py-5">

              <div className="grid grid-cols-2 gap-x-12 gap-y-5">

                <DetailRow

                  label="Meeting Status"

                  value={

                    <span

                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}

                    >

                      {meeting.meeting_status}

                    </span>

                  }

                />

                <DetailRow

                  label="Meeting Type"

                  value={meeting.meeting_type || '-'}

                />

                <DetailRow

                  label="From Date"

                  value={formatDate(meeting.from_date)}

                />

                <DetailRow

                  label="To Date"

                  value={formatDate(meeting.to_date)}

                />

                <DetailRow

                  label="Customer Type"

                  value={meeting.customer_type || '-'}

                />

                <DetailRow

                  label="Meeting Owner"

                  value={meeting.meeting_owner_name || '-'}

                />

                <DetailRow

                  label="Meeting To"

                  value={meeting.meeting_to_name || '-'}

                />

                <DetailRow

                  label="Related To"

                  value={meeting.related_name || '-'}

                />

              </div>

            </div>

          </section>



          {/* MEETING INFORMATION */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-4 border-b border-gray-100">

              <h2 className="text-base font-semibold text-gray-900">

                Meeting Information

              </h2>

            </div>



            <div className="px-6 py-5">

              <div className="grid grid-cols-2 gap-x-12 gap-y-6">

                <DetailRow

                  label="Meeting Subject"

                  value={meeting.meeting_subject || '-'}

                />

                <DetailRow

                  label="Meeting Venue"

                  value={meeting.meeting_venue || '-'}

                />

                <DetailRow label="Location" value={meeting.location || '-'} />

                <DetailRow

                  label="All Day"

                  value={meeting.all_day ? 'Yes' : 'No'}

                />

                <DetailRow

                  label="Participants Reminder"

                  value={meeting.participants_reminder || 'None'}

                />

                <DetailRow

                  label="Created By"

                  value={

                    meeting.created_by_name ||

                    meeting.meeting_owner_name ||

                    '-'

                  }

                />

                <DetailRow

                  label="Created Time"

                  value={formatDate(meeting.created_at)}

                />

                <DetailRow

                  label="Modified By"

                  value={

                    meeting.modified_by_name ||

                    meeting.meeting_owner_name ||

                    '-'

                  }

                />

                <DetailRow

                  label="Modified Time"

                  value={formatDate(meeting.updated_at)}

                />

              </div>

            </div>

          </section>



          {/* ADDITIONAL INFORMATION */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-4 border-b border-gray-100">

              <h2 className="text-base font-semibold text-gray-900">

                Additional Information

              </h2>

            </div>



            <div className="px-6 py-5">

              <div className="grid grid-cols-2 gap-x-12 gap-y-6">

                <DetailRow

                  label="Meeting Owner"

                  value={meeting.meeting_owner_name || '-'}

                />

                <DetailRow

                  label="Meeting To"

                  value={meeting.meeting_to_name || '-'}

                />

                <DetailRow

                  label="Related To"

                  value={meeting.related_name || '-'}

                />

                <DetailRow

                  label="Related Type"

                  value={meeting.related_to_type || '-'}

                />



                <div className="col-span-2">

                  <div className="text-sm text-gray-500 mb-1">

                    Description

                  </div>

                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-4 min-h-[70px]">

                    {meeting.description || '-'}

                  </div>

                </div>

              </div>

            </div>

          </section>



          {/* PARTICIPANTS */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Users size={18} className="text-gray-500" />

                <h2 className="text-base font-semibold text-gray-900">

                  Participants

                </h2>

              </div>

              <span className="text-xs text-gray-500">

                {meeting.participants?.length || 0}{' '}

                participant{meeting.participants?.length === 1 ? '' : 's'}

              </span>

            </div>



            <div className="px-6 py-4">

              {!meeting.participants || meeting.participants.length === 0 ? (

                <div className="py-6 text-center text-sm text-gray-500">

                  No participants added.

                </div>

              ) : (

                <div className="grid grid-cols-2 gap-3">

                  {meeting.participants.map(participant => (

                    <div

                      key={participant.id}

                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"

                    >

                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-semibold">

                        {(participant.participant_name || 'P')

                          .charAt(0)

                          .toUpperCase()}

                      </div>



                      <div className="min-w-0">

                        <div className="text-sm font-medium text-gray-800 truncate">

                          {participant.participant_name || '--'}

                        </div>

                        <div className="text-xs text-gray-500 truncate">

                          {participant.participant_email ||

                            participant.participant_type}

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </section>

        </div>



        {/* RIGHT SIDEBAR */}

        <div className="space-y-4">

          {/* QUICK INFO */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-5 py-4 border-b border-gray-100">

              <h2 className="text-base font-semibold text-gray-900">

                Meeting Summary

              </h2>

            </div>



            <div className="p-5 space-y-5">

              <SideInfo

                icon={<CalendarDays size={17} />}

                label="From"

                value={formatDate(meeting.from_date)}

              />

              <SideInfo

                icon={<Clock size={17} />}

                label="To"

                value={formatDate(meeting.to_date)}

              />

              <SideInfo

                icon={

                  meeting.meeting_type === 'Online' ? (

                    <Video size={17} />

                  ) : (

                    <MapPin size={17} />

                  )

                }

                label="Meeting Type"

                value={meeting.meeting_type || '-'}

              />

              <SideInfo

                icon={<MapPin size={17} />}

                label="Location"

                value={meeting.location || meeting.meeting_venue || '-'}

              />

            </div>

          </section>



          {/* REMINDER */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-5 py-4 border-b border-gray-100">

              <h2 className="text-base font-semibold text-gray-900">

                Reminder

              </h2>

            </div>

            <div className="p-5">

              <div className="text-sm text-gray-700">

                {meeting.reminder || 'None'}

              </div>

            </div>

          </section>



          {/* RELATED */}

          <section className="bg-white border border-gray-200 rounded-xl">

            <div className="px-5 py-4 border-b border-gray-100">

              <h2 className="text-base font-semibold text-gray-900">

                Related Record

              </h2>

            </div>

            <div className="p-5">

              <div className="text-xs text-gray-500 mb-1">

                {meeting.related_to_type || 'Related To'}

              </div>

              <div className="text-sm font-medium text-gray-800">

                {meeting.related_name || '-'}

              </div>

            </div>

          </section>

        </div>

      </div>

    </div>

  );

}



function DetailRow({ label, value }) {

  return (

    <div className="grid grid-cols-[165px_1fr] items-start gap-4">

      <div className="text-sm text-[#64748b]">{label}</div>

      <div className="text-sm text-[#334155] font-medium break-words">

        {value}

      </div>

    </div>

  );

}



function SideInfo({ icon, label, value }) {

  return (

    <div className="flex items-start gap-3">

      <div className="mt-0.5 text-gray-400">{icon}</div>

      <div className="min-w-0">

        <div className="text-xs text-gray-500 mb-1">{label}</div>

        <div className="text-sm font-medium text-gray-800 break-words">

          {value}

        </div>

      </div>

    </div>

  );

}