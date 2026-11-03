import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { contactsAPI, customersAPI, usersAPI } from "../../services/api";

const NewContactPage = () => {

    const navigate = useNavigate();

    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        contact_name: "",
        phone: "",
        email: "",
        alternate_email: "",
        customer_id: "",
        designation: "",
        contact_owner: "",
        description: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {

            const [customerResponse, userResponse] =
                await Promise.all([
                    customersAPI.getAll({
                        page: 1,
                        limit: 1000
                    }),

                    usersAPI.getAll()
                ]);

                setCustomers(
                    customerResponse?.data || []
                );
                
                setUsers(
                    userResponse?.data || []
                );

        } catch (error) {

            console.error(error);

            toast.error(
                "Failed to load customers or users"
            );
        }
    };

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

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

            setLoading(true);

            await contactsAPI.create(form);

            toast.success(
                "Contact created successfully"
            );

            navigate("/contacts");

        } catch (error) {

            console.error(error);

            toast.error(
                error.response?.data?.message ||
                "Failed to create contact"
            );

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="p-6">

            <div className="flex justify-between items-center mb-6">

                <h1 className="text-2xl font-semibold">
                    New Contact
                </h1>

                <button
                    type="button"
                    onClick={() => navigate("/contacts")}
                    className="px-4 py-2 border rounded"
                >
                    Cancel
                </button>

            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-lg border p-6"
            >

                <h2 className="text-lg font-semibold mb-6">
                    Contact Information
                </h2>

                <div className="grid grid-cols-2 gap-6">

                    {/* Contact Name */}

                    <div>
                        <label className="block mb-2">
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
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter contact name"
                        />
                    </div>

                    {/* Phone */}

                    <div>
                        <label className="block mb-2">
                            Phone
                            <span className="text-red-500">
                                {" "}*
                            </span>
                        </label>

                        <input
                            type="text"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter phone number"
                        />
                    </div>

                    {/* Additional Email */}

                    <div>
                        <label className="block mb-2">
                            Additional Email
                        </label>

                        <input
                            type="email"
                            name="alternate_email"
                            value={form.alternate_email}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter alternate email"
                        />
                    </div>

                    {/* Email */}

                    <div>
                        <label className="block mb-2">
                            Email
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter email"
                        />
                    </div>

                    {/* Customer */}

                    <div>
                        <label className="block mb-2">
                            Customer Name
                            <span className="text-red-500">
                                {" "}*
                            </span>
                        </label>

                        <select
                            name="customer_id"
                            value={form.customer_id}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">
                                Select customer
                            </option>

                            {customers.map(customer => (
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
                        <label className="block mb-2">
                            Designation
                        </label>

                        <input
                            type="text"
                            name="designation"
                            value={form.designation}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter designation"
                        />
                    </div>

                    {/* Contact Owner */}

                    <div>

                        <label className="block mb-2">
                            Contact Owner
                            <span className="text-red-500">
                                {" "}*
                            </span>
                        </label>

                        <select
                            name="contact_owner"
                            value={form.contact_owner}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                        >

                            <option value="">
                                Select owner
                            </option>

                            {users.map(user => (
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

                {/* Description */}

                <div className="mt-6">

                    <label className="block mb-2">
                        Description
                    </label>

                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={5}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter description"
                    />

                </div>

                {/* Buttons */}

                <div className="flex justify-end gap-3 mt-6">

                    <button
                        type="button"
                        onClick={() => navigate("/contacts")}
                        className="px-5 py-2 border rounded"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 text-white rounded"
                    >
                        {loading
                            ? "Creating..."
                            : "Create Contact"}
                    </button>

                </div>

            </form>

        </div>
    );
};

export default NewContactPage;