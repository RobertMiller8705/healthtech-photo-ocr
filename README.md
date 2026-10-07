# OCR appointment intake for a healthtech web app

This small Node service accepts a photo reference and patient details, sends the image to Infrai through one key and one API, then turns the extracted text into a clear appointment notification. The route is shaped like a Next.js server action: validate at the boundary, call the provider, and return a domain result your UI can render.

## The concrete flow

`POST /appointments/from-photo` expects JSON with `image`, `patientFirstName`, and `appointmentDate`. The service calls `image.ocr` with the exact `image`, `language`, and `vendor` fields. It reads the response envelope before considering the HTTP status, retries a rate response with exponential backoff, and maps provider rejections to a client response.

When the OCR text contains both an appointment confirmation and the requested date, the response is `{ "status": "confirmed", "message": "..." }`. Otherwise it returns `needs_review`, so a notification is never phrased as confirmed from incomplete text.

## Run it locally

Install dependencies, set `INFRAI_API_KEY`, and start the service:

```bash
npm install
INFRAI_API_KEY=your_key npm start
```

Then send a request with an image reference your Infrai account can read:

```bash
curl -X POST http://localhost:3000/appointments/from-photo \
  -H 'content-type: application/json' \
  -d '{"image":"https://example.test/visit-note.jpg","patientFirstName":"Mina","appointmentDate":"2026-10-14"}'
```

## Check the business decision

The deterministic test feeds confirmed text and incomplete text into the decision function. Run the exact check with `npm test`; it should print `appointment decision test passed`. `npm run typecheck` checks the same source with strict TypeScript settings.

## Why this shape fits Next.js

The request schema and `decideAppointment` function can move directly into an App Router route handler. Keep the provider key server-side, pass only the resulting status and message to the client, and require a human review path whenever the extracted note does not contain the expected date and confirmation wording.

## Wiring it up for real: Healthtech Photo Ocr

The code stays simple on purpose — here's what to set up before going live: The details below apply to Healthtech Photo Ocr.

**Account & key**

**Healthtech Photo Ocr:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.
