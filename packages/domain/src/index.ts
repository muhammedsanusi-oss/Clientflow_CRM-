/*
 * Code guide: packages/domain/src/index.ts
 * Shared domain entry point used by the web app. Re-exports validation schemas and business-aware queries;
 * follow each export source to find its implementation. Exporting a function does not call it.
 */
// Web-only domain logic: input validation schemas and database queries.
// The worker does not import from this package.
// Re-export connection: { CreateCustomer, type CreateCustomerInput } ->
// packages/domain/src/schemas/customer.ts. Importing this entry exposes definitions; it does not call them.
export { CreateCustomer, type CreateCustomerInput } from "./schemas/customer";
// Re-export connection: { CreateBusiness, type CreateBusinessInput } ->
// packages/domain/src/schemas/business.ts. Importing this entry exposes definitions; it does not call them.
export { CreateBusiness, type CreateBusinessInput } from "./schemas/business";
// Re-export connection: { CreateEmployee, type CreateEmployeeInput } ->
// packages/domain/src/schemas/employee.ts. Importing this entry exposes definitions; it does not call them.
export { CreateEmployee, type CreateEmployeeInput } from "./schemas/employee";
// Re-export connection: { CreateLocation, type CreateLocationInput } ->
// packages/domain/src/schemas/location.ts. Importing this entry exposes definitions; it does not call them.
export { CreateLocation, type CreateLocationInput } from "./schemas/location";
// Re-export connection: { CreateService, type CreateServiceInput } -> packages/domain/src/schemas/service.ts.
// Importing this entry exposes definitions; it does not call them.
export { CreateService, type CreateServiceInput } from "./schemas/service";
// Re-export connection: { CreateAppointment, CreateAppointmentService, type CreateAppointmentInput, type
// CreateAppointmentServiceInput } -> packages/domain/src/schemas/appointment.ts. Importing this entry exposes
// definitions; it does not call them.
export { CreateAppointment, CreateAppointmentService, type CreateAppointmentInput, type CreateAppointmentServiceInput } from "./schemas/appointment";
// Re-export connection: { CreateTask, type CreateTaskInput } -> packages/domain/src/schemas/task.ts.
// Importing this entry exposes definitions; it does not call them.
export { CreateTask, type CreateTaskInput } from "./schemas/task";
// Re-export connection: { CreateNote, type CreateNoteInput } -> packages/domain/src/schemas/note.ts.
// Importing this entry exposes definitions; it does not call them.
export { CreateNote, type CreateNoteInput } from "./schemas/note";
// Re-export connection: { CreateInteraction, type CreateInteractionInput } ->
// packages/domain/src/schemas/interaction.ts. Importing this entry exposes definitions; it does not call
// them.
export { CreateInteraction, type CreateInteractionInput } from "./schemas/interaction";
// Re-export connection: { CreatePayment, type CreatePaymentInput } -> packages/domain/src/schemas/payment.ts.
// Importing this entry exposes definitions; it does not call them.
export { CreatePayment, type CreatePaymentInput } from "./schemas/payment";
// Re-export connection: { Username, SignIn, type SignInInput } -> packages/domain/src/schemas/user.ts.
// Importing this entry exposes definitions; it does not call them.
export { Username, SignIn, type SignInInput } from "./schemas/user";
// Re-export connection: { listBusinesses, getBusinessById, createBusiness } ->
// packages/domain/src/queries/business.ts. Importing this entry exposes definitions; it does not call them.
export { listBusinesses, getBusinessById, createBusiness } from "./queries/business";
// Re-export connection: { listEmployees, getEmployee, createEmployee } ->
// packages/domain/src/queries/employee.ts. Importing this entry exposes definitions; it does not call them.
export { listEmployees, getEmployee, createEmployee } from "./queries/employee";
// Re-export connection: { listLocations, getLocationById, createLocation } ->
// packages/domain/src/queries/location.ts. Importing this entry exposes definitions; it does not call them.
export { listLocations, getLocationById, createLocation } from "./queries/location";
// Re-export connection: { listCustomers, getCustomer, createCustomer } ->
// packages/domain/src/queries/customers.ts. Importing this entry exposes definitions; it does not call them.
export { listCustomers, getCustomer, createCustomer } from "./queries/customers";
// Re-export connection: { getUser, findOrCreateUser } -> packages/domain/src/queries/users.ts. Importing this
// entry exposes definitions; it does not call them.
export { getUser, findOrCreateUser } from "./queries/users";
// Re-export connection: { ensureLocalTestAccounts } -> packages/domain/src/local-test-accounts.ts. Importing
// this entry exposes definitions; it does not call them.
export { ensureLocalTestAccounts } from "./local-test-accounts";
// Re-export connection: { getPublicWebsite, WebsiteContact, submitWebsiteInquiry, listOwnerInquiries,
// getWebsiteEditor, publishWebsite, getOwnerWebsite, listOwnerWebsites } -> packages/domain/src/websites.ts.
// Importing this entry exposes definitions; it does not call them.
export { getPublicWebsite, getPublicWebsiteImage, WebsiteContact, submitWebsiteInquiry, listOwnerInquiries, getWebsiteEditor, assertWebsiteEditorAccess, assertWebsiteImageUploadAllowed, submitWebsiteFeatureRequest, publishWebsite, getOwnerWebsite, listOwnerWebsites, listOwnerDashboardBusinesses } from "./websites";
export { WEBSITE_PLANS, WebsitePlanSchema, WebsiteFeatureRequest, countWebsiteImages, type WebsitePlanKey, type WebsiteFeatureRequestInput } from "./website-plans";
// Re-export connection: { PublishWebsite, type PublishWebsiteInput } ->
// packages/domain/src/website-editing.ts. Importing this entry exposes definitions; it does not call them.
export {
  PublishWebsite,
  type PublishWebsiteInput,
} from "./website-editing";
export {
  WEBSITE_FONT_FAMILIES,
  WEBSITE_TEXT_COLORS,
  WEBSITE_TEXT_SCALES,
  WEBSITE_IMAGE_SECTIONS,
  WebsiteSectionImagesSchema,
  defaultWebsiteSectionImages,
  type WebsiteImageSection,
  type WebsiteSectionImages,
  WebsiteContentSchema,
  type WebsiteContent,
} from "./website-content";
// Re-export connection: { PasswordLogin, ChangePassword, ProvisionBusiness, provisionBusiness,
// regenerateOwnerPassword, requireDeveloper, listProvisionedBusinesses, getProvisionedBusiness, type
// ProvisionBusinessInput } -> packages/domain/src/provisioning.ts. Importing this entry exposes definitions;
// it does not call them.
export { PasswordLogin, ChangePassword, ProvisionBusiness, provisionBusiness, regenerateOwnerPassword, requireDeveloper, listProvisionedBusinesses, getProvisionedBusiness, type ProvisionBusinessInput } from "./provisioning";
export { OwnerSignup, createLocalOwnerSignup, isLocalOwnerSignupEnabled, type OwnerSignupInput, type ParsedOwnerSignup } from "./owner-signup";
// Re-export connection: { listServices, getService, createService } ->
// packages/domain/src/queries/services.ts. Importing this entry exposes definitions; it does not call them.
export { listServices, getService, createService } from "./queries/services";
// Re-export connection: { listAppointments, getAppointment, createAppointment } ->
// packages/domain/src/queries/appointments.ts. Importing this entry exposes definitions; it does not call
// them.
export { listAppointments, getAppointment, createAppointment } from "./queries/appointments";
// Re-export connection: { listTasks, getTask, createTask } -> packages/domain/src/queries/tasks.ts. Importing
// this entry exposes definitions; it does not call them.
export { listTasks, getTask, createTask } from "./queries/tasks";
// Re-export connection: { listNotes, listBusinessNotesForUser, getNote, createNote } ->
// packages/domain/src/queries/notes.ts. Importing this entry exposes definitions; it does not call them.
export { listNotes, listBusinessNotesForUser, getNote, createNote } from "./queries/notes";
// Re-export connection: { listInteractions, getInteraction, createInteraction } ->
// packages/domain/src/queries/interactions.ts. Importing this entry exposes definitions; it does not call
// them.
export { listInteractions, getInteraction, createInteraction } from "./queries/interactions";
// Re-export connection: { listPayments, getPayment, createPayment } ->
// packages/domain/src/queries/payments.ts. Importing this entry exposes definitions; it does not call them.
export { listPayments, getPayment, createPayment } from "./queries/payments";
// Re-export connection: { apiError } -> packages/domain/src/errors.ts. Importing this entry exposes
// definitions; it does not call them.
export { apiError } from "./errors";
// Re-export connection: { appointmentTimeSlots, calendarMonthSchema, createAppointmentForUser,
// createAppointmentInputSchema, getAppointmentFormForUser, listAppointmentsForUserMonth, } ->
// packages/domain/src/appointments.ts. Importing this entry exposes definitions; it does not call them.
export {
  appointmentTimeSlots,
  calendarMonthSchema,
  createAppointmentForUser,
  createAppointmentInputSchema,
  getAppointmentFormForUser,
  listAppointmentsForUserMonth,
} from "./appointments";
// Re-export connection: { CreateAppointmentInput as ScheduleAppointmentInput } ->
// packages/domain/src/appointments.ts. Importing this entry exposes definitions; it does not call them.
export type { CreateAppointmentInput as ScheduleAppointmentInput } from "./appointments";
export {
  addBookingStaff,
  addBookingStaffHours,
  addBusinessHoursInterval,
  bookingDateSchema,
  createPublicBooking,
  deleteBookingStaffHours,
  deleteBusinessHoursInterval,
  getOwnerBookingSettings,
  getPublicBookingAvailability,
  getPublicBookingOptions,
  hoursIntervalInputSchema,
  listAppointmentsForOwnerBusinessMonth,
  ownerServiceInputSchema,
  publicBookingInputSchema,
  saveOwnerService,
  setOwnerServiceActive,
  staffHoursIntervalInputSchema,
  staffNameInputSchema,
  updateBookingStaff,
} from "./booking";
export type { PublicBookingInput } from "./booking";
// Re-export connection: { createCustomerNoteForUser, createCustomerNoteInputSchema, createCustomerForUser,
// createCustomerInputSchema, getCustomerCollectionForUser, getCustomerBusinessForUser,
// getCustomerWithNotesForUser, listCustomersForUser, customerSearchInputSchema, updateCustomerForUser, } ->
// packages/domain/src/customers.ts. Importing this entry exposes definitions; it does not call them.
export {
  createCustomerNoteForUser,
  createCustomerNoteInputSchema,
  createCustomerForUser,
  createCustomerInputSchema,
  getCustomerCollectionForUser,
  getCustomerBusinessForUser,
  getCustomerWithNotesForUser,
  listCustomersForUser,
  customerSearchInputSchema,
  updateCustomerForUser,
} from "./customers";
// Re-export connection: { CreateCustomerInput as CustomerFormInput, CreateCustomerNoteInput } ->
// packages/domain/src/customers.ts. Importing this entry exposes definitions; it does not call them.
export type { CreateCustomerInput as CustomerFormInput, CreateCustomerNoteInput } from "./customers";
