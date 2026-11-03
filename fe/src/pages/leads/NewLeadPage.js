import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, X, Building2, UserPlus, Loader2 } from 'lucide-react';

import {
  leadsAPI,
  usersAPI,
  customersAPI,
  productMasterAPI,
  contactsAPI
} from '../../services/api';

import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/common/SearchableSelect';

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


const INDUSTRIES = [
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Finance',
  'Retail',
  'Education',
  'Construction',
  'Logistics',
  'Hospitality',
  'Agriculture',
  'Other'
];

const initialCustomerForm = {
  company_name: '',
  email: '',
  phone: '',
  industry: '',
  city: '',
  state: '',
  website: '',
  notes: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  contact_designation: ''
};

const initialContactForm = {
  contact_name: '',
  phone: '',
  email: '',
  designation: ''
};

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

  products: []
};

export default function NewLeadPage() {

  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);

  const [domains, setDomains] = useState([]);

  const [allSubdomains, setAllSubdomains] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [customerSearch, setCustomerSearch] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [contacts, setContacts] = useState([]);
const [contactsLoading, setContactsLoading] = useState(false);
const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  // Customer & Contact modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(initialCustomerForm);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [newContactForm, setNewContactForm] = useState(initialContactForm);




  /*
   * For non-admin users, lock lead owner to logged-in user
   */
  useEffect(() => {
    if (!isAdmin && user?.id) {
      setForm(prev => ({
        ...prev,
        assigned_to: user.id
      }));
    }
  }, [user, isAdmin]);

  /*
   * Load master data
   */
  useEffect(() => {
    loadData();
  }, [isAdmin]);


  const loadData = async () => {

    try {

      setLoading(true);

      const [
        customerResponse,
        stageResponse,
        domainResponse,
        subdomainResponse,
        productResponse
      ] = await Promise.all([
        customersAPI.getAll({
          page: 1,
          limit: 1000
        }),

        leadsAPI.getStages(),

        productMasterAPI.getDomains(),

        productMasterAPI.getSubdomains(),

        productMasterAPI.getProducts()
      ]);


      setCustomers(
        customerResponse?.data || []
      );

      setStages(
        stageResponse?.data || []
      );

      setDomains(
        domainResponse?.data || []
      );

      setAllSubdomains(
        subdomainResponse?.data || []
      );

      setAllProducts(
        productResponse?.data || []
      );


      /*
       * Load users only for admin
       */
      if (isAdmin) {

        const userResponse =
          await usersAPI.getAll({
            limit: 500,
            is_active: 1
          });

        const sortedUsers = (userResponse?.data || []).slice().sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );

        setUsers(
          sortedUsers
        );
      }


      /*
       * Set first stage as default
       */
      if (stageResponse?.data?.length) {

        setForm(prev => ({
          ...prev,
          stage_id:
            String(stageResponse.data[0].id)
        }));
      }

    } catch (error) {

      console.error(
        'Load new lead data error:',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Failed to load lead data'
      );

    } finally {

      setLoading(false);

    }
  };


  /*
   * Generic field change
   */
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


  /*
   * Customer selection
   */
  
  /*
   * Handle Create Customer from Modal
   */
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();

    if (!newCustomerForm.company_name.trim()) {
      toast.error('Company Name is required');
      return;
    }

    if (newCustomerForm.contact_name.trim() && !newCustomerForm.contact_phone.trim() && !newCustomerForm.phone.trim()) {
      toast.error('Contact phone number is required when specifying a contact person');
      return;
    }

    try {
      setCustomerSaving(true);

      const customerPayload = {
        company_name: newCustomerForm.company_name.trim(),
        email: newCustomerForm.email?.trim() || null,
        phone: newCustomerForm.phone?.trim() || null,
        industry: newCustomerForm.industry || null,
        city: newCustomerForm.city?.trim() || null,
        state: newCustomerForm.state?.trim() || null,
        website: newCustomerForm.website?.trim() || null,
        notes: newCustomerForm.notes?.trim() || null
      };

      const res = await customersAPI.create(customerPayload);
      const newId = res.id || res.data?.id;

      if (!newId) {
        throw new Error('Customer created but ID was not returned');
      }

      const createdCustomer = {
        id: newId,
        company_name: customerPayload.company_name,
        email: customerPayload.email || '',
        phone: customerPayload.phone || '',
        city: customerPayload.city || '',
        state: customerPayload.state || '',
        industry: customerPayload.industry || ''
      };

      // Add to customers list
      setCustomers(prev => [createdCustomer, ...prev]);

      // If primary contact was filled, create it
      if (newCustomerForm.contact_name.trim()) {
        const contactPhone = (newCustomerForm.contact_phone || newCustomerForm.phone || '').trim();
        try {
          const contactRes = await contactsAPI.create({
            customer_id: newId,
            contact_name: newCustomerForm.contact_name.trim(),
            phone: contactPhone,
            email: newCustomerForm.contact_email?.trim() || null,
            designation: newCustomerForm.contact_designation?.trim() || null
          });

          const createdContact = {
            id: contactRes.id || contactRes.data?.id,
            customer_id: newId,
            contact_name: newCustomerForm.contact_name.trim(),
            phone: contactPhone,
            email: newCustomerForm.contact_email?.trim() || '',
            designation: newCustomerForm.contact_designation?.trim() || ''
          };

          setContacts([createdContact]);
          setForm(prev => ({
            ...prev,
            customer_id: String(newId),
            contact_id: createdContact.id,
            contact_name: createdContact.contact_name,
            contact_phone: createdContact.phone,
            contact_email: createdContact.email
          }));
        } catch (cErr) {
          console.error('Contact creation error:', cErr);
          await handleCustomerSelect(newId);
          toast('Customer created, but contact could not be added: ' + (cErr.response?.data?.message || cErr.message), { icon: '⚠️' });
        }
      } else {
        await handleCustomerSelect(newId);
      }

      toast.success(`Customer "${createdCustomer.company_name}" created & selected!`);
      setIsCustomerModalOpen(false);
      setNewCustomerForm(initialCustomerForm);
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create customer');
    } finally {
      setCustomerSaving(false);
    }
  };

  /*
   * Handle Create Contact from Modal
   */
  const handleCreateContactSubmit = async (e) => {
    e.preventDefault();

    if (!form.customer_id) {
      toast.error('Please select a customer first');
      return;
    }

    if (!newContactForm.contact_name.trim()) {
      toast.error('Contact Name is required');
      return;
    }

    if (!newContactForm.phone.trim()) {
      toast.error('Contact Phone is required');
      return;
    }

    try {
      setContactSaving(true);

      const contactPayload = {
        customer_id: Number(form.customer_id),
        contact_name: newContactForm.contact_name.trim(),
        phone: newContactForm.phone.trim(),
        email: newContactForm.email?.trim() || null,
        designation: newContactForm.designation?.trim() || null
      };

      const res = await contactsAPI.create(contactPayload);
      const newContactId = res.id || res.data?.id;

      const createdContact = {
        id: newContactId,
        customer_id: Number(form.customer_id),
        contact_name: contactPayload.contact_name,
        phone: contactPayload.phone,
        email: contactPayload.email || '',
        designation: contactPayload.designation || ''
      };

      setContacts(prev => [createdContact, ...prev]);
      handleContactSelect(createdContact);

      toast.success(`Contact "${createdContact.contact_name}" added & selected!`);
      setIsContactModalOpen(false);
      setNewContactForm(initialContactForm);
    } catch (error) {
      console.error('Create contact error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create contact');
    } finally {
      setContactSaving(false);
    }
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
  
    const customer = customers.find(
      c => String(c.id) === String(customerId)
    );
  
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


  /*
   * Lead Domain
   */
  const handleLeadDomainChange = (
    domainId
  ) => {

    setForm(prev => ({
      ...prev,
      domain_id: domainId
    }));
  };


  /*
   * Add product row
   */
  const addProductRow = () => {

    setForm(prev => ({
      ...prev,

      products: [
        ...prev.products,
        {
          ...emptyProduct
        }
      ]
    }));
  };


  /*
   * Remove product row
   */
  const removeProductRow = (index) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  /*
   * Product Name change - auto-fills domain and subdomain
   */
  const handleProductNameChange = (index, productId) => {
    const updated = [...form.products];
    const selProduct = allProducts.find(p => String(p.id) === String(productId));

    if (selProduct) {
      updated[index] = {
        ...updated[index],
        product_id: selProduct.id,
        domain_id: selProduct.domain_id,
        subdomain_id: selProduct.subdomain_id
      };
    } else {
      updated[index] = {
        ...updated[index],
        product_id: ''
      };
    }

    setForm(prev => {
      const nextForm = {
        ...prev,
        products: updated
      };
      if (!prev.domain_id && selProduct?.domain_id) {
        nextForm.domain_id = selProduct.domain_id;
      }
      return nextForm;
    });
  };

  /*
   * Product Domain change
   */
  const handleProductDomainChange = (index, domainId) => {
    const updated = [...form.products];
    const current = updated[index];

    const curProd = allProducts.find(p => String(p.id) === String(current?.product_id));
    const prodValid = curProd && String(curProd.domain_id) === String(domainId);

    const curSub = allSubdomains.find(s => String(s.id) === String(current?.subdomain_id));
    const subValid = curSub && String(curSub.domain_id) === String(domainId);

    updated[index] = {
      ...current,
      domain_id: domainId,
      subdomain_id: subValid ? current.subdomain_id : '',
      product_id: prodValid ? current.product_id : ''
    };

    setForm(prev => ({
      ...prev,
      products: updated
    }));
  };

  /*
   * Product Subdomain change
   */
  const handleProductSubdomainChange = (index, subdomainId) => {
    const updated = [...form.products];
    const current = updated[index];
    const selSub = allSubdomains.find(s => String(s.id) === String(subdomainId));

    const curProd = allProducts.find(p => String(p.id) === String(current?.product_id));
    const prodValid = curProd && String(curProd.subdomain_id) === String(subdomainId);

    updated[index] = {
      ...current,
      subdomain_id: subdomainId,
      domain_id: selSub?.domain_id || current.domain_id,
      product_id: prodValid ? current.product_id : ''
    };

    setForm(prev => ({
      ...prev,
      products: updated
    }));
  };

  /*
   * Helpers to get subdomains and products for row
   */
  const getRowSubdomains = (product) => {
    if (product.domain_id) {
      return allSubdomains.filter(s => String(s.domain_id) === String(product.domain_id));
    }
    return allSubdomains;
  };

  const getProductOptions = (product) => {
    if (product.subdomain_id) {
      const filtered = allProducts.filter(p => String(p.subdomain_id) === String(product.subdomain_id));
      const others = allProducts.filter(p => String(p.subdomain_id) !== String(product.subdomain_id));
      return { filtered, others, isFiltered: true };
    }
    if (product.domain_id) {
      const filtered = allProducts.filter(p => String(p.domain_id) === String(product.domain_id));
      const others = allProducts.filter(p => String(p.domain_id) !== String(product.domain_id));
      return { filtered, others, isFiltered: true };
    }
    return { filtered: allProducts, others: [], isFiltered: false };
  };

  /*
   * Product field change
   */
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


  /*
   * Filter customer dropdown
   */
  const filteredCustomers =
    customers.filter(customer => {

      if (!customerSearch.trim()) {
        return true;
      }

      const q =
        customerSearch
          .toLowerCase()
          .trim();

      return (
        customer.company_name
          ?.toLowerCase()
          .includes(q) ||

        customer.contact_person
          ?.toLowerCase()
          .includes(q) ||

        customer.city
          ?.toLowerCase()
          .includes(q)
      );
    });

    const loadContactsByCustomer = async (customerId) => {
        setContacts([]);
      
        if (!customerId) {
          return;
        }
      
        try {
          setContactsLoading(true);
      
          const response = await contactsAPI.getAll({
            customer_id: customerId,
            page: 1,
            limit: 100
          });
      
          console.log('Contacts for customer:', response);
      
          setContacts(response?.data || []);
      
        } catch (error) {
      
          console.error(
            'Load contacts error:',
            error
          );
      
          toast.error(
            error.response?.data?.message ||
            'Failed to load contacts'
          );
      
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

        const id = contact.id !== undefined ? contact.id : (contact.value !== undefined ? contact.value : '');
        const name = contact.contact_name || contact.label || (typeof contact === 'string' ? contact : '');
        const phone = contact.phone || contact.contact_phone || (contact.subtext && contact.subtext.startsWith('Phone: ') ? contact.subtext.replace('Phone: ', '') : '') || '';
        const email = contact.email || contact.contact_email || '';

        setForm(f => ({
          ...f,
          contact_id: id,
          contact_name: name,
          contact_phone: phone,
          contact_email: email
        }));

        setContactDropdownOpen(false);
      };


  /*
   * Submit
   */
  const handleSubmit = async (e) => {

    e.preventDefault();


    /*
     * Required validation
     */
    if (!form.title.trim()) {
      toast.error(
        'Lead Name is required'
      );
      return;
    }


    if (!form.customer_id) {
      toast.error(
        'Customer Name is required'
      );
      return;
    }


    if (!form.contact_name.trim()) {
      toast.error(
        'Contact Name is required'
      );
      return;
    }


    if (!form.expected_close_date) {
      toast.error(
        'Closing Date is required'
      );
      return;
    }


    if (!form.pipeline) {
      toast.error(
        'Lead Pipeline is required'
      );
      return;
    }


    if (!form.stage_id) {
      toast.error(
        'Lead Stage is required'
      );
      return;
    }


    if (!form.domain_id) {
      toast.error(
        'Domain is required'
      );
      return;
    }


    if (isAdmin && !form.assigned_to) {
      toast.error('Lead Owner is required');
      return;
    }


    /*
     * At least one product
     */
    if (!form.products.length) {

      toast.error(
        'Add at least one product'
      );

      return;
    }


    /*
     * Validate products
     */
    for (
      let i = 0;
      i < form.products.length;
      i++
    ) {

      const product =
        form.products[i];


      if (!product.product_id) {

        toast.error(
          `Product ${i + 1}: Product Name is required`
        );

        return;
      }


      if (!product.domain_id) {

        toast.error(
          `Product ${i + 1}: Domain is required`
        );

        return;
      }


      if (!product.subdomain_id) {

        toast.error(
          `Product ${i + 1}: Sub Domain is required`
        );

        return;
      }


      if (!product.category) {

        toast.error(
          `Product ${i + 1}: Category is required`
        );

        return;
      }
    }


    try {

      setSaving(true);


      const payload = {
        ...form,
        assigned_to: isAdmin ? (form.assigned_to || user?.id) : user?.id,

        title:
          form.title.trim(),

        contact_name:
          form.contact_name.trim(),

        contact_email:
          form.contact_email.trim() ||
          null,

        contact_phone:
          form.contact_phone.trim() ||
          null,

        estimated_value:
          form.estimated_value ||
          null,

        actual_scheduled_week:
          form.actual_scheduled_week ||
          null,

        rescheduled_week:
          form.rescheduled_week ||
          null,

        lead_type:
          form.lead_type ||
          null,

        next_visit:
          form.next_visit ||
          null,

        on_hold_reason:
          form.on_hold_reason.trim() ||
          null
      };


      await leadsAPI.create(payload);


      toast.success(
        'Lead created successfully'
      );


      navigate('/leads');

    } catch (error) {

      console.error(
        'Create lead error:',
        error
      );

      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Failed to create lead'
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
      <div className="flex items-center gap-3 mb-6">

        <button
          type="button"
          onClick={() =>
            navigate('/leads')
          }
          className="p-2 rounded-lg border hover:bg-gray-50"
        >
          <ArrowLeft size={19} />
        </button>


        <div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Create New Lead
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Add a new sales opportunity
          </p>

        </div>

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

              <div className="flex gap-2">

                <SearchableSelect
                  value={form.customer_id}
                  onChange={val => handleCustomerSelect(val)}
                  options={customers.map(c => ({ value: c.id, label: c.company_name }))}
                  placeholder="Select customer"
                  required
                  className="flex-1"
                />

                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm font-medium text-sm"
                  title="Add new customer"
                >
                  <Plus size={14} />
                  
                </button>

              </div>
            </div>


            {/* Contact Name */}
            <div className="form-group">

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2">

                <SearchableSelect
                  value={form.contact_id || form.contact_name}
                  onChange={(val, opt) => handleContactSelect(opt || val)}
                  onDisabledClick={() => {
                    if (!form.customer_id) {
                      toast.error('Please select a customer first');
                    }
                  }}
                  options={contacts.map(c => ({
                    value: c.id,
                    label: c.contact_name,
                    subtext: c.phone ? `Phone: ${c.phone}` : (c.email ? c.email : ''),
                    id: c.id,
                    contact_name: c.contact_name,
                    phone: c.phone || '',
                    email: c.email || ''
                  }))}
                  allowCustom={true}
                  placeholder={!form.customer_id ? 'Select customer first' : (contactsLoading ? 'Loading contacts...' : 'Select or type contact')}
                  disabled={!form.customer_id || contactsLoading}
                  required
                  className="flex-1"
                  emptyMessage={!form.customer_id ? 'Please select a customer first' : (contactsLoading ? 'Loading contacts...' : 'No contacts found (you can type a name or click +)')}
                />

                <button
                  type="button"
                  disabled={!form.customer_id}
                  onClick={() => {
                    if (!form.customer_id) {
                      toast.error('Please select a customer first');
                      return;
                    }
                    setIsContactModalOpen(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={form.customer_id ? "Add new contact for this customer" : "Please select a customer first"}
                >
                  <Plus size={14} />
                </button>

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
                value={
                  form.expected_close_date
                }
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

              <SearchableSelect
                value={form.actual_scheduled_week}
                onChange={val => setForm(p => ({ ...p, actual_scheduled_week: val }))}
                options={WEEKS}
                placeholder="Select week"
              />

            </div>


            {/* Re-Scheduled Week */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Re-Scheduled Week
              </label>

              <SearchableSelect
                value={form.rescheduled_week}
                onChange={val => setForm(p => ({ ...p, rescheduled_week: val }))}
                options={WEEKS}
                placeholder="Select week"
              />

            </div>


            {/* Lead Type */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Type
              </label>

              <SearchableSelect
                value={form.lead_type}
                onChange={val => setForm(p => ({ ...p, lead_type: val }))}
                options={LEAD_TYPES}
                placeholder="Select lead type"
              />

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
                name="estimated_value"
                value={
                  form.estimated_value
                }
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

              <SearchableSelect
                value={form.pipeline}
                onChange={val => setForm(p => ({ ...p, pipeline: val }))}
                options={['Standard Pipeline']}
                placeholder="Select pipeline"
                required
              />

            </div>


            {/* Lead Stage */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Stages
                <span className="text-red-500"> *</span>
              </label>

              <SearchableSelect
                value={form.stage_id}
                onChange={val => setForm(p => ({ ...p, stage_id: val }))}
                options={stages.map(s => ({ value: String(s.id), label: s.name }))}
                placeholder="Select stage"
                required
              />

            </div>


            {/* Deal Source */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Source
              </label>

              <SearchableSelect
                value={form.source}
                onChange={val => setForm(p => ({ ...p, source: val }))}
                options={Object.entries(SOURCES).map(([k, l]) => ({ value: k, label: l }))}
                placeholder="Select deal source"
              />

            </div>


            {/* Lead Domain */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain
                <span className="text-red-500"> *</span>
              </label>

              <SearchableSelect
                value={form.domain_id}
                onChange={val => handleLeadDomainChange(val)}
                options={domains.map(d => ({ value: d.id, label: d.name }))}
                placeholder="Select domain"
                required
              />

            </div>


            {/* Lead Owner */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Owner
                <span className="text-red-500"> *</span>
              </label>

              {isAdmin ? (
                <SearchableSelect
                  value={form.assigned_to}
                  onChange={val => setForm(p => ({ ...p, assigned_to: val }))}
                  options={users.map(u => ({ value: u.id, label: u.name }))}
                  placeholder="Select lead owner"
                  required
                />
              ) : (
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  readOnly
                  title="Lead Owner is set to your user account"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-100 text-gray-700 cursor-not-allowed select-none focus:outline-none"
                />
              )}

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
                Select Product (Domain & Sub Domain auto-fill), or select Domain → Sub Domain → Product
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
                      Product Name *
                    </th>

                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Domain *
                    </th>

                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Sub Domain *
                    </th>

                    <th className="text-left px-3 py-3 text-sm font-semibold text-gray-700">
                      Product Category *
                    </th>

                    <th className="w-12"></th>

                  </tr>

                </thead>


                <tbody>

                  {form.products.map(
                    (product, index) => {
                      const rowSubdomains = getRowSubdomains(product);
                      const { filtered, others, isFiltered } = getProductOptions(product);

                      const productNameOptions = isFiltered
                        ? [
                            ...filtered.map(p => ({ value: p.id, label: p.name })),
                            ...others.map(p => ({
                              value: p.id,
                              label: `${p.name}${p.domain_name ? ` (${p.domain_name})` : ''}`,
                              group: '── All Other Products ──'
                            }))
                          ]
                        : allProducts.map(p => ({ value: p.id, label: p.name }));

                      return (

                      <tr
                        key={index}
                        className="border-t"
                      >

                        {/* 1. Product Name */}

                        <td className="px-2 py-2">

                          <SearchableSelect
                            size="sm"
                            value={product.product_id}
                            onChange={val => handleProductNameChange(index, val)}
                            options={productNameOptions}
                            placeholder="Select product"
                            required
                          />

                        </td>


                        {/* 2. Product Domain */}

                        <td className="px-2 py-2">

                          <SearchableSelect
                            size="sm"
                            value={product.domain_id}
                            onChange={val => handleProductDomainChange(index, val)}
                            options={domains.map(d => ({ value: d.id, label: d.name }))}
                            placeholder="Select domain"
                            required
                          />

                        </td>


                        {/* 3. Product Sub Domain */}

                        <td className="px-2 py-2">

                          <SearchableSelect
                            size="sm"
                            value={product.subdomain_id}
                            onChange={val => handleProductSubdomainChange(index, val)}
                            options={rowSubdomains.map(s => ({ value: s.id, label: s.name }))}
                            placeholder="Select sub domain"
                            required
                          />

                        </td>


                        {/* 4. Product Category */}

                        <td className="px-2 py-2">

                          <SearchableSelect
                            size="sm"
                            value={product.category}
                            onChange={val => handleProductChange(index, 'category', val)}
                            options={CATEGORIES}
                            placeholder="Select category"
                            required
                          />

                        </td>


                        {/* Delete */}

                        <td className="px-2 py-2">

                          <button
                            type="button"
                            onClick={() =>
                              removeProductRow(
                                index
                              )
                            }
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remove product"
                          >
                            <Trash2 size={16} />
                          </button>

                        </td>

                      </tr>

                    );
                  })}
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
            rows={5}
            placeholder="Requirements and notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-3 resize-y"
          />

        </div>


        {/* ================================================= */}
        {/* ON HOLD REASON */}
        {/* ================================================= */}

        <div className="border-t p-6">

          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            On Hold Reason
          </h2>

          <textarea
            name="on_hold_reason"
            value={form.on_hold_reason}
            onChange={handleChange}
            rows={4}
            placeholder="Enter reason if the lead is put on hold..."
            className="w-full border border-gray-300 rounded-lg px-3 py-3 resize-y"
          />

        </div>


        {/* Footer */}

        <div className="border-t px-6 py-4 flex justify-end gap-3">

          <button
            type="button"
            onClick={() =>
              navigate('/leads')
            }
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
              ? 'Creating...'
              : 'Create Lead'}
          </button>

        </div>

      </form>

      {/* ================================================= */}
      {/* QUICK NEW CUSTOMER MODAL */}
      {/* ================================================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">New Customer</h3>
                  <p className="text-xs text-gray-500">Create customer and immediately select in this lead</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCustomerSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Company Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Company Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Acme Technologies Pvt Ltd"
                      value={newCustomerForm.company_name}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Industry
                    </label>
                    <SearchableSelect
                      size="sm"
                      value={newCustomerForm.industry}
                      onChange={val => setNewCustomerForm(prev => ({ ...prev, industry: val }))}
                      options={INDUSTRIES}
                      placeholder="Select industry"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Company Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={newCustomerForm.phone}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Company Email
                    </label>
                    <input
                      type="email"
                      placeholder="info@company.com"
                      value={newCustomerForm.email}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="text"
                      placeholder="https://company.com"
                      value={newCustomerForm.website}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chennai"
                      value={newCustomerForm.city}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tamil Nadu"
                      value={newCustomerForm.state}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Contact Details */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Primary Contact (Optional)</h4>
                  <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Auto-selects for lead</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/70">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={newCustomerForm.contact_name}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, contact_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Procurement Head"
                      value={newCustomerForm.contact_designation}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, contact_designation: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={newCustomerForm.contact_phone}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      placeholder="contact@company.com"
                      value={newCustomerForm.contact_email}
                      onChange={e => setNewCustomerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes about customer..."
                  value={newCustomerForm.notes}
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customerSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {customerSaving && <Loader2 size={16} className="animate-spin" />}
                  {customerSaving ? 'Creating Customer...' : 'Create & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* QUICK NEW CONTACT MODAL */}
      {/* ================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">New Contact</h3>
                  <p className="text-xs text-gray-500">
                    Add contact for {customers.find(c => String(c.id) === String(form.customer_id))?.company_name || 'selected customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Ramesh Babu"
                  value={newContactForm.contact_name}
                  onChange={e => setNewContactForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical Director"
                  value={newContactForm.designation}
                  onChange={e => setNewContactForm(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={newContactForm.phone}
                  onChange={e => setNewContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="contact@example.com"
                  value={newContactForm.email}
                  onChange={e => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contactSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {contactSaving && <Loader2 size={16} className="animate-spin" />}
                  {contactSaving ? 'Adding Contact...' : 'Add & Select Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}