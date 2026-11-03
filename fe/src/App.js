import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const Layout = lazy(() => import("./components/common/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
// const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CheckInPage = lazy(() => import("./pages/CheckInPage"));
const VisitsPage = lazy(() => import("./pages/VisitsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const LiveTrackPage = lazy(() => import("./pages/admin/LiveTrackPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const MailPage = lazy(() => import("./pages/admin/MailPage"));
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage"));
// const NewCustomerPage = lazy(() => import("./pages/customer/NewCustomerPage"));
// const EditCustomerPage = lazy(() =>  import("./pages/customer/EditCustomerPage"));
// const ContactsPage = lazy(() => import("./pages/contact/ContactsPage"));
// const NewContactPage = lazy(() => import("./pages/contact/NewContactPage"));
const NewLeadPage = lazy(() => import("./pages/leads/NewLeadPage"));
const EditLeadPage = lazy(() => import("./pages/leads/EditLeadPage"));
const TasksPage = lazy(() => import("./pages/tasks/TasksPage"));
const CreateTaskPage = lazy(() => import("./pages/tasks/CreateTaskPage"));
const EditTaskPage = lazy(() => import("./pages/tasks/EditTaskPage"));
const TaskDetailsPage = lazy(() => import("./pages/tasks/TaskDetailsPage"));
const MeetingsPage = lazy(() => import("./pages/meetings/MeetingsPage"));
const CreateMeetingPage = lazy(() => import("./pages/meetings/CreateMeetingPage"));
const EditMeetingPage = lazy(() => import("./pages/meetings/EditMeetingPage"));
const MeetingDetailsPage = lazy(() => import("./pages/meetings/MeetingDetailsPage"));

const CallsPage = lazy(() => import("./pages/calls/CallsPage"));
const CreateCallPage = lazy(() => import("./pages/calls/CreateCallPage"));
const EditCallPage = lazy(() => import("./pages/calls/EditCallPage"));
const CallDetailsPage = lazy(() => import("./pages/calls/CallDetailsPage"));

function Guard({ children, manager, admin }) {
  const { user, loading, isManager, isAdmin } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (manager && !isManager) return <Navigate to="/dashboard" replace />;
  return children;
}

function Loader() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #dbeafe",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            margin: "0 auto 12px",
          }}
          className="spin"
        />
        <p style={{ color: "#6b7280", fontSize: 13 }}>Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />}
        />
        <Route
          path="/"
          element={
            <Guard>
              <Layout />
            </Guard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          {/* <Route path="customers" element={<CustomersPage />} /> */}
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="admin/users"
            element={
              <Guard admin>
                <UsersPage />
              </Guard>
            }
          />
          <Route
            path="users"
            element={
              <Guard admin>
                <UsersPage />
              </Guard>
            }
          />
          <Route
            path="roles"
            element={
              <Guard admin>
                <UsersPage />
              </Guard>
            }
          />
          <Route
            path="analytics"
            element={<AnalyticsPage />}
          />
          <Route
            path="admin/reports"
            element={
              <Guard>
                <ReportsPage />
              </Guard>
            }
          />
          <Route
            path="admin/tracking"
            element={
              <Guard manager>
                <LiveTrackPage />
              </Guard>
            }
          />
          <Route
            path="admin/settings"
            element={
              <Guard admin>
                <SettingsPage />
              </Guard>
            }
          />
          <Route
            path="admin/mail"
            element={
              <Guard admin>
                <MailPage />
              </Guard>
            }
          />

          {/* <Route path="customers/new" element={<NewCustomerPage />} />
          <Route path="customers/:id/edit" element={<EditCustomerPage />} />

          <Route path="contacts" element={<ContactsPage />} />

          <Route path="contacts/new" element={<NewContactPage />} />

          <Route path="contacts/:id/edit" element={<EditContactPage />} /> */}

          <Route path="leads/new" element={<NewLeadPage />} />
          <Route path="leads/:id/edit" element={<EditLeadPage />} />

          <Route  path="/tasks"  element={<TasksPage />}/>
          <Route  path="/tasks/new"  element={<CreateTaskPage />}/>
          <Route  path="/tasks/:id/edit"  element={<EditTaskPage />}/>
          <Route  path="/tasks/:id"  element={<TaskDetailsPage />}/>  

          <Route
              path="/meetings"
              element={<MeetingsPage />}
          />
          <Route
              path="/meetings/create"
              element={<CreateMeetingPage />}
          />
          <Route
              path="/meetings/:id/edit"
              element={<EditMeetingPage />}
          />
          <Route
              path="/meetings/:id"
              element={<MeetingDetailsPage />}
          />

<Route
    path="/calls"
    element={<CallsPage />}
/>

<Route
    path="/calls"
    element={
        <CallsPage />
    }
/>

<Route
    path="/calls/schedule"
    element={
        <CreateCallPage
            mode="schedule"
        />
    }
/>

<Route
    path="/calls/log"
    element={
        <CreateCallPage
            mode="log"
        />
    }
/>

<Route
    path="/calls/new"
    element={<CreateCallPage />}
/>

<Route
    path="/calls/:id/edit"
    element={<EditCallPage />}
/>

<Route
    path="/calls/:id"
    element={<CallDetailsPage />}
/>
              
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "Inter,system-ui,sans-serif",
                fontSize: 13,
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
              success: { style: { borderLeft: "3px solid #16a34a" } },
              error: { style: { borderLeft: "3px solid #dc2626" } },
            }}
          />
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
