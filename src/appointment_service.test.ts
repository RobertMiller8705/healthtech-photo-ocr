import { strict as assert } from "node:assert";
import { decideAppointment } from "./appointment_service.ts";

const confirmed = decideAppointment("Appointment confirmed for 2026-10-14", "Mina", "2026-10-14");
assert.equal(confirmed.status, "confirmed");
assert.match(confirmed.message, /Mina/);

const review = decideAppointment("Please call the clinic", "Mina", "2026-10-14");
assert.equal(review.status, "needs_review");
console.log("appointment decision test passed");
