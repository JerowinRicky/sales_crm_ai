import React, { useState, useEffect } from 'react';
import { usersAPI, productMasterAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Plus,
  X,
  Key,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Power,
  Check,
  Globe,
} from 'lucide-react';
import CityStateSelect from '../../components/common/CityStateSelect';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: 'Amvion@123',
  role_id: 3,
  employee_id: '',
  department: '',
  territory: '',
  manager_id: '',
  domain_ids: [],
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [domainsList, setDomainsList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [resetUser, setResetUser] = useState(null);
  const [newPw, setNewPw] = useState('Welcome@123');

  useEffect(() => {
    load();
  }, [page, search]);

  useEffect(() => {
    usersAPI.getRoles().then((r) => setRoles(r.data || []));
    productMasterAPI.getDomains()
      .then((res) => {
        const data = res?.data || res || [];
        setDomainsList(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Failed to load domains', err));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const res = await usersAPI.getAll(params);
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast.error('Failed to load users');
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditUser(null);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role_id: u.role_id || 3,
      employee_id: u.employee_id || '',
      department: u.department || '',
      territory: u.territory || '',
      manager_id: u.manager_id || '',
      is_active: u.is_active,
      domain_ids: u.domain_ids || (u.domains ? u.domains.map(d => d.id) : []),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isSalesMgr = roles.find((r) => String(r.id) === String(form.role_id))?.name === 'sales_manager';
      const payload = {
        ...form,
        domain_ids: isSalesMgr ? (form.domain_ids || []) : [],
      };
      if (editUser) {
        await usersAPI.update(editUser.id, payload);
        toast.success('User updated');
      } else {
        await usersAPI.create(payload);
        toast.success('User created — default password: Welcome@123');
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleReset = async () => {
    try {
      await usersAPI.resetPassword(resetUser.id, { new_password: newPw });
      toast.success('Password reset');
      setResetUser(null);
      setNewPw('Welcome@123');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (u) => {
    try {
      await usersAPI.update(u.id, {
        ...u,
        role_id: u.role_id,
        is_active: !u.is_active,
      });
      toast.success(`User ${!u.is_active ? 'activated' : 'deactivated'}`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} users registered
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border rounded-lg p-4 mb-5">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, email, employee ID..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500">Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <UsersIcon size={42} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">
              No users found
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {search
                ? 'Try changing your search.'
                : 'Add your first user to get started.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Add User
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Email
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Role
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Dept
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Emp ID
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Last Login
                    </th>
                    <th className="text-center px-5 py-3 text-sm font-medium text-gray-600">
                      Logins
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-center px-5 py-3 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {u.name}
                            </div>
                            {u.manager_name && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Reports to: {u.manager_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.role_name === 'admin'
                              ? 'bg-red-50 text-red-600'
                              : u.role_name === 'sales_manager'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {u.role_name?.replace('_', ' ')}
                        </span>
                        {u.role_name === 'sales_manager' && (
                          <div className="mt-1 flex flex-wrap gap-1 max-w-[220px]">
                            {u.domains && u.domains.length > 0 ? (
                              u.domains.map((d) => (
                                <span
                                  key={d.id}
                                  className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded"
                                >
                                  {d.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-amber-600 italic">
                                No domains
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dept */}
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {u.department || '—'}
                      </td>

                      {/* Emp ID */}
                      <td className="px-5 py-4 text-xs font-mono text-gray-600">
                        {u.employee_id || '—'}
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {u.last_login
                          ? format(new Date(u.last_login), 'MMM d, HH:mm')
                          : 'Never'}
                      </td>

                      {/* Logins */}
                      <td className="px-5 py-4 text-center text-sm font-medium text-gray-700">
                        {u.login_count || 0}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(u)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            title="Reset Password"
                            onClick={() => setResetUser(u)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Key size={17} />
                          </button>

                          <button
                            type="button"
                            title={u.is_active ? 'Disable' : 'Enable'}
                            onClick={() => toggleActive(u)}
                            className={`p-2 rounded-lg ${
                              u.is_active
                                ? 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                                : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            <Power size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {total === 0 ? 0 : (page - 1) * 20 + 1} to{' '}
                {Math.min(page * 20, total)} of {total} users
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      disabled={!!editUser}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="+91..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Role *
                    </label>
                    <select
                      value={form.role_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, role_id: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Domains Multi-Select for Sales Manager */}
                  {roles.find((r) => String(r.id) === String(form.role_id))?.name === 'sales_manager' && (
                    <div className="col-span-2 p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                          Assigned Domains <span className="text-blue-600 font-normal lowercase">(multi-select)</span> *
                        </label>
                        {domainsList.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, domain_ids: domainsList.map((d) => d.id) }))}
                              className="text-blue-600 hover:underline font-semibold cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, domain_ids: [] }))}
                              className="text-gray-500 hover:underline font-medium cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      {domainsList.length === 0 ? (
                        <div className="text-xs text-gray-500 py-3 text-center bg-white rounded-lg border border-dashed border-gray-200">
                          No domains found. Please configure domains in Settings &gt; Products &amp; Domains first.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {domainsList.map((domain) => {
                            const isSelected = (form.domain_ids || []).includes(domain.id);
                            return (
                              <button
                                type="button"
                                key={domain.id}
                                onClick={() => {
                                  setForm((f) => {
                                    const cur = f.domain_ids || [];
                                    const next = cur.includes(domain.id)
                                      ? cur.filter((id) => id !== domain.id)
                                      : [...cur, domain.id];
                                    return { ...f, domain_ids: next };
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <Globe size={13} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                <span>{domain.name}</span>
                                {isSelected && <Check size={13} className="ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-[11px] text-blue-700/80 mt-2">
                        This sales manager will only have access to view and filter leads belonging to these selected domains.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Employee ID
                    </label>
                    <input
                      value={form.employee_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, employee_id: e.target.value }))
                      }
                      placeholder="EMP001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Department
                    </label>
                    <input
                      value={form.department}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, department: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Territory (State / City)
                    </label>
                    <CityStateSelect
                      state={form.territory_state || ''}
                      city={form.territory_city || ''}
                      onStateChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          territory_state: v,
                          territory:
                            v + (f.territory_city ? ` — ${f.territory_city}` : ''),
                        }))
                      }
                      onCityChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          territory_city: v,
                          territory:
                            (f.territory_state || '') + (v ? ` — ${v}` : ''),
                        }))
                      }
                    />
                    <input
                      value={form.territory}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, territory: e.target.value }))
                      }
                      placeholder="Or type territory manually"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Manager
                    </label>
                    <select
                      value={form.manager_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, manager_id: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Manager</option>
                      {users
                        .filter((u) => u.id !== editUser?.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {!editUser && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Initial Password
                      </label>
                      <input
                        value={form.password}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, password: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {editUser && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Status
                      </label>
                      <select
                        value={form.is_active}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            is_active: e.target.value === 'true',
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editUser ? 'Update' : 'Create'} User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setResetUser(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Reset Password — {resetUser.name}
              </h2>
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}