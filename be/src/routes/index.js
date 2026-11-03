const router = require('express').Router();
const { authenticate, requireAdmin, requireManager } = require('../middleware/auth');
const C = require('../controllers/controllers');
const productController = require('../controllers/productController');
const tasksController = require('../controllers/tasksController');
const meetingsController = require('../controllers/meetingsController');
const callsController = require('../controllers/callsController');
const savedFiltersController = require('../controllers/savedFiltersController');

// Auth
router.post('/auth/login', C.login);
router.get('/auth/me', authenticate, C.getMe);
router.put('/auth/change-password', authenticate, C.changePassword);
router.post('/auth/forgot-password/send-otp', C.forgotPasswordSendOtp);
router.post('/auth/forgot-password/verify-otp', C.forgotPasswordVerifyOtp);
router.post('/auth/forgot-password/reset', C.forgotPasswordReset);

// Users
router.get('/users', authenticate, requireManager, C.getUsers);
router.get('/users/roles', authenticate, C.getRoles);
router.post('/users', authenticate, requireAdmin, C.createUser);
router.put('/users/:id', authenticate, requireAdmin, C.updateUser);
router.put('/users/:id/reset-password', authenticate, requireAdmin, C.resetPassword);

// Customers
router.get('/customers', authenticate, C.getCustomers);
router.get('/customers/:id', authenticate, C.getCustomer);
router.post('/customers', authenticate, C.createCustomer);
router.put('/customers/:id', authenticate, C.updateCustomer);
router.delete('/customers/:id', authenticate, requireManager, C.deleteCustomer);

// Leads
router.get('/leads', authenticate, C.getLeads);
router.get('/leads/stages', authenticate, C.getStages);
router.get('/leads/pipeline', authenticate, C.getPipeline);
router.post('/leads/bulk-update', authenticate, C.bulkUpdateLeads);
router.get('/leads/:id/adjacent', authenticate, C.getAdjacentLeads);
router.get('/leads/:id', authenticate, C.getLead);
router.post('/leads', authenticate, C.createLead);
router.put('/leads/:id', authenticate, C.updateLead);
router.patch('/leads/:id/stage', authenticate, C.updateStage);
router.get('/leads/:id/edit-history', authenticate, C.getLeadEditHistory);
router.delete('/leads/:id', authenticate, requireAdmin, C.deleteLead);
router.patch('/leads/:id/restore', authenticate, requireAdmin, C.restoreLead);

// Lead stage management — REORDER must come BEFORE /:id to avoid conflict
router.post('/stages', authenticate, requireAdmin, C.createStage);
router.put('/stages/reorder', authenticate, requireAdmin, C.reorderStages); // <-- before /:id
router.put('/stages/:id', authenticate, requireAdmin, C.updateStageDef);
router.delete('/stages/:id', authenticate, requireAdmin, C.deleteStage);

// Saved Filters
router.get('/saved-filters', authenticate, savedFiltersController.getSavedFilters);
router.post('/saved-filters', authenticate, savedFiltersController.createSavedFilter);
router.put('/saved-filters/:id', authenticate, savedFiltersController.updateSavedFilter);
router.delete('/saved-filters/:id', authenticate, savedFiltersController.deleteSavedFilter);

// City / State master data
router.get('/master/states', authenticate, C.getStates);
router.get('/master/cities', authenticate, C.getCities);
router.post('/master/states', authenticate, requireAdmin, C.createState);
router.post('/master/cities', authenticate, requireAdmin, C.createCity);
router.delete('/master/states/:id', authenticate, requireAdmin, C.deleteState);
router.delete('/master/cities/:id', authenticate, requireAdmin, C.deleteCity);

// Settings (admin)
router.get('/settings', authenticate, C.getSettings);
router.put('/settings', authenticate, requireAdmin, C.updateSettings);

// Visits
router.post('/visits/check-in', authenticate, C.checkIn);
router.post('/visits/check-out', authenticate, C.checkOut);
router.get('/visits/active', authenticate, C.getActiveSessions);
router.get('/visits/history', authenticate, C.getVisitHistory);
router.get('/visits/live', authenticate, requireManager, C.getLiveTracking);

// Activities
router.get('/activities', authenticate, C.getActivities);
router.post('/activities', authenticate, C.createActivity);

