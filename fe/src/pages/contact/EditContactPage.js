import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import {
  contactsAPI,
  customersAPI,
  usersAPI,
} from "../../services/api";

const EditContactPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    contact_name: "",
    phone: "",
    email: "",
    alternate_email: "",
    customer_id: "",
    designation: "",
    contact_owner: "",
    description: "",
  });

  /*
   * Load contact + dropdown data
   */
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
  
      const [
        contactResponse,
        customersResponse,
        usersResponse,
      ] = await Promise.all([
        contactsAPI.getById(id),
  
        customersAPI.getAll({
          page: 1,
          limit: 1000,
        }),
  
        usersAPI.getAll(),
      ]);
  
      console.log("Contact response:", contactResponse);
      console.log("Customers response:", customersResponse);
      console.log("Users response:", usersResponse);
  
      /*
       * Contact
       */
      if (!contactResponse?.success) {
        toast.error(
          contactResponse?.message || "Contact not found"
        );
  
        navigate("/contacts");
        return;
      }
  
      const contact = contactResponse.data;
  
      setForm({
        contact_name: contact.contact_name || "",
        phone: contact.phone || "",
        email: contact.email || "",
        alternate_email: contact.alternate_email || "",
  
        customer_id: contact.customer_id
          ? String(contact.customer_id)
          : "",
  
        designation: contact.designation || "",
  
        contact_owner: contact.contact_owner
          ? String(contact.contact_owner)
          : "",
  
        description: contact.description || "",
      });
  
      /*
       * Customers
       */
      if (customersResponse?.success) {
        setCustomers(customersResponse.data || []);
      }
  
      /*
       * Users
       */
      if (usersResponse?.success) {
        setUsers(usersResponse.data || []);
      }
  
    } catch (error) {
      console.error("Load edit contact error:", error);
  
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load contact"
      );
  
      navigate("/contacts");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Handle input
   */
  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
   * Submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /*
     * Validation
     */
    if (!form.contact_name.trim()) {
      toast.error("Contact name is required");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Phone is required");
      return;
    }

    if (!form.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    try {
      setSaving(true);

      const response = await contactsAPI.update(id, {
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        alternate_email: form.alternate_email.trim() || null,
        customer_id: form.customer_id,
        designation: form.designation.trim() || null,
        contact_owner: form.contact_owner || null,
        description: form.description.trim() || null,
      });
      
      if (response?.success) {
        toast.success("Contact updated successfully");
        navigate("/contacts");
      } else {
        toast.error(
          response?.message || "Failed to update contact"
        );
      }

      if (response.data?.success) {
        toast.success(
          "Contact updated successfully"
        );

        navigate("/contacts");
      } else {
        toast.error(
          response.data?.message ||
            "Failed to update contact"
        );
      }
    } catch (error) {
      console.error(
        "Update contact error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to update contact"
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Loading
   */
  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white border rounded-lg p-10 text-center text-gray-500">
          Loading contact...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/contacts")}
            className="p-2 rounded-lg border hover:bg-gray-50"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Contact
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Update contact information
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl"
      >
        {/* Contact Information */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-gray-400">
              ˅
            </span>

            <h2 className="text-lg font-semibold text-gray-900">
              Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
                <span className="text-red-500">
                  {" "}*
                </span>
              </label>

              <input
                type="text"
                name="contact_name"
                value={form.contact_name}
                onChange={handleChange}
                placeholder="Enter contact name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
                <span className="text-red-500">
                  {" "}*
                </span>
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Additional Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Email
              </label>

              <input
                type="email"
                name="alternate_email"
                value={form.alternate_email}
                onChange={handleChange}
                placeholder="Enter additional email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
                <span className="text-red-500">
                  {" "}*
                </span>
              </label>

              <select
                name="customer_id"
                value={form.customer_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  Select customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation
              </label>

              <input
                type="text"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="Enter designation"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contact Owner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Owner
                <span className="text-red-500">
                  {" "}*
                </span>
              </label>

              <select
                name="contact_owner"
                value={form.contact_owner}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  Select contact owner
                </option>

                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border-t p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-gray-400">
              ˅
            </span>

            <h2 className="text-lg font-semibold text-gray-900">
              Description
            </h2>
          </div>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={6}
            placeholder="Enter description"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/contacts")}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : "Update Contact"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditContactPage;