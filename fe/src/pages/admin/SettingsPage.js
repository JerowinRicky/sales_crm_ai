import React, { useState, useEffect, useCallback } from "react";
import {
  leadsAPI,
  stagesAPI,
  settingsAPI,
  masterAPI,
  customerTypesAPI,
  productMasterAPI,
  customersAPI,
  customerGroupsAPI,
  contactsAPI,
  usersAPI,
} from "../../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  X,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Layers,
  MapPin,
  Map,
  Package,
  Building2,
  Users,
  UserRound,
  Search,
  Eye,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ConfirmModal from "../../components/common/ConfirmModal";
import MapPicker from "../../components/common/MapPicker";
import CityStateSelect from "../../components/common/CityStateSelect";
import { useAuth } from "../../context/AuthContext";

const emptyStage = {
  name: "",
  color: "#2563eb",
  description: "",
  is_closed: false,
  is_won: false,
};

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

const CATEGORIES = ["A", "B", "C", "D", "E", "Opportunity Based", "A+"];
const KAM_CATEGORIES = ["A", "B", "C", "D", "E", "A+"];

const emptyCustomerForm = {
  company_name: "",
  email: "",
  phone: "",
  alternate_phone: "",
  industry: "",
  customer_type_id: "",
  group_id: "",
  website: "",
  category: "",
  is_kam: "",
  kam_category: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  assigned_to: "",
  latitude: "",
  longitude: "",
  notes: "",
};

const emptyContactForm = {
  contact_name: "",
  phone: "",
  email: "",
  alternate_email: "",
  customer_id: "",
  designation: "",
  contact_owner: "",
  description: "",
};

/* ---------------------------------------------------------
 * Response normalizer — makes any API shape safe to read
 * --------------------------------------------------------- */
function unwrap(res) {
  if (!res) return null;
  if (res.data?.data !== undefined) return res.data.data;
  if (res.data !== undefined) return res.data;
  return res;
}

function unwrapList(res) {
  const body = unwrap(res);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

function unwrapTotal(res, fallbackList) {
  const body = unwrap(res);
  if (typeof res?.total === "number") return res.total;
  if (typeof body?.total === "number") return body.total;
  if (typeof res?.data?.total === "number") return res.data.total;
  return fallbackList.length;
}

export default function SettingsPage() {
  const [tab, setTab] = useState("stages");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirmModal = ({ title, message, onConfirm }) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
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

  return (
    <div className="p-6">
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pipeline stages, location master data, geofence config
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {[
          ["stages", Layers, "Lead Stages"],
          ["locations", Map, "City & State Master"],
          ["customer", Building2, "Customer"],
          ["customer-types", Layers, "Customer Types"],
          ["products", Package, "Products"],
          ["geofence", MapPin, "Geofence"],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition ${
              tab === key
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "stages" && (
        <StagesTab
          openConfirmModal={openConfirmModal}
          closeConfirmModal={closeConfirmModal}
          setConfirmLoading={setConfirmLoading}
        />
      )}

      {tab === "locations" && (
        <LocationsTab
          openConfirmModal={openConfirmModal}
          closeConfirmModal={closeConfirmModal}
          setConfirmLoading={setConfirmLoading}
        />
      )}

      {tab === "customer" && (
        <CustomerTab
          openConfirmModal={openConfirmModal}
          closeConfirmModal={closeConfirmModal}
          setConfirmLoading={setConfirmLoading}
        />
      )}

      {tab === "customer-types" && (
        <CustomerTypesTab
          openConfirmModal={openConfirmModal}
          closeConfirmModal={closeConfirmModal}
          setConfirmLoading={setConfirmLoading}
        />
      )}

      {tab === "products" && (
        <ProductsTab
          openConfirmModal={openConfirmModal}
          closeConfirmModal={closeConfirmModal}
          setConfirmLoading={setConfirmLoading}
        />
      )}

      {tab === "geofence" && <GeofenceTab />}
    </div>
  );
}

/* =========================================================
 * STAGES TAB
 * ========================================================= */
function StagesTab({ openConfirmModal, closeConfirmModal, setConfirmLoading }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStage, setEditStage] = useState(null);
  const [form, setForm] = useState(emptyStage);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await leadsAPI.getStages();
      setStages(unwrapList(r));
    } catch (e) {
      toast.error("Failed to load stages");
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditStage(null);
    setForm(emptyStage);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditStage(s);
    setForm({
      name: s.name,
      color: s.color,
      description: s.description || "",
      is_closed: !!s.is_closed,
      is_won: !!s.is_won,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Name required");
      return;
    }
    try {
      if (editStage) {
        await stagesAPI.update(editStage.id, form);
        toast.success("Stage updated");
      } else {
        await stagesAPI.create(form);
        toast.success("Stage created");
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = (s) => {
    openConfirmModal({
      title: "Delete Stage",
      message: `Delete "${s.name}"? Only works if no leads are in this stage.`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await stagesAPI.remove(s.id);
          toast.success("Deleted");
          load();
        } catch (e) {
          toast.error(e.message);
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  const move = async (index, dir) => {
    const reordered = [...stages];
    const target = index + dir;
    if (target < 0 || target >= reordered.length) return;
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    setStages(reordered);
    try {
      await stagesAPI.reorder(reordered.map((s) => s.id));
      toast.success("Order saved");
    } catch (e) {
      toast.error("Failed to save order");
      load();
    }
  };

  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Lead Pipeline Stages
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Use arrows to reorder. Each click saves immediately to the database.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Stage
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Layers size={42} className="text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No stages yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add your first pipeline stage to get started
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stages.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  title="Move up"
                  className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={i === stages.length - 1}
                  onClick={() => move(i, 1)}
                  title="Move down"
                  className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: s.color }}
              />

              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">
                  {s.name}
                </div>
                {s.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {s.description}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {s.is_won && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                    Won
                  </span>
                )}
                {s.is_closed && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                    Closed
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  title="Edit"
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s)}
                  title="Delete"
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editStage ? "Edit Stage" : "New Stage"}
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
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Stage Name *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Site Visit Scheduled"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Colour
                    </label>
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="w-full h-[42px] p-1 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>
                    <input
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-6 mt-1">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={form.is_closed}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          is_closed: e.target.checked,
                        }))
                      }
                    />
                    Closed (ends pipeline)
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={form.is_won}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, is_won: e.target.checked }))
                      }
                    />
                    Counts as Won
                  </label>
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
                  {editStage ? "Update" : "Create"} Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * LOCATIONS TAB
 * ========================================================= */
function LocationsTab({
  openConfirmModal,
  closeConfirmModal,
  setConfirmLoading,
}) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selState, setSelState] = useState("");
  const [newState, setNewState] = useState({ name: "", code: "" });
  const [newCity, setNewCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [cl, setCL] = useState(false);

  useEffect(() => {
    masterAPI
      .getStates()
      .then((r) => setStates(unwrapList(r)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selState) {
      setCities([]);
      return;
    }
    setCL(true);
    masterAPI
      .getCities({ state_id: selState })
      .then((r) => setCities(unwrapList(r)))
      .finally(() => setCL(false));
  }, [selState]);

  const addState = async (e) => {
    e.preventDefault();
    if (!newState.name.trim()) return;
    try {
      await masterAPI.createState(newState);
      toast.success("State added");
      setNewState({ name: "", code: "" });
      masterAPI.getStates().then((r) => setStates(unwrapList(r)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const addCity = async (e) => {
    e.preventDefault();
    if (!newCity.trim() || !selState) return;
    try {
      await masterAPI.createCity({ name: newCity, state_id: selState });
      toast.success("City added");
      setNewCity("");
      masterAPI
        .getCities({ state_id: selState })
        .then((r) => setCities(unwrapList(r)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeState = (id) => {
    openConfirmModal({
      title: "Delete State",
      message: "Delete state and all its cities?",
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await masterAPI.deleteState(id);
          toast.success("Deleted");
          setSelState("");
          masterAPI.getStates().then((r) => setStates(unwrapList(r)));
        } catch (e) {
          toast.error(e.message);
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  const removeCity = async (id) => {
    try {
      await masterAPI.deleteCity(id);
      setCities((p) => p.filter((c) => c.id !== id));
      toast.success("Removed");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">States</h2>

        <form onSubmit={addState} className="flex gap-2 mb-4">
          <input
            value={newState.name}
            onChange={(e) =>
              setNewState((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="State name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={newState.code}
            onChange={(e) =>
              setNewState((f) => ({ ...f, code: e.target.value }))
            }
            placeholder="Code"
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={14} />
            Add
          </button>
        </form>

        {loading ? (
          <div className="text-gray-400 text-center py-5">Loading...</div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto flex flex-col gap-2">
            {states.length === 0 && (
              <div className="text-gray-400 text-sm text-center py-5">
                No states yet
              </div>
            )}
            {states.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelState(String(s.id))}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer border transition ${
                  selState === String(s.id)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                }`}
              >
                <div>
                  <span className="font-medium text-sm text-gray-900">
                    {s.name}
                  </span>
                  {s.code && (
                    <span className="text-xs text-gray-400 ml-2">{s.code}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeState(s.id);
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Cities
          {selState && (
            <span className="text-xs text-gray-400 ml-2 font-normal">
              — {states.find((s) => String(s.id) === selState)?.name || ""}
            </span>
          )}
        </h2>

        {!selState ? (
          <div className="text-gray-400 text-sm py-5">
            Select a state to manage its cities
          </div>
        ) : (
          <>
            <form onSubmit={addCity} className="flex gap-2 mb-4">
              <input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="New city name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={14} />
                Add
              </button>
            </form>

            {cl ? (
              <div className="text-gray-400 text-center py-5">Loading...</div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto flex flex-col gap-2">
                {cities.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-5">
                    No cities yet — add above
                  </div>
                )}
                {cities.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg"
                  >
                    <span className="text-sm text-gray-800">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCity(c.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * CUSTOMER TAB — master-detail
 * ========================================================= */
function CustomerTab({
  openConfirmModal,
  closeConfirmModal,
  setConfirmLoading,
}) {
  const { isManager } = useAuth();
  const [subTab, setSubTab] = useState("customers");

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewContact, setViewContact] = useState(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [editContact, setEditContact] = useState(null);

  const limit = 15;

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();

      const res = await customersAPI.getAll(params);
      const list = unwrapList(res);
      setCustomers(list);
      setTotal(unwrapTotal(res, list));

      setSelectedCustomer((prev) => {
        if (!list.length) return null;
        const stillThere = list.find((c) => c.id === prev?.id);
        return stillThere || list[0];
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const loadContacts = useCallback(async (customerId) => {
    if (!customerId) {
      setContacts([]);
      return;
    }
    setContactsLoading(true);
    try {
      const res = await contactsAPI.getAll({
        customer_id: customerId,
        page: 1,
        limit: 100,
      });
      setContacts(unwrapList(res));
    } catch (e) {
      console.error(e);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomer?.id) {
      loadContacts(selectedCustomer.id);
    } else {
      setContacts([]);
    }
  }, [selectedCustomer?.id, loadContacts]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const refreshSelected = async (id) => {
    if (!id) return;
    try {
      const r = await customersAPI.getById(id);
      const fresh = unwrap(r);
      if (fresh && fresh.id) {
        setSelectedCustomer(fresh);
      }
    } catch (err) {
      console.error("refreshSelected:", err);
    }
  };

  const openNewCustomer = () => {
    setEditCustomer(null);
    setShowCustomerModal(true);
  };

  const openEditCustomer = (customer) => {
    setEditCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleCustomerSaved = (savedCustomer) => {
    const idToSelect =
      (savedCustomer && savedCustomer.id) ||
      (editCustomer && editCustomer.id) ||
      null;

    setShowCustomerModal(false);
    setEditCustomer(null);

    loadCustomers();

    if (idToSelect) {
      setTimeout(() => {
        refreshSelected(idToSelect);
      }, 300);
    }
  };

  const handleDeleteCustomer = (customer) => {
    openConfirmModal({
      title: "Deactivate Customer",
      message: `Are you sure you want to deactivate "${customer.company_name}"?`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await customersAPI.remove(customer.id);
          toast.success("Customer deactivated");
          if (selectedCustomer?.id === customer.id) {
            setSelectedCustomer(null);
          }
          loadCustomers();
        } catch (e) {
          toast.error(
            (e.response && e.response.data && e.response.data.message) ||
              e.message ||
              "Failed to deactivate customer"
          );
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  const openNewContact = () => {
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    setEditContact(null);
    setShowContactModal(true);
  };

  const openEditContact = (contact) => {
    setEditContact(contact);
    setShowContactModal(true);
  };

  const openViewContact = async (contact) => {
    try {
      const res = await contactsAPI.getById(contact.id);
      const fresh = unwrap(res);
      setViewContact(fresh || contact);
    } catch (e) {
      setViewContact(contact);
    }
  };

  const handleContactSaved = () => {
    setShowContactModal(false);
    setEditContact(null);
    if (selectedCustomer?.id) {
      loadContacts(selectedCustomer.id);
    }
  };

  const handleDeleteContact = (contact) => {
    openConfirmModal({
      title: "Delete Contact",
      message: `Are you sure you want to delete "${contact.contact_name}"?`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await contactsAPI.remove(contact.id);
          toast.success("Contact deleted");
          if (selectedCustomer?.id) {
            loadContacts(selectedCustomer.id);
          }
        } catch (e) {
          toast.error(
            (e.response && e.response.data && e.response.data.message) ||
              "Failed to delete contact"
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
    <div className="space-y-4">
      {/* Sub-tabs: Customers | Group */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setSubTab("customers")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            subTab === "customers"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Building2 size={16} />
          Customers
        </button>
        <button
          type="button"
          onClick={() => setSubTab("groups")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            subTab === "groups"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users size={16} />
          Group
        </button>
      </div>

      {subTab === "groups" ? (
        <CustomerGroupsSubTab
          openConfirmModal={openConfirmModal}
          closeConfirmModal={closeConfirmModal}
          setConfirmLoading={setConfirmLoading}
        />
      ) : (
        <div className="flex gap-5 items-start">
      {/* LEFT: Customers */}
      <div className="w-[340px] shrink-0 bg-white border rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-230px)]">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Customers</h2>
            <p className="text-xs text-gray-500 mt-0.5">{total} total</p>
          </div>
          <button
            type="button"
            onClick={openNewCustomer}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        <div className="p-3 border-b">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search customers..."
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500 px-4">
              <Building2 size={28} className="text-gray-300 mx-auto mb-2" />
              No customers found
            </div>
          ) : (
            customers.map((c) => {
              const isActive = selectedCustomer?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${
                    isActive
                      ? "bg-blue-50 border-l-2 border-l-blue-600"
                      : "hover:bg-gray-50 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                        isActive ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                      <Building2
                        size={15}
                        className={isActive ? "text-blue-600" : "text-gray-500"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-blue-700" : "text-gray-900"
                        }`}
                      >
                        {c.company_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {c.email || c.phone || c.city || "—"}
                      </div>
                      {c.group_name && (
                        <span className="inline-block mt-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 truncate max-w-full">
                          Group: {c.group_name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded border disabled:opacity-40 hover:bg-white"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded border disabled:opacity-40 hover:bg-white"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Contacts */}
      <div className="flex-1 min-w-0">
        {!selectedCustomer ? (
          <div className="bg-white border rounded-lg flex flex-col items-center justify-center py-20">
            <Building2 size={42} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">
              Select a customer
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Choose a customer from the left to view their contacts
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Customer Header */}
            <div className="px-5 py-4 border-b bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {selectedCustomer.company_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                      {selectedCustomer.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} />
                          {selectedCustomer.email}
                        </span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.group_name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-200">
                          Group: {selectedCustomer.group_name}
                        </span>
                      )}
                      {selectedCustomer.industry && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {selectedCustomer.industry}
                        </span>
                      )}
                      {selectedCustomer.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {selectedCustomer.city}
                          {selectedCustomer.state
                            ? `, ${selectedCustomer.state}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    title="View"
                    onClick={async () => {
                      try {
                        const r = await customersAPI.getById(
                          selectedCustomer.id
                        );
                        const fresh = unwrap(r);
                        setViewCustomer(fresh || selectedCustomer);
                      } catch {
                        setViewCustomer(selectedCustomer);
                      }
                    }}
                    className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEditCustomer(selectedCustomer)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200"
                  >
                    <Pencil size={16} />
                  </button>
                  {isManager && (
                    <button
                      type="button"
                      title="Deactivate"
                      onClick={() => handleDeleteCustomer(selectedCustomer)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-gray-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Contacts Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound size={17} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Contacts ({contacts.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={openNewContact}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
              >
                <Plus size={14} />
                Add Contact
              </button>
            </div>

            {/* Contacts List */}
            {contactsLoading ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Loading contacts...
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <UserRound size={36} className="text-gray-300 mb-3" />
                <h4 className="text-sm font-medium text-gray-700">
                  No contacts yet
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Add the first contact for this customer
                </p>
                <button
                  type="button"
                  onClick={openNewContact}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add Contact
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Contact
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Phone
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Email
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Designation
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Owner
                      </th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                              <UserRound size={14} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {contact.contact_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Phone size={13} className="text-gray-400" />
                            {contact.phone || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Mail size={13} className="text-gray-400" />
                            <span className="truncate max-w-[180px]">
                              {contact.email || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {contact.designation || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {contact.contact_owner_name || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="View"
                              onClick={() => openViewContact(contact)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEditContact(contact)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => handleDeleteContact(contact)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCustomerModal && (
        <CustomerFormModal
          isOpen={showCustomerModal}
          customer={editCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditCustomer(null);
          }}
          onSaved={handleCustomerSaved}
        />
      )}

      {showContactModal && (
        <ContactFormModal
          isOpen={showContactModal}
          contact={editContact}
          defaultCustomerId={selectedCustomer?.id}
          onClose={() => {
            setShowContactModal(false);
            setEditContact(null);
          }}
          onSaved={handleContactSaved}
        />
      )}

      {viewCustomer && (
        <ViewCustomerModal
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
          onEdit={() => {
            const c = viewCustomer;
            setViewCustomer(null);
            openEditCustomer(c);
          }}
        />
      )}

      {viewContact && (
        <ViewContactModal
          contact={viewContact}
          onClose={() => setViewContact(null)}
          onEdit={() => {
            const c = viewContact;
            setViewContact(null);
            openEditContact(c);
          }}
        />
      )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * CUSTOMER FORM MODAL
 * ========================================================= */
function CustomerFormModal({ isOpen, customer, onClose, onSaved }) {
  const { isManager } = useAuth();
  const isEdit = !!customer?.id;

  const [form, setForm] = useState(emptyCustomerForm);
  const [users, setUsers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    customerTypesAPI
      .getAll()
      .then((res) => setCustomerTypes(unwrapList(res)))
      .catch(() => toast.error("Failed to load customer types"));

    customerGroupsAPI
      .getAll()
      .then((res) => setCustomerGroups(unwrapList(res)))
      .catch(() => {});

    if (isManager) {
      usersAPI
        .getAll({ limit: 100 })
        .then((res) => setUsers(unwrapList(res)))
        .catch(() => {});
    }
  }, [isOpen, isManager]);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit) {
      setInitialLoading(true);
      customersAPI
        .getById(customer.id)
        .then((res) => {
          const c = unwrap(res) || {};
          setForm({
            company_name: c.company_name || "",
            email: c.email || "",
            phone: c.phone || "",
            alternate_phone: c.alternate_phone || "",
            industry: c.industry || "",
            customer_type_id: c.customer_type_id || "",
            group_id: c.group_id || "",
            website: c.website || "",
            category: c.category || "",
            is_kam: c.is_kam || "",
            kam_category: c.kam_category || "",
            address_line1: c.address_line1 || "",
            address_line2: c.address_line2 || "",
            city: c.city || "",
            state: c.state || "",
            country: c.country || "India",
            pincode: c.pincode || "",
            assigned_to: c.assigned_to || "",
            latitude: c.latitude || "",
            longitude: c.longitude || "",
            notes: c.notes || "",
          });
        })
        .catch(() => toast.error("Failed to load customer"))
        .finally(() => setInitialLoading(false));
    } else {
      setForm(emptyCustomerForm);
    }
  }, [isOpen, isEdit, customer?.id]);

  // Delay mounting MapPicker until the modal has fully painted
  useEffect(() => {
    if (!isOpen || initialLoading) {
      setShowMap(false);
      return;
    }
    const t = setTimeout(() => setShowMap(true), 150);
    return () => clearTimeout(t);
  }, [isOpen, initialLoading]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }

    try {
      setLoading(true);

      let res;
      if (isEdit) {
        res = await customersAPI.update(customer.id, form);
      } else {
        res = await customersAPI.create(form);
      }

      const fresh = unwrap(res);
      const savedId =
        (fresh && fresh.id) || customer?.id || null;

      toast.success(
        isEdit
          ? "Customer updated successfully"
          : "Customer created successfully"
      );

      setShowMap(false);
      // Safely close first, then pass the id
      onSaved?.({ id: savedId });
    } catch (error) {
      const msg =
        (error && error.message) ||
        (error && error.response && error.response.data &&
          error.response.data.message) ||
        `Failed to ${isEdit ? "update" : "create"} customer`;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit
                ? "Update customer details"
                : "Create a new customer account"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {initialLoading ? (
          <div className="py-20 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Customer Information */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Customer Information
              </h3>

              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.company_name}
                    onChange={(e) =>
                      updateField("company_name", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Alternate Phone
                  </label>
                  <input
                    value={form.alternate_phone}
                    onChange={(e) =>
                      updateField("alternate_phone", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Industry
                  </label>
                  <select
                    value={form.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Customer Type
                  </label>
                  <select
                    value={form.customer_type_id}
                    onChange={(e) =>
                      updateField("customer_type_id", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Customer Type</option>
                    {customerTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Group (Hierarchy)
                  </label>
                  <select
                    value={form.group_id || ""}
                    onChange={(e) =>
                      updateField(
                        "group_id",
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- No Group --</option>
                    {customerGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Is KAM
                  </label>
                  <select
                    value={form.is_kam}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        is_kam: value,
                        kam_category: value === "No" ? "" : prev.kam_category,
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    KAM Category
                  </label>
                  <select
                    value={form.kam_category}
                    disabled={form.is_kam !== "Yes"}
                    onChange={(e) =>
                      updateField("kam_category", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select KAM Category</option>
                    {KAM_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {isManager && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Assign To
                    </label>
                    <select
                      value={form.assigned_to}
                      onChange={(e) =>
                        updateField("assigned_to", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Assign to self</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Address */}
            <div className="border-t p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Billing Address
              </h3>

              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Billing Address Line 1
                  </label>
                  <input
                    placeholder="Street address"
                    value={form.address_line1}
                    onChange={(e) =>
                      updateField("address_line1", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Billing Address Line 2
                  </label>
                  <input
                    placeholder="Apartment, suite, landmark, etc."
                    value={form.address_line2}
                    onChange={(e) =>
                      updateField("address_line2", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <CityStateSelect
                    state={form.state}
                    city={form.city}
                    onStateChange={(v) => updateField("state", v)}
                    onCityChange={(v) => updateField("city", v)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pincode
                  </label>
                  <input
                    value={form.pincode}
                    onChange={(e) => updateField("pincode", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Country
                  </label>
                  <input
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin size={13} />
                    Billing Location
                  </label>
                  {showMap ? (
                    <MapPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={(lat, lng) =>
                        setForm((prev) => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                        }))
                      }
                      height={240}
                    />
                  ) : (
                    <div
                      style={{
                        height: 240,
                        width: "100%",
                        borderRadius: 8,
                        background: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        fontSize: 13,
                      }}
                    >
                      Loading map...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Notes
              </h3>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Enter customer notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                  ? "Update Customer"
                  : "Create Customer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * CONTACT FORM MODAL
 * ========================================================= */
function ContactFormModal({
  isOpen,
  contact,
  defaultCustomerId,
  onClose,
  onSaved,
}) {
  const isEdit = !!contact?.id;

  const [form, setForm] = useState(emptyContactForm);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const [customerRes, userRes] = await Promise.all([
          customersAPI.getAll({ page: 1, limit: 1000 }),
          usersAPI.getAll(),
        ]);
        setCustomers(unwrapList(customerRes));
        setUsers(unwrapList(userRes));
      } catch (error) {
        console.error(error);
        toast.error("Failed to load customers or users");
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit) {
      setInitialLoading(true);
      contactsAPI
        .getById(contact.id)
        .then((res) => {
          const c = unwrap(res);
          if (!c) {
            toast.error("Contact not found");
            onClose?.();
            return;
          }
          setForm({
            contact_name: c.contact_name || "",
            phone: c.phone || "",
            email: c.email || "",
            alternate_email: c.alternate_email || "",
            customer_id: c.customer_id ? String(c.customer_id) : "",
            designation: c.designation || "",
            contact_owner: c.contact_owner ? String(c.contact_owner) : "",
            description: c.description || "",
          });
        })
        .catch((err) => {
          toast.error(
            (err.response && err.response.data && err.response.data.message) ||
              err.message ||
              "Failed to load contact"
          );
          onClose?.();
        })
        .finally(() => setInitialLoading(false));
    } else {
      setForm({
        ...emptyContactForm,
        customer_id: defaultCustomerId ? String(defaultCustomerId) : "",
      });
    }
  }, [isOpen, isEdit, contact?.id, defaultCustomerId, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

      if (isEdit) {
        await contactsAPI.update(contact.id, {
          contact_name: form.contact_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          alternate_email: form.alternate_email.trim() || null,
          customer_id: form.customer_id,
          designation: form.designation.trim() || null,
          contact_owner: form.contact_owner || null,
          description: form.description.trim() || null,
        });
      } else {
        await contactsAPI.create(form);
      }

      toast.success(
        isEdit ? "Contact updated successfully" : "Contact created successfully"
      );
      onSaved?.();
    } catch (error) {
      console.error("Save contact error:", error);
      toast.error(
        (error.response && error.response.data && error.response.data.message) ||
          "Failed to save contact"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? "Edit Contact" : "New Contact"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit ? "Update contact information" : "Add a new contact"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {initialLoading ? (
          <div className="py-20 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleChange}
                    placeholder="Enter contact name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Additional Email
                  </label>
                  <input
                    type="email"
                    name="alternate_email"
                    value={form.alternate_email}
                    onChange={handleChange}
                    placeholder="Enter additional email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customer_id"
                    value={form.customer_id}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="Enter designation"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Owner <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="contact_owner"
                    value={form.contact_owner}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select owner</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                  ? "Update Contact"
                  : "Create Contact"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * VIEW CUSTOMER MODAL
 * ========================================================= */
function ViewCustomerModal({ customer, onClose, onEdit }) {
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowMap(true), 150);
    return () => clearTimeout(t);
  }, []);

  const hasCoords =
    customer?.latitude !== "" &&
    customer?.latitude != null &&
    customer?.longitude !== "" &&
    customer?.longitude != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {customer.company_name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Customer Details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-5">
            {[
              ["Email", customer.email],
              ["Phone", customer.phone],
              ["Alternate Phone", customer.alternate_phone],
              ["Website", customer.website],
              ["Customer Type", customer.customer_type],
              ["Group", customer.group_name],
              ["Industry", customer.industry],
              ["Category", customer.category],
              ["Is KAM", customer.is_kam],
              ["KAM Category", customer.kam_category],
              ["Assigned To", customer.assigned_to_name],
              [
                "Billing Location",
                `${customer.city || ""} ${customer.state || ""}`.trim(),
              ],
              ["Pincode", customer.pincode],
              ["Country", customer.country],
            ].map(([label, value]) =>
              value ? (
                <div key={label}>
                  <div className="text-sm text-gray-500 mb-1">{label}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {value}
                  </div>
                </div>
              ) : null
            )}
          </div>

          {customer.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <div className="border rounded-lg p-4 bg-gray-50 text-gray-700 whitespace-pre-wrap">
                {customer.notes}
              </div>
            </div>
          )}

          {(customer.address_line1 || customer.address_line2) && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Billing Address
              </h3>
              <div className="text-sm text-gray-600 leading-relaxed">
                {customer.address_line1}
                {customer.address_line2 && (
                  <>
                    <br />
                    {customer.address_line2}
                  </>
                )}
                {customer.city && (
                  <>
                    <br />
                    {customer.city}
                  </>
                )}
                {customer.state && <>, {customer.state}</>}
                {customer.pincode && <> - {customer.pincode}</>}
                {customer.country && (
                  <>
                    <br />
                    {customer.country}
                  </>
                )}
              </div>
            </div>
          )}

          {hasCoords && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Billing Location
              </h3>
              {showMap ? (
                <MapPicker
                  latitude={customer.latitude}
                  longitude={customer.longitude}
                  height={220}
                  onChange={() => {}} 
                  readOnly
                />
              ) : (
                <div
                  style={{
                    height: 220,
                    width: "100%",
                    borderRadius: 8,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  Loading map...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Customer
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * VIEW CONTACT MODAL  (NEW)
 * ========================================================= */
function ViewContactModal({ contact, onClose, onEdit }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <UserRound size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {contact.contact_name || "Contact"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Contact Details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-5">
            {[
              ["Contact Name", contact.contact_name],
              ["Phone", contact.phone],
              ["Email", contact.email],
              ["Additional Email", contact.alternate_email],
              ["Customer", contact.customer_name],
              ["Designation", contact.designation],
              ["Contact Owner", contact.contact_owner_name],
            ].map(([label, value]) =>
              value ? (
                <div key={label}>
                  <div className="text-sm text-gray-500 mb-1">{label}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {value}
                  </div>
                </div>
              ) : null
            )}
          </div>

          {contact.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Description
              </h3>
              <div className="border rounded-lg p-4 bg-gray-50 text-gray-700 whitespace-pre-wrap">
                {contact.description}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Contact
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * CUSTOMER TYPES TAB
 * ========================================================= */
function CustomerTypesTab({
  openConfirmModal,
  closeConfirmModal,
  setConfirmLoading,
}) {
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState("");
  const [editType, setEditType] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadCustomerTypes();
  }, []);

  const loadCustomerTypes = async () => {
    setLoading(true);
    try {
      const r = await customerTypesAPI.getAll();
      setCustomerTypes(unwrapList(r));
    } catch (e) {
      toast.error(e.message || "Failed to load customer types");
    }
    setLoading(false);
  };

  const addCustomerType = async (e) => {
    e.preventDefault();
    if (!newType.trim()) {
      toast.error("Customer type is required");
      return;
    }
    try {
      await customerTypesAPI.create({ type: newType.trim() });
      toast.success("Customer type added");
      setNewType("");
      loadCustomerTypes();
    } catch (e) {
      toast.error(e.message || "Failed to add customer type");
    }
  };

  const startEdit = (customerType) => {
    setEditType(customerType.id);
    setEditValue(customerType.type);
  };

  const cancelEdit = () => {
    setEditType(null);
    setEditValue("");
  };

  const saveEdit = async (id) => {
    if (!editValue.trim()) {
      toast.error("Customer type is required");
      return;
    }
    try {
      await customerTypesAPI.update(id, { type: editValue.trim() });
      toast.success("Customer type updated");
      setEditType(null);
      setEditValue("");
      loadCustomerTypes();
    } catch (e) {
      toast.error(e.message || "Failed to update customer type");
    }
  };

  const removeCustomerType = (id) => {
    const customerType = customerTypes.find((item) => item.id === id);
    openConfirmModal({
      title: "Delete Customer Type",
      message: `Delete "${customerType?.type}"?`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await customerTypesAPI.remove(id);
          toast.success("Customer type deleted");
          setCustomerTypes((prev) => prev.filter((item) => item.id !== id));
        } catch (e) {
          toast.error(e.message || "Failed to delete customer type");
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  return (
    <div className="bg-white border rounded-lg p-5 max-w-3xl">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Customer Types</h2>
        <p className="text-xs text-gray-500 mt-1">
          Create and manage customer types used in the CRM.
        </p>
      </div>

      <form onSubmit={addCustomerType} className="flex gap-2 mb-4">
        <input
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          placeholder="Customer type"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={14} />
          Add
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400 text-center py-5">Loading...</div>
      ) : (
        <div className="max-h-[380px] overflow-y-auto flex flex-col gap-2">
          {customerTypes.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-5">
              No customer types yet — add one above.
            </div>
          )}

          {customerTypes.map((customerType) => (
            <div
              key={customerType.id}
              className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg"
            >
              {editType === customerType.id ? (
                <>
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    className="flex-1 mr-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(customerType.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => saveEdit(customerType.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-800">
                    {customerType.type}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(customerType)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomerType(customerType.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * GEOFENCE TAB
 * ========================================================= */
function GeofenceTab() {
  const [radius, setRadius] = useState("250");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI
      .get()
      .then((r) => {
        const body = unwrap(r);
        if (body && body.checkin_radius_meters) {
          setRadius(body.checkin_radius_meters);
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({ checkin_radius_meters: radius });
      toast.success("Geofence radius saved");
    } catch (e) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white border rounded-lg p-5 max-w-xl">
      <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2 mb-3">
        <MapPin size={16} className="text-blue-600" />
        Check-In / Check-Out Geofence Radius
      </h2>

      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        When a salesperson checks in or checks out, their GPS is compared
        against the customer's registered map location. Visits farther than this
        radius are flagged as <strong>Out of range</strong>.
      </p>

      <div className="flex gap-3 items-end">
        <div className="max-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Radius (metres)
          </label>
          <input
            type="number"
            min="10"
            step="10"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Radius"}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-100 p-3 leading-relaxed">
        Tip: 250m = roughly a city block. Use 100m for strict, 500m for lenient
        tracking.
      </div>
    </div>
  );
}

/* =========================================================
 * PRODUCTS TAB
 * ========================================================= */
function ProductsTab({
  openConfirmModal,
  closeConfirmModal,
  setConfirmLoading,
}) {
  const [domains, setDomains] = useState([]);
  const [subdomains, setSubdomains] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedSubdomain, setSelectedSubdomain] = useState("");

  const [newDomain, setNewDomain] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newProduct, setNewProduct] = useState("");

  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingSubdomains, setLoadingSubdomains] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await productMasterAPI.getDomains();
      setDomains(unwrapList(response));
    } catch (error) {
      toast.error(error.message || "Failed to load domains");
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleDomainSelect = async (domainId) => {
    setSelectedDomain(domainId);
    setSelectedSubdomain("");
    setSubdomains([]);
    setProducts([]);

    if (!domainId) return;

    try {
      setLoadingSubdomains(true);
      const response = await productMasterAPI.getSubdomains({
        domain_id: domainId,
      });
      setSubdomains(unwrapList(response));
    } catch (error) {
      toast.error(error.message || "Failed to load subdomains");
    } finally {
      setLoadingSubdomains(false);
    }
  };

  const handleSubdomainSelect = async (subdomainId) => {
    setSelectedSubdomain(subdomainId);
    setProducts([]);

    if (!subdomainId) return;

    try {
      setLoadingProducts(true);
      const response = await productMasterAPI.getProducts({
        subdomain_id: subdomainId,
      });
      setProducts(unwrapList(response));
    } catch (error) {
      toast.error(error.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const addDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) {
      toast.error("Domain name is required");
      return;
    }
    try {
      await productMasterAPI.createDomain({ name: newDomain.trim() });
      toast.success("Domain added");
      setNewDomain("");
      await loadDomains();
    } catch (error) {
      toast.error(
        (error.response && error.response.data && error.response.data.message) ||
          error.message ||
          "Failed to add domain"
      );
    }
  };

  const addSubdomain = async (e) => {
    e.preventDefault();
    if (!selectedDomain) {
      toast.error("Select a domain first");
      return;
    }
    if (!newSubdomain.trim()) {
      toast.error("Subdomain name is required");
      return;
    }
    try {
      await productMasterAPI.createSubdomain({
        domain_id: selectedDomain,
        name: newSubdomain.trim(),
      });
      toast.success("Subdomain added");
      setNewSubdomain("");
      const response = await productMasterAPI.getSubdomains({
        domain_id: selectedDomain,
      });
      setSubdomains(unwrapList(response));
    } catch (error) {
      toast.error(
        (error.response && error.response.data && error.response.data.message) ||
          error.message ||
          "Failed to add subdomain"
      );
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!selectedSubdomain) {
      toast.error("Select a subdomain first");
      return;
    }
    if (!newProduct.trim()) {
      toast.error("Product name is required");
      return;
    }
    try {
      await productMasterAPI.createProduct({
        subdomain_id: selectedSubdomain,
        name: newProduct.trim(),
      });
      toast.success("Product added");
      setNewProduct("");
      const response = await productMasterAPI.getProducts({
        subdomain_id: selectedSubdomain,
      });
      setProducts(unwrapList(response));
    } catch (error) {
      toast.error(
        (error.response && error.response.data && error.response.data.message) ||
          error.message ||
          "Failed to add product"
      );
    }
  };

  const removeDomain = (id) => {
    openConfirmModal({
      title: "Delete Domain",
      message: "Delete this domain?",
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await productMasterAPI.deleteDomain(id);
          toast.success("Domain deleted");

          if (String(selectedDomain) === String(id)) {
            setSelectedDomain("");
            setSelectedSubdomain("");
            setSubdomains([]);
            setProducts([]);
          }
          await loadDomains();
        } catch (error) {
          toast.error(
            (error.response &&
              error.response.data &&
              error.response.data.message) ||
              error.message ||
              "Failed to delete domain"
          );
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  const removeSubdomain = (id) => {
    openConfirmModal({
      title: "Delete Subdomain",
      message: "Delete this subdomain?",
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await productMasterAPI.deleteSubdomain(id);
          toast.success("Subdomain deleted");

          if (String(selectedSubdomain) === String(id)) {
            setSelectedSubdomain("");
            setProducts([]);
          }

          const response = await productMasterAPI.getSubdomains({
            domain_id: selectedDomain,
          });
          setSubdomains(unwrapList(response));
        } catch (error) {
          toast.error(
            (error.response &&
              error.response.data &&
              error.response.data.message) ||
              error.message ||
              "Failed to delete subdomain"
          );
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  const removeProduct = (id) => {
    openConfirmModal({
      title: "Delete Product",
      message: "Delete this product?",
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await productMasterAPI.deleteProduct(id);
          toast.success("Product deleted");
          setProducts((prev) => prev.filter((product) => product.id !== id));
        } catch (error) {
          toast.error(
            (error.response &&
              error.response.data &&
              error.response.data.message) ||
              error.message ||
              "Failed to delete product"
          );
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* DOMAIN */}
      <div className="bg-white border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Domains</h2>

        <form onSubmit={addDomain} className="flex gap-2 mb-4">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Domain name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={14} />
            Add
          </button>
        </form>

        {loadingDomains ? (
          <div className="text-gray-400 text-center py-5">Loading...</div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto flex flex-col gap-2">
            {domains.length === 0 && (
              <div className="text-gray-400 text-sm text-center py-5">
                No domains yet.
              </div>
            )}
            {domains.map((domain) => (
              <div
                key={domain.id}
                onClick={() => handleDomainSelect(String(domain.id))}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer border transition ${
                  selectedDomain === String(domain.id)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                }`}
              >
                <span className="font-medium text-sm text-gray-900">
                  {domain.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDomain(domain.id);
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SUBDOMAIN */}
      <div className="bg-white border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Subdomains
          {selectedDomain && (
            <span className="text-xs text-gray-400 ml-2 font-normal">
              —{" "}
              {
                domains.find((d) => String(d.id) === String(selectedDomain))
                  ?.name
              }
            </span>
          )}
        </h2>

        {!selectedDomain ? (
          <div className="text-gray-400 text-sm py-5">
            Select a domain to manage subdomains.
          </div>
        ) : (
          <>
            <form onSubmit={addSubdomain} className="flex gap-2 mb-4">
              <input
                value={newSubdomain}
                onChange={(e) => setNewSubdomain(e.target.value)}
                placeholder="Subdomain name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={14} />
                Add
              </button>
            </form>

            {loadingSubdomains ? (
              <div className="text-gray-400 text-center py-5">Loading...</div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto flex flex-col gap-2">
                {subdomains.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-5">
                    No subdomains yet.
                  </div>
                )}
                {subdomains.map((subdomain) => (
                  <div
                    key={subdomain.id}
                    onClick={() => handleSubdomainSelect(String(subdomain.id))}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer border transition ${
                      selectedSubdomain === String(subdomain.id)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    <span className="font-medium text-sm text-gray-900">
                      {subdomain.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSubdomain(subdomain.id);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* PRODUCTS */}
      <div className="bg-white border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Products
          {selectedSubdomain && (
            <span className="text-xs text-gray-400 ml-2 font-normal">
              —{" "}
              {
                subdomains.find(
                  (s) => String(s.id) === String(selectedSubdomain)
                )?.name
              }
            </span>
          )}
        </h2>

        {!selectedSubdomain ? (
          <div className="text-gray-400 text-sm py-5">
            Select a subdomain to manage products.
          </div>
        ) : (
          <>
            <form onSubmit={addProduct} className="flex gap-2 mb-4">
              <input
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                placeholder="Product name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={14} />
                Add
              </button>
            </form>

            {loadingProducts ? (
              <div className="text-gray-400 text-center py-5">Loading...</div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto flex flex-col gap-2">
                {products.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-5">
                    No products yet.
                  </div>
                )}
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg"
                  >
                    <span className="font-medium text-sm text-gray-900">
                      {product.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * CUSTOMER GROUPS SUB-TAB
 * ========================================================= */
function CustomerGroupsSubTab({
  openConfirmModal,
  closeConfirmModal,
  setConfirmLoading,
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerGroupsAPI.getAll(search ? { search } : {});
      setGroups(unwrapList(res));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load customer groups");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const openNew = () => {
    setEditGroup(null);
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditGroup(g);
    setShowModal(true);
  };

  const handleDelete = (group) => {
    openConfirmModal({
      title: "Delete Customer Group",
      message: `Are you sure you want to delete "${group.name}"? Member customer companies will remain in the system but will no longer be linked to this group.`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await customerGroupsAPI.remove(group.id);
          toast.success("Group deleted successfully");
          loadGroups();
        } catch (e) {
          toast.error(
            (e.response && e.response.data && e.response.data.message) ||
              e.message ||
              "Failed to delete group"
          );
        } finally {
          setConfirmLoading(false);
          closeConfirmModal();
        }
      },
    });
  };

  return (
    <div className="bg-white border rounded-lg p-5">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Customer Groups
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Group multiple customer companies under a shared organizational hierarchy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 shadow-xs"
          >
            <Plus size={14} />
            Add Group
          </button>
        </div>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Loading customer groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <Users size={36} className="text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-700">No customer groups found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {search
              ? "No groups match your search criteria."
              : "Create a group to organize multiple customer companies together under one hierarchy."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={openNew}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-md hover:bg-blue-100"
            >
              <Plus size={14} />
              Create Group
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
              <tr>
                <th className="py-3 px-4">Group Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Member Companies</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groups.map((group) => {
                const memberList = group.customers || [];
                return (
                  <tr key={group.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {group.name?.charAt(0)?.toUpperCase() || "G"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{group.name}</div>
                          <div className="text-xs text-gray-500">{memberList.length} {memberList.length === 1 ? "company" : "companies"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs">
                      {group.description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {memberList.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No companies assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {memberList.slice(0, 4).map((c) => (
                            <span
                              key={c.customer_id || c.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                            >
                              <Building2 size={11} className="text-blue-500" />
                              {c.company_name}
                            </span>
                          ))}
                          {memberList.length > 4 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-medium">
                              +{memberList.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {group.created_at ? new Date(group.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit Group"
                          onClick={() => openEdit(group)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete Group"
                          onClick={() => handleDelete(group)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CustomerGroupModal
          isOpen={showModal}
          group={editGroup}
          onClose={() => {
            setShowModal(false);
            setEditGroup(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditGroup(null);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
 * CUSTOMER GROUP MODAL (Create & Edit with Customer Multi-Select)
 * ========================================================= */
function CustomerGroupModal({ isOpen, group, onClose, onSaved }) {
  const isEdit = !!group?.id;
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(
    group?.customers?.map((c) => c.customer_id || c.id) || []
  );
  const [allCustomers, setAllCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoadingCustomers(true);
    customersAPI
      .getAll({ limit: 1000 })
      .then((res) => {
        setAllCustomers(unwrapList(res));
      })
      .catch((e) => {
        console.error(e);
        toast.error("Failed to load customer list");
      })
      .finally(() => setLoadingCustomers(false));
  }, [isOpen]);

  const toggleCustomer = (id) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredCustomers = allCustomers.filter((c) => {
    if (!filterSearch.trim()) return true;
    const term = filterSearch.toLowerCase();
    return (
      (c.company_name && c.company_name.toLowerCase().includes(term)) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(term)) ||
      (c.city && c.city.toLowerCase().includes(term))
    );
  });

  const selectAllFiltered = () => {
    const idsToAdd = filteredCustomers.map((c) => c.id);
    setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const clearSelection = () => {
    setSelectedCustomerIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description ? description.trim() : null,
        customer_ids: selectedCustomerIds,
      };

      if (isEdit) {
        await customerGroupsAPI.update(group.id, payload);
        toast.success("Group updated successfully");
      } else {
        await customerGroupsAPI.create(payload);
        toast.success("Group created successfully");
      }
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error(
        (err.response && err.response.data && err.response.data.message) ||
          err.message ||
          "Failed to save group"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Customer Group" : "Create Customer Group"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define group details and select companies belonging to this group
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tata Group, Aditya Birla Group, Reliance"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional group description or notes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Select Companies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Select Companies / Customers ({selectedCustomerIds.length} selected)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-gray-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter search */}
              <div className="relative mb-2">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Filter customers by name or city..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Customer Checkbox List */}
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100 bg-gray-50/50">
                {loadingCustomers ? (
                  <div className="py-8 text-center text-xs text-gray-500">
                    Loading customers...
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500">
                    No customers found matching filter.
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isChecked = selectedCustomerIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition text-xs ${
                          isChecked ? "bg-blue-50/70" : "hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCustomer(c.id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 block truncate">
                              {c.company_name}
                            </span>
                            <span className="text-gray-500 text-[11px] block truncate">
                              {[c.contact_person, c.city, c.industry]
                                .filter(Boolean)
                                .join(" • ")}
                            </span>
                          </div>
                        </div>

                        {c.group_name && c.group_id !== group?.id && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-2 shrink-0">
                            Currently: {c.group_name}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t bg-gray-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs"
            >
              {saving ? "Saving..." : isEdit ? "Update Group" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
