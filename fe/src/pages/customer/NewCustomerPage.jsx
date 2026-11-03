import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI, usersAPI, customerTypesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin } from 'lucide-react';
import MapPicker from '../../components/common/MapPicker';
import CityStateSelect from '../../components/common/CityStateSelect';

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

const CATEGORIES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'Opportunity Based',
  'A+'
];

const KAM_CATEGORIES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'A+'
];

const emptyForm = {
  company_name: '',
  email: '',
  phone: '',
  alternate_phone: '',
  industry: '',
  customer_type_id: '',
  website: '',

  category: '',
  is_kam: '',
  kam_category: '',

  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',

  assigned_to: '',

  latitude: '',
  longitude: '',

  notes: ''
};

export default function NewCustomerPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [users, setUsers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    customerTypesAPI
      .getAll()
      .then(res => {
        setCustomerTypes(res.data || []);
      })
      .catch(() => {
        toast.error('Failed to load customer types');
      });
  }, []);

  useEffect(() => {
    if (isManager) {
      usersAPI
        .getAll({ limit: 100 })
        .then(res => {
          setUsers(res.data || []);
        })
        .catch(() => {});
    }
  }, [isManager]);

  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!form.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }

    try {
      setLoading(true);

      await customersAPI.create(form);

      toast.success('Customer created successfully');

      navigate('/customers');
    } catch (error) {
      toast.error(error?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animate-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/customers')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div>
          <div
            style={{
              fontSize: 13,
              color: '#64748B',
              fontWeight: 500
            }}
          >
            Customer Directory
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#111827',
              margin: '2px 0 0'
            }}
          >
            Add New Customer
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer Information */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 18
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F1F5F9',
              fontSize: 15,
              fontWeight: 700,
              color: '#111827'
            }}
          >
            Customer Information
          </div>

          <div
            style={{
              padding: 20
            }}
          >
            <div className="form-grid">

              {/* Company Name */}
              <div
                className="form-group"
                style={{ gridColumn: '1/-1' }}
              >
                <label>
                  Company Name <span style={{ color: '#EF4444' }}>*</span>
                </label>

                <input
                  required
                  value={form.company_name}
                  onChange={e =>
                    updateField('company_name', e.target.value)
                  }
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  value={form.email}
                  onChange={e =>
                    updateField('email', e.target.value)
                  }
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Phone</label>

                <input
                  value={form.phone}
                  onChange={e =>
                    updateField('phone', e.target.value)
                  }
                />
              </div>

              {/* Alternate Phone */}
              <div className="form-group">
                <label>Alternate Phone</label>

                <input
                  value={form.alternate_phone}
                  onChange={e =>
                    updateField('alternate_phone', e.target.value)
                  }
                />
              </div>

              {/* Website */}
              <div className="form-group">
                <label>Website</label>

                <input
                  type="url"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={e =>
                    updateField('website', e.target.value)
                  }
                />
              </div>

              {/* Industry */}
              <div className="form-group">
                <label>Industry</label>

                <select
                  value={form.industry}
                  onChange={e =>
                    updateField('industry', e.target.value)
                  }
                >
                  <option value="">Select Industry</option>

                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Type */}
              <div className="form-group">
                <label>Customer Type</label>

                <select
                  value={form.customer_type_id}
                  onChange={e =>
                    updateField(
                      'customer_type_id',
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select Customer Type
                  </option>

                  {customerTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="form-group">
                <label>Category</label>

                <select
                  value={form.category}
                  onChange={e =>
                    updateField('category', e.target.value)
                  }
                >
                  <option value="">Select Category</option>

                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Is KAM */}
              <div className="form-group">
                <label>Is KAM</label>

                <select
                  value={form.is_kam}
                  onChange={e => {
                    const value = e.target.value;

                    setForm(prev => ({
                      ...prev,
                      is_kam: value,
                      kam_category:
                        value === 'No'
                          ? ''
                          : prev.kam_category
                    }));
                  }}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* KAM Category */}
              <div className="form-group">
                <label>KAM Category</label>

                <select
                  value={form.kam_category}
                  disabled={form.is_kam !== 'Yes'}
                  onChange={e =>
                    updateField(
                      'kam_category',
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select KAM Category
                  </option>

                  {KAM_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign To */}
              {isManager && (
                <div className="form-group">
                  <label>Assign To</label>

                  <select
                    value={form.assigned_to}
                    onChange={e =>
                      updateField(
                        'assigned_to',
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Assign to self
                    </option>

                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 18
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F1F5F9',
              fontSize: 15,
              fontWeight: 700,
              color: '#111827'
            }}
          >
            Billing Address
          </div>

          <div style={{ padding: 20 }}>
            <div className="form-grid">

              {/* Billing Address Line 1 */}
              <div
                className="form-group"
                style={{ gridColumn: '1/-1' }}
              >
                <label>Billing Address Line 1</label>

                <input
                  placeholder="Street address"
                  value={form.address_line1}
                  onChange={e =>
                    updateField(
                      'address_line1',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* Billing Address Line 2 */}
              <div
                className="form-group"
                style={{ gridColumn: '1/-1' }}
              >
                <label>Billing Address Line 2</label>

                <input
                  placeholder="Apartment, suite, landmark, etc."
                  value={form.address_line2}
                  onChange={e =>
                    updateField(
                      'address_line2',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* State / City */}
              <div
                className="form-group"
                style={{ gridColumn: '1/-1' }}
              >
                <CityStateSelect
                  state={form.state}
                  city={form.city}
                  onStateChange={value =>
                    updateField('state', value)
                  }
                  onCityChange={value =>
                    updateField('city', value)
                  }
                />
              </div>

              {/* Pincode */}
              <div className="form-group">
                <label>Billing Pincode</label>

                <input
                  value={form.pincode}
                  onChange={e =>
                    updateField(
                      'pincode',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* Country */}
              <div className="form-group">
                <label>Billing Country</label>

                <input
                  value={form.country}
                  onChange={e =>
                    updateField(
                      'country',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* Map */}
              <div
                className="form-group"
                style={{ gridColumn: '1/-1' }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <MapPin size={13} />
                  Billing Location
                </label>

                <MapPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={(lat, lng) =>
                    setForm(prev => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng
                    }))
                  }
                  height={280}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Notes */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 18
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F1F5F9',
              fontSize: 15,
              fontWeight: 700,
              color: '#111827'
            }}
          >
            Notes
          </div>

          <div style={{ padding: 20 }}>
            <div className="form-group">
              <label>Notes</label>

              <textarea
                rows={5}
                value={form.notes}
                onChange={e =>
                  updateField('notes', e.target.value)
                }
                placeholder="Enter customer notes..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/customers')}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}