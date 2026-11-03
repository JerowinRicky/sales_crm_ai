import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ConfirmModal from "../../components/common/ConfirmModal";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  UserRound,
  Building2,
  Phone,
  Mail,
} from "lucide-react";

import { contactsAPI } from "../../services/api";

const ContactsPage = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [viewContact, setViewContact] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);

  const limit = 20;

  /*
   * Load contacts
   */
  const loadContacts = async () => {
    try {
      setLoading(true);

      const result = await contactsAPI.getAll({
        page,
        limit,
        search: search.trim() || undefined,
      });

      if (result.success) {
        setContacts(result.data || []);
        setTotal(Number(result.total || 0));
      } else {
        toast.error(result.message || "Failed to load contacts");
      }
    } catch (error) {
      console.error(" Load contacts error:", error);

      console.log("Status:", error.response?.status);

      console.log("Response:", error.response?.data);

      console.log("URL:", error.config?.url);

      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Load when page/search changes
   */
  useEffect(() => {
    loadContacts();
  }, [page, search]);

  /*
   * Search
   */
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  /*
   * Clear search
   */
  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const openConfirmModal = ({ title, message, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    if (confirmLoading) return;

    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  };

  /*
   * View contact
   */
  const handleView = async (id) => {
    try {
      setViewLoading(true);

      const response = await contactsAPI.getById(id);

      if (response?.success) {
        setViewContact(response.data);
      } else {
        toast.error(response?.message || "Failed to load contact");
      }
    } catch (error) {
      console.error("View contact error:", error);

      toast.error(error.response?.data?.message || "Failed to load contact");
    } finally {
      setViewLoading(false);
    }
  };

  /*
   * Delete contact
   */
  const handleDelete = (contact) => {
    openConfirmModal({
      title: "Delete Contact",
      message: `Are you sure you want to delete "${contact.contact_name}"?`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);

          const response = await contactsAPI.remove(contact.id);

          if (response.data?.success) {
            toast.success("Contact deleted successfully");

            if (contacts.length === 1 && page > 1) {
              setPage((prev) => prev - 1);
            } else {
              loadContacts();
            }
          } else {
            toast.error(response.data?.message || "Failed to delete contact");
          }
        } catch (error) {
          console.error("Delete contact error:", error);

          toast.error(
            error.response?.data?.message || "Failed to delete contact"
          );
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage your customer contacts
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/contacts/new")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Add Contact
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
            placeholder="Search by contact, email, phone or customer..."
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
            <div className="text-gray-500">Loading contacts...</div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <UserRound size={42} className="text-gray-300 mb-3" />

            <h3 className="text-lg font-medium text-gray-700">
              No contacts found
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {search
                ? "Try changing your search."
                : "Create your first contact."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={() => navigate("/contacts/new")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Add Contact
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
                      Contact Name
                    </th>

                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Phone
                    </th>

                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Email
                    </th>

                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Customer
                    </th>

                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Designation
                    </th>

                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Contact Owner
                    </th>

                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">
                      Created
                    </th>

                    <th className="text-center px-5 py-3 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      {/* Contact Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                            <UserRound size={17} className="text-blue-600" />
                          </div>

                          <div>
                            <div className="font-medium text-gray-900">
                              {contact.contact_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone size={15} className="text-gray-400" />
                          {contact.phone || "-"}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={15} className="text-gray-400" />

                          <span>{contact.email || "-"}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />

                          <span className="text-gray-700">
                            {contact.customer_name || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="px-5 py-4 text-gray-700">
                        {contact.designation || "-"}
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-4">
                        <span className="text-gray-700">
                          {contact.contact_owner_name || "-"}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-gray-600 text-sm">
                        {contact.created_at
                          ? format(new Date(contact.created_at), "dd MMM yyyy")
                          : "-"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button
                            type="button"
                            title="View"
                            onClick={() => handleView(contact.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Eye size={17} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            title="Edit"
                            onClick={() =>
                              navigate(`/contacts/${contact.id}/edit`)
                            }
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Pencil size={17} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDelete(contact)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
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
                Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} contacts
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
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
                  onClick={() => setPage((prev) => prev + 1)}
                  className="p-2 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Contact Modal */}
      {viewContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewContact(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Contact Details
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {viewContact.contact_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewContact(null)}
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
                    <InfoItem
                      label="Contact Name"
                      value={viewContact.contact_name}
                    />

                    <InfoItem label="Phone" value={viewContact.phone} />

                    <InfoItem label="Email" value={viewContact.email} />

                    <InfoItem
                      label="Additional Email"
                      value={viewContact.alternate_email}
                    />

                    <InfoItem
                      label="Customer"
                      value={viewContact.customer_name}
                    />

                    <InfoItem
                      label="Designation"
                      value={viewContact.designation}
                    />

                    <InfoItem
                      label="Contact Owner"
                      value={viewContact.contact_owner_name}
                    />

                    <InfoItem
                      label="Created"
                      value={
                        viewContact.created_at
                          ? format(
                              new Date(viewContact.created_at),
                              "dd MMM yyyy, hh:mm a"
                            )
                          : "-"
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Description
                    </h3>

                    <div className="border rounded-lg p-4 bg-gray-50 min-h-[100px] text-gray-700 whitespace-pre-wrap">
                      {viewContact.description || "No description available."}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button
                type="button"
                onClick={() => setViewContact(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = viewContact.id;
                  setViewContact(null);
                  navigate(`/contacts/${id}/edit`);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Contact
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        loading={confirmLoading}
      />
    </div>
  );
};

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

export default ContactsPage;
