import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, History, Save } from 'lucide-react';

import {
  leadsAPI,
  usersAPI,
  customersAPI,
  productMasterAPI,
  contactsAPI
} from '../../services/api';

import { useAuth } from '../../context/AuthContext';

const SOURCES = {
  cold_call: 'Cold Call',
  email: 'Email',
  referral: 'Referral',
  website: 'Website',
  social_media: 'Social Media',
  exhibition: 'Exhibition',
  walk_in: 'Walk-in',
  other: 'Other'
};

const LEAD_TYPES = [
  'Existing Business',
  'New Business',
  'Renewal'
];

const WEEKS = [
  'W1',
  'W2',
  'W3',
  'W4',
  'W5'
];

const CATEGORIES = [
  'PRODUCT',
  'SERVICE'
];

const emptyProduct = {
  domain_id: '',
  subdomain_id: '',
  product_id: '',
  category: ''
};

const emptyForm = {
  customer_id: '',
  title: '',
  contact_id: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',

  expected_close_date: '',

  actual_scheduled_week: '',
  rescheduled_week: '',

  lead_type: '',
  next_visit: '',

  estimated_value: '',

  pipeline: 'Standard Pipeline',

  stage_id: '',

  source: 'other',

  domain_id: '',

  assigned_to: '',

  priority: 'medium',

  description: '',

  on_hold_reason: '',
  won_reason: '',
  lost_reason: '',

  products: []
};

