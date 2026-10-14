import { z } from "zod";

const DateTime = z.coerce.date();

export const CreateAppointmentService = z.object({
  service_id: z.string().min(1),
  quantity: z.number().int().positive().max(100),
});

export const CreateAppointment = z
  .object({
    customer_id: z.string().min(1),
    employee_id: z.string().min(1),
    location_id: z.string().min(1),
    appointment_date: DateTime,
    start_time: DateTime,
    end_time: DateTime,
    status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"]).default("SCHEDULED"),
    notes: z.string().trim().max(2000).default(""),
    services: z.array(CreateAppointmentService).min(1),
  })
  .refine((value) => value.end_time > value.start_time, {
    path: ["end_time"],
    message: "End time must be after start time",
  })
  .refine((value) => new Set(value.services.map((item) => item.service_id)).size === value.services.length, {
    path: ["services"],
    message: "A service can only be added once per appointment",
  });

export type CreateAppointmentInput = z.infer<typeof CreateAppointment>;
export type CreateAppointmentServiceInput = z.infer<typeof CreateAppointmentService>;
