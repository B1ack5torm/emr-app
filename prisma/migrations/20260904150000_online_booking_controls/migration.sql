-- Public booking is opt-in at both the hospital and practitioner levels.
ALTER TABLE "Organization"
ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PractitionerProfile"
ADD COLUMN "acceptsOnlineAppointments" BOOLEAN NOT NULL DEFAULT false;