export default function EditLeadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [domains, setDomains] = useState([]);

  const [subdomainsByRow, setSubdomainsByRow] = useState({});
  const [productsByRow, setProductsByRow] = useState({});

  const [customerSearch, setCustomerSearch] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [id]);

  const loadAllData = async () => {
    try {
      setLoading(true);

      const [
        customerResponse,
        stageResponse,
        domainResponse,
        leadResponse
      ] = await Promise.all([
        customersAPI.getAll({ page: 1, limit: 1000 }),
        leadsAPI.getStages(),
        productMasterAPI.getDomains(),
        leadsAPI.getById(id)
      ]);

      const leadData = leadResponse?.data;
      if (!leadData) {
        toast.error('Lead not found');
        navigate('/leads');
        return;
      }

      setCustomers(customerResponse?.data || []);
      setStages(stageResponse?.data || []);
      setDomains(domainResponse?.data || []);

      if (isManager || isAdmin) {
        try {
          const userResponse = await usersAPI.getAll({ limit: 100 });
          setUsers(userResponse?.data || []);
        } catch (e) {
          console.error('Failed to load users:', e);
        }
      }

      // Populate lead form data
      const leadProducts = Array.isArray(leadData.products) ? leadData.products : [];

      setForm({
        customer_id: leadData.customer_id ? String(leadData.customer_id) : '',
        title: leadData.title || '',
        contact_id: leadData.contact_id ? String(leadData.contact_id) : '',
        contact_name: leadData.contact_name || '',
        contact_email: leadData.contact_email || '',
        contact_phone: leadData.contact_phone || '',
        expected_close_date: leadData.expected_close_date
          ? leadData.expected_close_date.split('T')[0]
          : '',
        actual_scheduled_week: leadData.actual_scheduled_week || '',
        rescheduled_week: leadData.rescheduled_week || '',
        lead_type: leadData.lead_type || '',
        next_visit: leadData.next_visit
          ? leadData.next_visit.split('T')[0]
          : '',
        estimated_value: leadData.estimated_value !== null && leadData.estimated_value !== undefined
          ? String(leadData.estimated_value)
          : '',
        pipeline: leadData.pipeline || 'Standard Pipeline',
        stage_id: leadData.stage_id ? String(leadData.stage_id) : '',
        source: leadData.source || 'other',
        domain_id: leadData.domain_id ? String(leadData.domain_id) : '',
        assigned_to: leadData.assigned_to ? String(leadData.assigned_to) : '',
        priority: leadData.priority || 'medium',
        description: leadData.description || '',
        on_hold_reason: leadData.on_hold_reason || '',
        won_reason: leadData.won_reason || '',
        lost_reason: leadData.lost_reason || '',
        products: leadProducts.map(p => ({
          domain_id: p.domain_id ? String(p.domain_id) : '',
          subdomain_id: p.subdomain_id ? String(p.subdomain_id) : '',
          product_id: p.product_id ? String(p.product_id) : '',
          category: p.category || ''
        }))
      });

      // Load contacts for existing customer
      if (leadData.customer_id) {
        try {
          const contactsRes = await contactsAPI.getAll({
            customer_id: leadData.customer_id,
            page: 1,
            limit: 100
          });
          setContacts(contactsRes?.data || []);
        } catch (e) {
          console.error('Failed to load contacts for customer:', e);
        }
      }

      // Preload subdomains and products for each product row
      const subdomainsMap = {};
      const productsMap = {};

      await Promise.all(
        leadProducts.map(async (prod, idx) => {
          if (prod.domain_id) {
            try {
              const subRes = await productMasterAPI.getSubdomains({ domain_id: prod.domain_id });
              subdomainsMap[idx] = subRes?.data || [];
            } catch (err) {
              console.error(`Failed to load subdomains for row ${idx}:`, err);
            }
          }
          if (prod.subdomain_id) {
            try {
              const prodRes = await productMasterAPI.getProducts({ subdomain_id: prod.subdomain_id });
              productsMap[idx] = prodRes?.data || [];
            } catch (err) {
              console.error(`Failed to load products for row ${idx}:`, err);
            }
          }
        })
      );

      setSubdomainsByRow(subdomainsMap);
      setProductsByRow(productsMap);

    } catch (error) {
      console.error('Load edit lead data error:', error);
      toast.error(
        error.response?.data?.message ||
        'Failed to load lead details'
      );
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerSelect = async (customerId) => {
    if (!customerId) {
      setForm(f => ({
        ...f,
        customer_id: '',
        contact_id: '',
        contact_name: '',
        contact_phone: '',
        contact_email: ''
      }));
      setContacts([]);
      return;
    }

    setForm(f => ({
      ...f,
      customer_id: customerId,
      contact_id: '',
      contact_name: '',
      contact_phone: '',
      contact_email: ''
    }));

    setContactDropdownOpen(false);
    await loadContactsByCustomer(customerId);
  };

  const loadContactsByCustomer = async (customerId) => {
    setContacts([]);
    if (!customerId) return;

    try {
      setContactsLoading(true);
      const response = await contactsAPI.getAll({
        customer_id: customerId,
        page: 1,
        limit: 100
      });
      setContacts(response?.data || []);
    } catch (error) {
      console.error('Load contacts error:', error);
      toast.error('Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const handleContactSelect = (contact) => {
    if (!contact) {
      setForm(f => ({
        ...f,
        contact_id: '',
        contact_name: '',
        contact_phone: '',
        contact_email: ''
      }));
      return;
    }

    setForm(f => ({
      ...f,
      contact_id: contact.id,
      contact_name: contact.contact_name || '',
      contact_phone: contact.phone || '',
      contact_email: contact.email || ''
    }));

    setContactDropdownOpen(false);
  };

  const handleLeadDomainChange = (domainId) => {
    setForm(prev => ({
      ...prev,
      domain_id: domainId
    }));
  };

  const addProductRow = () => {
    setForm(prev => ({
      ...prev,
      products: [
        ...prev.products,
        { ...emptyProduct }
      ]
    }));
  };

  const removeProductRow = (index) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));

    setSubdomainsByRow(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    setProductsByRow(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handleProductDomainChange = async (index, domainId) => {
    const updated = [...form.products];
    updated[index] = {
      ...updated[index],
      domain_id: domainId,
      subdomain_id: '',
      product_id: ''
    };

    setForm(prev => ({
      ...prev,
      products: updated
    }));

    setSubdomainsByRow(prev => ({
      ...prev,
      [index]: []
    }));

    setProductsByRow(prev => ({
      ...prev,
      [index]: []
    }));

    if (!domainId) return;

    try {
      const response = await productMasterAPI.getSubdomains({ domain_id: domainId });
      setSubdomainsByRow(prev => ({
        ...prev,
        [index]: response?.data || []
      }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load subdomains');
    }
  };

  const handleProductSubdomainChange = async (index, subdomainId) => {
    const updated = [...form.products];
    updated[index] = {
      ...updated[index],
      subdomain_id: subdomainId,
      product_id: ''
    };

    setForm(prev => ({
      ...prev,
      products: updated
    }));

    setProductsByRow(prev => ({
      ...prev,
      [index]: []
    }));

    if (!subdomainId) return;

    try {
      const response = await productMasterAPI.getProducts({ subdomain_id: subdomainId });
      setProductsByRow(prev => ({
        ...prev,
        [index]: response?.data || []
      }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load products');
    }
  };

  const handleProductChange = (index, field, value) => {
    setForm(prev => {
      const products = [...prev.products];
      products[index] = {
        ...products[index],
        [field]: value
      };
      return {
        ...prev,
        products
      };
    });
  };

  const filteredCustomers = customers.filter(customer => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    return (
      customer.company_name?.toLowerCase().includes(q) ||
      customer.contact_person?.toLowerCase().includes(q) ||
      customer.city?.toLowerCase().includes(q)
    );
  });

  const selectedStage = stages.find(s => String(s.id) === String(form.stage_id));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Lead Name is required');
      return;
    }

    if (!form.customer_id) {
      toast.error('Customer Name is required');
      return;
    }

    if (!form.contact_name.trim()) {
      toast.error('Contact Name is required');
      return;
    }

    if (!form.expected_close_date) {
      toast.error('Closing Date is required');
      return;
    }

    if (!form.pipeline) {
      toast.error('Lead Pipeline is required');
      return;
    }

    if (!form.stage_id) {
      toast.error('Lead Stage is required');
      return;
    }

    if (!form.domain_id) {
      toast.error('Domain is required');
      return;
    }

    if (!form.products.length) {
      toast.error('Add at least one product');
      return;
    }

    for (let i = 0; i < form.products.length; i++) {
      const product = form.products[i];
      if (!product.domain_id) {
        toast.error(`Product ${i + 1}: Domain is required`);
        return;
      }
      if (!product.subdomain_id) {
        toast.error(`Product ${i + 1}: Sub Domain is required`);
        return;
      }
      if (!product.product_id) {
        toast.error(`Product ${i + 1}: Product Name is required`);
        return;
      }
      if (!product.category) {
        toast.error(`Product ${i + 1}: Category is required`);
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        title: form.title.trim(),
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        stage_id: Number(form.stage_id),
        domain_id: form.domain_id ? Number(form.domain_id) : null,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        estimated_value: form.estimated_value !== '' && form.estimated_value !== null
          ? Number(form.estimated_value)
          : null,
        actual_scheduled_week: form.actual_scheduled_week || null,
        rescheduled_week: form.rescheduled_week || null,
        lead_type: form.lead_type || null,
        next_visit: form.next_visit || null,
        on_hold_reason: form.on_hold_reason?.trim() || null,
        won_reason: form.won_reason?.trim() || null,
        lost_reason: form.lost_reason?.trim() || null,
        products: form.products.map(p => ({
          product_id: Number(p.product_id),
          category: p.category
        }))
      };

      const res = await leadsAPI.update(id, payload);

      toast.success(res?.data?.message || 'Lead updated successfully');
      navigate(`/leads/${id}`);

    } catch (error) {
      console.error('Update lead error:', error);
      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Failed to update lead'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
          Loading lead form...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/leads/${id}`)}
            className="p-2 rounded-lg border hover:bg-gray-50 bg-white"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Lead
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Modify details for: <strong className="text-gray-700">{form.title}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/leads/${id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-sm text-gray-700 shadow-sm transition"
        >
          <History size={15} className="text-gray-500" />
          View History on Lead Page
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl"
      >
        {/* ================================================= */}
        {/* LEAD INFORMATION */}
        {/* ================================================= */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Lead Information
          </h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Lead Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Name
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter lead name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
                <span className="text-red-500"> *</span>
              </label>
              <select
                value={form.customer_id}
                onChange={e => handleCustomerSelect(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Select customer</option>
                {filteredCustomers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Name */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name *
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.customer_id) {
                      toast.error('Please select a customer first');
                      return;
                    }
                    setContactDropdownOpen(prev => !prev);
                  }}
                  style={{
                    width: '100%',
                    minHeight: 42,
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    background: '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ color: form.contact_name ? '#111827' : '#9CA3AF' }}>
                    {form.contact_name || 'Select contact'}
                  </span>
                  <span style={{ color: '#6B7280' }}>▾</span>
                </button>

                {contactDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: 8,
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                      zIndex: 1000,
                      maxHeight: 240,
                      overflowY: 'auto'
                    }}
                  >
                    {contactsLoading ? (
                      <div style={{ padding: 14, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                        Loading contacts...
                      </div>
                    ) : contacts.length === 0 ? (
                      <div style={{ padding: 14, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                        No contacts found for this customer
                      </div>
                    ) : (
                      contacts.map(contact => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => handleContactSelect(contact)}
                          style={{
                            width: '100%',
                            border: 'none',
                            background: form.contact_id === contact.id ? '#EFF6FF' : '#FFFFFF',
                            padding: '10px 12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F3F4F6'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background =
                              form.contact_id === contact.id ? '#EFF6FF' : '#FFFFFF';
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                            {contact.contact_name}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                            {contact.phone || 'No phone number'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Closing Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Date
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="date"
                name="expected_close_date"
                value={form.expected_close_date}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>

            {/* Actual Scheduled Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Scheduled Week
              </label>
              <select
                name="actual_scheduled_week"
                value={form.actual_scheduled_week}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Select week</option>
                {WEEKS.map(week => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
            </div>

            {/* Re-Scheduled Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Re-Scheduled Week
              </label>
              <select
                name="rescheduled_week"
                value={form.rescheduled_week}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Select week</option>
                {WEEKS.map(week => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
            </div>

            {/* Lead Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Type
              </label>
              <select
                name="lead_type"
                value={form.lead_type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Select lead type</option>
                {LEAD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Next Visit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Visit
              </label>
              <input
                type="date"
                name="next_visit"
                value={form.next_visit}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                name="estimated_value"
                value={form.estimated_value}
                onChange={handleChange}
                placeholder="₹ 0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>

            {/* Lead Pipeline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Pipeline
                <span className="text-red-500"> *</span>
              </label>
              <select
                name="pipeline"
                value={form.pipeline}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="Standard Pipeline">Standard Pipeline</option>
              </select>
            </div>

            {/* Lead Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Stages
                <span className="text-red-500"> *</span>
              </label>
              <select
                name="stage_id"
                value={form.stage_id}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Select stage</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deal Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Source
              </label>
              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                {Object.entries(SOURCES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain
                <span className="text-red-500"> *</span>
              </label>
              <select
                name="domain_id"
                value={form.domain_id}
                onChange={e => handleLeadDomainChange(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Select domain</option>
                {domains.map(domain => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Owner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Owner
                <span className="text-red-500"> *</span>
              </label>
              <select
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleChange}
                required={isManager || isAdmin}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">
                  {isManager || isAdmin ? 'Select lead owner' : 'Current owner'}
                </option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                placeholder="contact@company.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                name="contact_phone"
                value={form.contact_phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* PRODUCT INFORMATION */}
        {/* ================================================= */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Product Information
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select Domain → Sub Domain → Product
              </p>
            </div>

            <button
              type="button"
              onClick={addProductRow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={15} />
              Add Row
            </button>
          </div>

          {form.products.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500 text-sm">
              No products added.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={addProductRow}
                  className="text-blue-600 font-medium"
                >
                  + Add Product
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Domain *
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Sub Domain *
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Name *
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Category *
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>

                <tbody>
                  {form.products.map((product, index) => (
                    <tr key={index} className="border-t">
                      {/* Product Domain */}
                      <td className="px-2 py-2">
                        <select
                          value={product.domain_id}
                          onChange={e => handleProductDomainChange(index, e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Select domain</option>
                          {domains.map(domain => (
                            <option key={domain.id} value={domain.id}>
                              {domain.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Product Sub Domain */}
                      <td className="px-2 py-2">
                        <select
                          value={product.subdomain_id}
                          onChange={e => handleProductSubdomainChange(index, e.target.value)}
                          required
                          disabled={!product.domain_id}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                        >
                          <option value="">Select sub domain</option>
                          {(subdomainsByRow[index] || []).map(subdomain => (
                            <option key={subdomain.id} value={subdomain.id}>
                              {subdomain.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Product Name */}
                      <td className="px-2 py-2">
                        <select
                          value={product.product_id}
                          onChange={e => handleProductChange(index, 'product_id', e.target.value)}
                          required
                          disabled={!product.subdomain_id}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                        >
                          <option value="">Select product</option>
                          {(productsByRow[index] || []).map(productItem => (
                            <option key={productItem.id} value={productItem.id}>
                              {productItem.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Category */}
                      <td className="px-2 py-2">
                        <select
                          value={product.category}
                          onChange={e => handleProductChange(index, 'category', e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Select category</option>
                          {CATEGORIES.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeProductRow(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Remove product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* DESCRIPTION */}
        {/* ================================================= */}
        <div className="border-t p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Description
          </h2>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Requirements and notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-3 resize-y"
          />
        </div>

        {/* ================================================= */}
        {/* ON HOLD / WON / LOST REASONS */}
        {/* ================================================= */}
        <div className="border-t p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              On Hold Reason
            </h2>
            <textarea
              name="on_hold_reason"
              value={form.on_hold_reason}
              onChange={handleChange}
              rows={3}
              placeholder="Enter reason if the lead is put on hold..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-y text-sm"
            />
          </div>

          {selectedStage?.is_won ? (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Won Reason
              </h2>
              <textarea
                name="won_reason"
                value={form.won_reason}
                onChange={handleChange}
                rows={3}
                placeholder="Reason why the deal was won..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-y text-sm"
              />
            </div>
          ) : selectedStage?.is_closed ? (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Lost Reason
              </h2>
              <textarea
                name="lost_reason"
                value={form.lost_reason}
                onChange={handleChange}
                rows={3}
                placeholder="Reason why the deal was lost..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-y text-sm"
              />
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Additional Notes
              </h2>
              <p className="text-xs text-gray-400 mt-2">
                Won/Lost reasons can be recorded when the lead reaches a closing stage.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => navigate(`/leads/${id}`)}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
          >
            <Save size={16} />
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

