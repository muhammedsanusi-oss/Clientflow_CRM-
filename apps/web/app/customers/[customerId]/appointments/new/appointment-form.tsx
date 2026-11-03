"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  scheduleAppointmentAction,
  type ScheduleAppointmentActionState,
} from "./actions";

type Option = {
  id: string;
  name: string;
};

type ServiceOption = Option & {
  duration_minutes: number;
};

type AppointmentFormProps = {
  customerId: string;
  defaultDate: string;
  locations: Option[];
  services: ServiceOption[];
  timeSlots: string[];
};

const initialState: ScheduleAppointmentActionState = {};

function displayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

export function AppointmentForm({
  customerId,
  defaultDate,
  locations,
  services,
  timeSlots,
}: AppointmentFormProps) {
  const [state, formAction, pending] = useActionState(
    scheduleAppointmentAction,
    initialState,
  );
  const noOptions = locations.length === 0 || services.length === 0;

  function fieldError(field: keyof NonNullable<typeof state.fieldErrors>) {
    return state.fieldErrors?.[field]?.[0];
  }

  const dateError = fieldError("date");
  const timeError = fieldError("startTime");
  const serviceError = fieldError("serviceId");
  const locationError = fieldError("locationId");
  const detailsError = fieldError("details");

  return (
    <form action={formAction} noValidate aria-busy={pending} className="space-y-6">
      <input type="hidden" name="customerId" value={customerId} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {state.error.message}
        </div>
      ) : null}

      {noOptions ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          An active service and location are required before scheduling.
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={state.values?.date ?? defaultDate}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? "date-error" : undefined}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
          {dateError ? (
            <p id="date-error" className="mt-1 text-sm text-red-700">
              {dateError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="startTime" className="mb-1 block text-sm font-medium">
            Time
          </label>
          <select
            id="startTime"
            name="startTime"
            defaultValue={state.values?.startTime ?? "07:00"}
            aria-invalid={Boolean(timeError)}
            aria-describedby={timeError ? "time-error" : "time-help"}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            {timeSlots.map((time) => (
              <option key={time} value={time}>
                {displayTime(time)}
              </option>
            ))}
          </select>
          <p id="time-help" className="mt-1 text-xs text-neutral-500">
            Appointments use 30-minute time slots.
          </p>
          {timeError ? (
            <p id="time-error" className="mt-1 text-sm text-red-700">
              {timeError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="serviceId" className="mb-1 block text-sm font-medium">
            What does the customer want?
          </label>
          <select
            id="serviceId"
            name="serviceId"
            defaultValue={state.values?.serviceId ?? services[0]?.id ?? ""}
            aria-invalid={Boolean(serviceError)}
            aria-describedby={serviceError ? "service-error" : undefined}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            {services.length === 0 ? (
              <option value="">No active services</option>
            ) : null}
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.duration_minutes} minutes)
              </option>
            ))}
          </select>
          {serviceError ? (
            <p id="service-error" className="mt-1 text-sm text-red-700">
              {serviceError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="locationId" className="mb-1 block text-sm font-medium">
            Location
          </label>
          <select
            id="locationId"
            name="locationId"
            defaultValue={state.values?.locationId ?? locations[0]?.id ?? ""}
            aria-invalid={Boolean(locationError)}
            aria-describedby={locationError ? "location-error" : undefined}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            {locations.length === 0 ? (
              <option value="">No active locations</option>
            ) : null}
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {locationError ? (
            <p id="location-error" className="mt-1 text-sm text-red-700">
              {locationError}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="details" className="mb-1 block text-sm font-medium">
          Appointment details (optional)
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          maxLength={1_000}
          defaultValue={state.values?.details}
          aria-invalid={Boolean(detailsError)}
          aria-describedby={detailsError ? "details-error" : undefined}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
        {detailsError ? (
          <p id="details-error" className="mt-1 text-sm text-red-700">
            {detailsError}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || noOptions}
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-live="polite">
            {pending ? "Scheduling..." : "Schedule appointment"}
          </span>
        </button>
        <Link
          href={`/customers/${customerId}`}
          className="text-sm text-neutral-700 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