// Dynamic Custom Reports Builder
const reportBuilderController = require('../controllers/reportBuilderController');
router.get('/reports/modules/metadata', authenticate, reportBuilderController.getModuleMetadata);
router.get('/reports/folders', authenticate, reportBuilderController.getFolders);
router.post('/reports/folders', authenticate, reportBuilderController.createFolder);
router.put('/reports/folders/:id', authenticate, reportBuilderController.updateFolder);
router.delete('/reports/folders/:id', authenticate, reportBuilderController.deleteFolder);

router.get('/reports', authenticate, reportBuilderController.getReports);
router.post('/reports', authenticate, reportBuilderController.createReport);
router.post('/reports/preview', authenticate, reportBuilderController.previewReport);
router.get('/reports/:id', authenticate, reportBuilderController.getReportById);
router.put('/reports/:id', authenticate, reportBuilderController.updateReport);
router.delete('/reports/:id', authenticate, reportBuilderController.deleteReport);
router.post('/reports/:id/clone', authenticate, reportBuilderController.cloneReport);
router.post('/reports/:id/favorite', authenticate, reportBuilderController.toggleFavorite);
router.post('/reports/:id/run', authenticate, reportBuilderController.runReport);

// Analytics (Existing)
router.get('/analytics/dashboard', authenticate, C.getDashboard);
router.get('/analytics/leads-report', authenticate, C.getLeadReport);
router.get('/analytics/visits-report', authenticate, C.getVisitReport);
router.get('/analytics/stale-leads', authenticate, C.getStaleLeads);
router.get('/analytics/custom', authenticate, C.getCustomAnalytics);

// Analytics / Dashboard Builder Module (New)
const analyticsController = require('../controllers/analyticsController');
router.get('/analytics/dashboards', authenticate, analyticsController.getDashboards);
router.post('/analytics/dashboards', authenticate, analyticsController.createDashboard);
router.get('/analytics/dashboards/:id', authenticate, analyticsController.getDashboardById);
router.put('/analytics/dashboards/:id', authenticate, analyticsController.updateDashboard);
router.delete('/analytics/dashboards/:id', authenticate, analyticsController.deleteDashboard);
router.put('/analytics/dashboards/:id/default', authenticate, analyticsController.setDefaultDashboard);
router.post('/analytics/dashboards/:id/clone', authenticate, analyticsController.cloneDashboard);
router.post('/analytics/components/data', authenticate, analyticsController.getComponentData);
router.get('/analytics/schema-meta', authenticate, analyticsController.getSchemaMetadata);
router.get('/analytics/targets', authenticate, analyticsController.getTargets);
router.post('/analytics/targets', authenticate, analyticsController.createTarget);
router.put('/analytics/targets/:id', authenticate, analyticsController.updateTarget);
router.delete('/analytics/targets/:id', authenticate, analyticsController.deleteTarget);
router.post('/analytics/targets/upsert', authenticate, analyticsController.upsertTarget);
router.post('/analytics/targets/batch', authenticate, analyticsController.saveTargetsBatch);

router.get(
    '/customer-types',
    authenticate,
    requireAdmin,
    C.getCustomerTypes
  );
  
  router.post(
    '/customer-types',
    authenticate,
    requireAdmin,
    C.createCustomerType
  );
  
  router.put(
    '/customer-types/:id',
    authenticate,
    requireAdmin,
    C.updateCustomerType
  );
  
  router.delete(
    '/customer-types/:id',
    authenticate,
    requireAdmin,
    C.deleteCustomerType
  );

  // Customer Groups
  router.get('/customer-groups', authenticate, C.getCustomerGroups);
  router.get('/customer-groups/:id', authenticate, C.getCustomerGroupById);
  router.post('/customer-groups', authenticate, requireAdmin, C.createCustomerGroup);
  router.put('/customer-groups/:id', authenticate, requireAdmin, C.updateCustomerGroup);
  router.delete('/customer-groups/:id', authenticate, requireAdmin, C.deleteCustomerGroup);

  // contacts //

  router.get(
    '/contacts',
    authenticate,
    C.getContacts
);

router.get(
    '/contacts/:id',
    authenticate,
    C.getContact
);

router.post(
    '/contacts',
    authenticate,
    C.createContact
);

router.put(
    '/contacts/:id',
    authenticate,
    C.updateContact
);

router.delete(
    '/contacts/:id',
    authenticate,
    C.deleteContact
);

