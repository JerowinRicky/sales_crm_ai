import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { customersAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/common/ConfirmModal";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  Plus,
  Search,
  X,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  UserRound,
  Briefcase,
} from "lucide-react";
import MapPicker from "../components/common/MapPicker";
import ExportButtons from "../components/common/ExportButtons";

const INDUSTRIES = [
  "Technology",
  "Manufacturing",
  "Healthcare",
  "Finance",
  "Retail",
  "Education",
  "Construction",
  "Logistics",
  "Hospitality",
  "Agriculture",
  "Other",
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const { isManager } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, [page, search, filterIndustry]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (filterIndustry) params.industry = filterIndustry;
      const res = await customersAPI.getAll(params);
      setCustomers(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast.error("Failed to load customers");
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const handleView = async (id) => {
    try {
      setViewLoading(true);
      const r = await customersAPI.getById(id);
      setViewCustomer(r.data);
    } catch (e) {
      toast.error(e.message || "Failed to load customer");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = (id) => {
    setSelectedCustomerId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await customersAPI.remove(selectedCustomerId);
      toast.success("Customer deactivated");
      setShowConfirm(false);
      setSelectedCustomerId(null);
      loadCustomers();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} registered client accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButtons
            data={customers}
            filename="customers"
            title="Customers Report"
          />
          <button
            type="button"
            onClick={() => navigate("/customers/new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white border rounded-lg p-4 mb-5">
        <div className="flex  items-center justify-between gap-3">
          <div className="relative max-w-md flex-1 min-w-[460px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search by company, email, phone or city..."
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

          <select
            value={filterIndustry}
            onChange={(e) => {
              setFilterIndustry(e.target.value);
              setPage(1);
            }}
            className="w-[160px] px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500">Loading customers...</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 size={42} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">
              No customers found
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {search || filterIndustry
                ? "Try changing your filters."
                : "Add your first customer account to get started."}
            </p>
            {!search && !filterIndustry && (
              <button
                type="button"
                onClick={() => navigate("/customers/new")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Add Customer
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
                      Company
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Email
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Customer Type
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Industry
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      City
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Phone
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Assigned To
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Added
                    </th>
                    <th className="text-center px-5 py-3 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      {/* Company */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                            <Building2 size={17} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {c.company_name}
                            </div>
                            {c.website && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                <Globe size={11} />
                                {c.website}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={15} className="text-gray-400" />
                          <span>{c.email || "—"}</span>
                        </div>
                      </td>

                      {/* Customer Type */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                          {c.customer_type || "—"}
                        </span>
                      </td>

                      {/* Industry */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          {c.industry || "—"}
                        </span>
                      </td>

                      {/* City */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <MapPin size={15} className="text-gray-400" />
                          <span>
                            {c.city || "—"}
                            {c.state ? `, ${c.state}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone size={15} className="text-gray-400" />
                          <span>{c.phone || "—"}</span>
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <UserRound size={15} className="text-gray-400" />
                          <span>{c.assigned_to_name || "—"}</span>
                        </div>
                      </td>

                      {/* Added */}
                      <td className="px-5 py-4 text-gray-600 text-sm">
                        {c.created_at
                          ? format(new Date(c.created_at), "dd MMM yyyy")
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="View"
                            onClick={() => handleView(c.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Edit"
                            onClick={() =>
                              navigate(`/customers/${c.id}/edit`)
                            }
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Pencil size={17} />
                          </button>

                          {isManager && (
                            <button
                              type="button"
                              title="Deactivate"
                              onClick={() => handleDelete(c.id)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
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
                Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} customers
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
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
                  disabled={page >= totalPages || totalPages === 0}
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

      {/* View Customer Modal */}
      {viewCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewCustomer(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewCustomer.company_name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Customer Details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {viewLoading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      ["Email", viewCustomer.email],
                      ["Phone", viewCustomer.phone],
                      ["Alternate Phone", viewCustomer.alternate_phone],
                      ["Website", viewCustomer.website],
                      ["Customer Type", viewCustomer.customer_type],
                      ["Industry", viewCustomer.industry],
                      ["Category", viewCustomer.category],
                      ["Is KAM", viewCustomer.is_kam],
                      ["KAM Category", viewCustomer.kam_category],
                      ["Assigned To", viewCustomer.assigned_to_name],
                      [
                        "Billing Location",
                        `${viewCustomer.city || ""} ${
                          viewCustomer.state || ""
                        }`.trim(),
                      ],
                      ["Pincode", viewCustomer.pincode],
                      ["Country", viewCustomer.country],
                    ].map(([label, value]) =>
                      value ? (
                        <InfoItem key={label} label={label} value={value} />
                      ) : null
                    )}
                  </div>

                  {viewCustomer.notes && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </h3>
                      <div className="border rounded-lg p-4 bg-gray-50 text-gray-700 whitespace-pre-wrap">
                        {viewCustomer.notes}
                      </div>
                    </div>
                  )}

                  {viewCustomer.leads?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Associated Leads ({viewCustomer.leads.length})
                      </h3>
                      {viewCustomer.leads.map((l) => (
                        <a
                          key={l.id}
                          href={`/leads/${l.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between py-3 border-b last:border-b-0 text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          <span>{l.title}</span>
                          <span className="flex items-center gap-2">
                            {l.estimated_value > 0 && (
                              <span className="text-emerald-600 font-semibold text-xs">
                                ₹{Number(l.estimated_value).toLocaleString()}
                              </span>
                            )}
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: `${l.color || "#2563EB"}15`,
                                color: l.color || "#2563EB",
                              }}
                            >
                              {l.stage_name}
                            </span>
                          </span>
                        </a>
                      ))}
                    </div>
                  )}

                  {(viewCustomer.address_line1 ||
                    viewCustomer.address_line2) && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Billing Address
                      </h3>
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {viewCustomer.address_line1}
                        {viewCustomer.address_line2 && (
                          <>
                            <br />
                            {viewCustomer.address_line2}
                          </>
                        )}
                        {viewCustomer.city && (
                          <>
                            <br />
                            {viewCustomer.city}
                          </>
                        )}
                        {viewCustomer.state && <>, {viewCustomer.state}</>}
                        {viewCustomer.pincode && (
                          <>
                            {" - "}
                            {viewCustomer.pincode}
                          </>
                        )}
                        {viewCustomer.country && (
                          <>
                            <br />
                            {viewCustomer.country}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {viewCustomer.latitude && viewCustomer.longitude && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Billing Location
                      </h3>
                      <MapPicker
                        latitude={viewCustomer.latitude}
                        longitude={viewCustomer.longitude}
                        height={220}
                        readOnly
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = viewCustomer.id;
                  setViewCustomer(null);
                  navigate(`/customers/${id}/edit`);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        title="Deactivate Customer"
        message="Are you sure you want to deactivate this customer?"
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedCustomerId(null);
        }}
        loading={deleting}
      />
    </div>
  );
}

/*
 * Small reusable component for view modal
 */
const InfoItem = ({ label, value }) => {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value || "-"}</div>
    </div>
  );
};