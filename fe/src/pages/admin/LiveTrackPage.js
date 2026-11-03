import React, { useState, useEffect } from 'react';
import { visitsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';
import {
  RefreshCw,
  MapPin,
  Radio,
  Users,
  Building2,
  Clock,
  Trophy,
  ExternalLink,
} from 'lucide-react';

export default function LiveTrackPage() {
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const load = async () => {
    try {
      const res = await visitsAPI.getLive();
      setTracked(res.data || []);
      setLastRefresh(new Date());
    } catch (e) {
      toast.error('Failed to load tracking');
    }
    setLoading(false);
  };

  const stats = [
    {
      label: 'Currently Active',
      value: tracked.length,
      icon: Radio,
      color: '#10B981',
    },
    {
      label: 'Unique Customers',
      value: new Set(tracked.map((t) => t.company_name)).size,
      icon: Building2,
      color: '#0284C7',
    },
    {
      label: 'Avg Duration (min)',
      value: tracked.length
        ? Math.round(
            tracked.reduce(
              (s, t) =>
                s + differenceInMinutes(new Date(), new Date(t.check_in_time)),
              0
            ) / tracked.length
          )
        : 0,
      icon: Clock,
      color: '#D97706',
    },
    {
      label: 'Longest Visit (min)',
      value: tracked.length
        ? Math.max(
            ...tracked.map((t) =>
              differenceInMinutes(new Date(), new Date(t.check_in_time))
            )
          )
        : 0,
      icon: Trophy,
      color: '#2563EB',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Live Field Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tracked.length} rep{tracked.length !== 1 ? 's' : ''} currently in
            field · Updated {format(lastRefresh, 'HH:mm:ss')}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {s.label}
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: `${s.color}14` }}
            >
              <s.icon size={20} color={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white border rounded-lg flex items-center justify-center py-16">
          <div className="text-gray-500">Loading live tracking data...</div>
        </div>
      ) : tracked.length === 0 ? (
        <div className="bg-white border rounded-lg flex flex-col items-center justify-center py-16">
          <Radio size={42} className="text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">
            No Active Field Visits
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            No sales reps are currently checked in
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Live Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracked.map((t) => {
              const dur = differenceInMinutes(
                new Date(),
                new Date(t.check_in_time)
              );
              return (
                <div
                  key={t.session_id}
                  className="bg-white border rounded-lg p-5 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {t.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Field Representative
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700">
                      LIVE
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Visiting
                    </div>
                    <div className="font-semibold text-sm text-gray-900">
                      {t.company_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t.city}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Checked In
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {format(new Date(t.check_in_time), 'HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Duration
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          dur > 120 ? 'text-amber-600' : 'text-gray-900'
                        }`}
                      >
                        {dur} min
                      </div>
                    </div>
                  </div>

                  {t.lat && (
                    <a
                      href={`https://maps.google.com/?q=${t.lat},${t.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <MapPin size={14} />
                      View on Maps
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* All Active Sessions Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-sm text-gray-900">
                All Active Sessions
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Rep Name
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Customer
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      City
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Check-in Time
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Duration
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Coordinates
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Map
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tracked.map((t) => {
                    const dur = differenceInMinutes(
                      new Date(),
                      new Date(t.check_in_time)
                    );
                    return (
                      <tr key={t.session_id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {t.name}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {t.company_name}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {t.city || '—'}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {format(new Date(t.check_in_time), 'MMM d, HH:mm')}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-sm font-semibold ${
                              dur > 120 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {dur} min
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-gray-600">
                          {Number(t.lat).toFixed(5)}, {Number(t.lng).toFixed(5)}
                        </td>
                        <td className="px-5 py-4">
                          {t.lat && (
                            <a
                              href={`https://maps.google.com/?q=${t.lat},${t.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                            >
                              <MapPin size={12} />
                              Maps
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}