// Domains
router.get('/domains', authenticate, productController.getDomains);
router.post('/domains', authenticate, productController.createDomain);
router.put('/domains/:id', authenticate, productController.updateDomain);
router.delete('/domains/:id', authenticate, productController.deleteDomain);


// Subdomains
router.get('/subdomains', authenticate, productController.getSubdomains);
router.post('/subdomains', authenticate, productController.createSubdomain);
router.put('/subdomains/:id', authenticate, productController.updateSubdomain);
router.delete('/subdomains/:id', authenticate, productController.deleteSubdomain);


// Products
router.get('/products', authenticate, productController.getProducts);
router.post('/products', authenticate, productController.createProduct);
router.put('/products/:id', authenticate, productController.updateProduct);
router.delete('/products/:id', authenticate, productController.deleteProduct);

// Tasks

router.get('/tasks', authenticate, tasksController.getTasks);
router.get('/tasks/related/:type', authenticate, tasksController.getRelatedRecords);
router.get('/tasks/:id', authenticate, tasksController.getTaskById);
router.post('/tasks', authenticate, tasksController.createTask);
router.put('/tasks/:id', authenticate, tasksController.updateTask);
router.delete('/tasks/:id', authenticate, tasksController.deleteTask);

router.get(
  '/meetings',
  authenticate,
  meetingsController.getMeetings
);

router.get(
  '/meetings/related/:type',
  authenticate,
  meetingsController.getRelatedRecords
);

router.get(
  '/meetings/participants',
  authenticate,
  meetingsController.getParticipants
);

router.get(
  '/meetings/:id',
  authenticate,
  meetingsController.getMeetingById
);

router.post(
  '/meetings',
  authenticate,
  meetingsController.createMeeting
);

router.put(
  '/meetings/:id',
  authenticate,
  meetingsController.updateMeeting
);

router.delete(
  '/meetings/:id',
  authenticate,
  meetingsController.deleteMeeting
);

router.post(
  '/meetings/:id/clone',
  authenticate,
  meetingsController.cloneMeeting
);

router.get(
  '/calls',
  authenticate,
  callsController.getCalls
);

router.get(
  '/calls/related/:type',
  authenticate,
  callsController.getRelatedRecords
);

router.get(
  '/calls/:id',
  authenticate,
  callsController.getCallById
);

router.post(
  '/calls',
  authenticate,
  callsController.createCall
);

router.put(
  '/calls/:id',
  authenticate,
  callsController.updateCall
);

router.delete(
  '/calls/:id',
  authenticate,
  callsController.deleteCall
);

// Notifications
const notificationsController = require('../controllers/notificationsController');
router.post('/notifications/push', authenticate, requireAdmin, notificationsController.pushNotification);
router.get('/notifications', authenticate, notificationsController.getNotifications);
router.get('/notifications/unread', authenticate, notificationsController.getUnreadNotifications);
router.patch('/notifications/read-all', authenticate, notificationsController.markAllAsRead);
router.patch('/notifications/:id/read', authenticate, notificationsController.markAsRead);
router.delete('/notifications/:id', authenticate, notificationsController.deleteNotification);

// Mail Management (Admin only)
const mailController = require('../controllers/mailController');
router.get('/mail/settings', authenticate, requireAdmin, mailController.getSettings);
router.put('/mail/settings', authenticate, requireAdmin, mailController.updateSettings);
router.post('/mail/test', authenticate, requireAdmin, mailController.testMail);
router.get('/mail/logs', authenticate, requireAdmin, mailController.getLogs);
router.post('/mail/logs/:id/retry', authenticate, requireAdmin, mailController.retryLog);
router.post('/mail/logs/retry-all', authenticate, requireAdmin, mailController.retryAll);
router.delete('/mail/logs/:id', authenticate, requireAdmin, mailController.deleteLog);
router.post('/mail/run-daily-check', authenticate, requireAdmin, mailController.runDailyCheck);
router.get('/mail/templates', authenticate, requireAdmin, mailController.getTemplates);
router.get('/mail/templates/:key', authenticate, requireAdmin, mailController.getTemplateByKey);
router.put('/mail/templates/:key', authenticate, requireAdmin, mailController.updateTemplate);
router.post('/mail/templates/:key/reset', authenticate, requireAdmin, mailController.resetTemplate);
router.post('/mail/templates/:key/preview', authenticate, requireAdmin, mailController.previewTemplate);

module.exports = router;
