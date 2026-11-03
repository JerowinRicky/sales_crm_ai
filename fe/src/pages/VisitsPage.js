import React, { useState, useEffect } from 'react';
import { visitsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Compass,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import ExportButtons from '../components/common/ExportButtons';

function CoordLink({ lat, lng, label, color }) {
  if (!lat && !lng) return <span className="text-gray-300 text-xs">—</span>;
  const la = Number(lat), ln = Number(lng);
  return (
    <a
      href={`https://maps.google.com/?q=${la},${ln}`}
      target="_blank"
      rel="noreferrer"
      title={`Open ${label} location in Google Maps`}
      className="inline-flex items-center gap-1 text-xs font-mono whitespace-nowrap hover:underline"
      style={{ color: color || '#2563eb' }}
    >
      <MapPin size={12} />
      {la.toFixed(5)}, {ln.toFixed(5)}
      <ExternalLink size={10} className="opacity-60" />
    </a>
  );
}

function DistanceBadge({ meters, withinGeofence }) {
  if (meters == null) return <span className="text-gray-300 text-xs">—</span>;
  const ok = withinGeofence;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {meters}m {ok ? '✓' : '⚠'}
    </span>
  );
}

export default function VisitsPage() {
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const { isManager } = useAuth();

  useEffect(() => {
    load();
  }, [page, dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await visitsAPI.getHistory(params);
      setVisits(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast.error('Failed to load visits');
    }
    setLoading(false);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Visit History</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} visit sessions recorded
          </p>
        </div>
        <ExportButtons data={visits} filename="visits" title="Visit History" />
      </div>

      {/* Date Filters */}
      <div className="bg-white border rounded-lg p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-[42px] px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-[42px] px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-[42px] px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1"
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500">Loading visit history...</div>
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Compass size={42} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">
              No visits found
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Field visits will appear here once recorded
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {isManager && (
                      <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                        Salesperson
                      </th>
                    )}
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Customer
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      City
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Check-In Time
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Check-In Location
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Distance (In)
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Check-Out Time
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Check-Out Location
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Distance (Out)
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Duration
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Purpose
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visits.map((v) => {
                    const duration = v.duration_minutes
                      ? `${v.duration_minutes} min`
                      : v.check_out_time
                      ? `${differenceInMinutes(
                          new Date(v.check_out_time),
                          new Date(v.check_in_time)
                        )} min`
                      : null;

                    return (
                      <tr key={v.id} className="hover:bg-gray-50">
                        {isManager && (
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">
                            {v.user_name}
                          </td>
                        )}

                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900 text-sm">
                            {v.company_name}
                          </div>
                          {v.contact_person && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {v.contact_person}
                            </div>
                          )}
                          {v.customer_lat != null && (
                            <div className="mt-1">
                              <CoordLink
                                lat={v.customer_lat}
                                lng={v.customer_lng}
                                label="registered site"
                                color="#64748B"
                              />
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {v.city || '—'}
                        </td>

                        <td className="px-5 py-4 text-xs">
                          <div className="font-medium text-gray-900">
                            {format(new Date(v.check_in_time), 'MMM d, yyyy')}
                          </div>
                          <div className="font-semibold text-emerald-600">
                            {format(new Date(v.check_in_time), 'HH:mm:ss')}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <CoordLink
                            lat={v.check_in_lat}
                            lng={v.check_in_lng}
                            label="check-in"
                            color="#10B981"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <DistanceBadge
                            meters={v.distance_meters}
                            withinGeofence={v.within_geofence}
                          />
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {v.check_out_time ? (
                            <>
                              <div className="font-medium text-gray-900">
                                {format(
                                  new Date(v.check_out_time),
                                  'MMM d, yyyy'
                                )}
                              </div>
                              <div className="font-semibold text-red-500">
                                {format(
                                  new Date(v.check_out_time),
                                  'HH:mm:ss'
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {v.check_out_time ? (
                            <CoordLink
                              lat={v.check_out_lat}
                              lng={v.check_out_lng}
                              label="check-out"
                              color="#EF4444"
                            />
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {v.check_out_time ? (
                            <DistanceBadge
                              meters={v.checkout_distance_meters}
                              withinGeofence={v.checkout_within_geofence}
                            />
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {duration ? (
                            <span className="font-medium text-sm text-gray-700">
                              {duration}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600 max-w-[110px] truncate">
                          {v.purpose
                            ? v.purpose
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (c) => c.toUpperCase())
                            : '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600 max-w-[150px] truncate">
                          {v.outcome || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} total visits
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm px-3">
                  Page {page} of {Math.max(totalPages, 1)}
                </span>
                <button
                  type="button"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-5 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={12} className="text-gray-500" /> Registered site (grey)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={12} className="text-emerald-500" /> Check-in GPS (green)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={12} className="text-red-500" /> Check-out GPS (red)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500" /> Within geofence
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-amber-600" /> Outside geofence
        </span>
      </div>
    </div>
  );
}