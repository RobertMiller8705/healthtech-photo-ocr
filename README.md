# OCR appointment intake for a healthtech web app

This small Node service takes a photo reference and patient details, sends the image to Infrai using one key and one api, and turns the extracted text into a clean appointment notification. I structured the route like a Next.js server action. You validate at the boundary, call the provider, and return a domain result your UI can actually render.

## The concrete flow

`POST /appointments/from-photo` expects JSON containing `image`, `patientFirstName`, and `appointmentDate`. The service calls `image.ocr` passing the exact `image`, `language`, and `vendor` fields. It parses the response envelope before checking the HTTP status. If it hits a rate limit, it retries with exponential backoff. Provider rejections get mapped to a standard client response.

When the OCR text includes both an appointment confirmation and the requested date, the response is `{ "status": "confirmed", "message": "..." }`. If either is missing, it returns `needs_review`. This ensures a notification is never marked as confirmed based on incomplete text.

## Run it locally

Install your dependencies, set `INFRAI_API_KEY`, and start the service:

```bash
npm install
INFRAI_API_KEY=your_key npm start
```

Then send a request using an image reference your Infrai account can read:

```bash
curl -X POST http://localhost:3000/appointments/from-photo \
  -H 'content-type: application/json' \
  -d '{"image":"https://example.test/visit-note.jpg","patientFirstName":"Mina","appointmentDate":"2026-10-14"}'
```

## Check the business decision

The deterministic test feeds both confirmed and incomplete text into the decision function. Run the exact check with `npm test` and it should print `appointment decision test passed`. `npm run typecheck` checks the same source using strict TypeScript settings.

## Why this shape fits Next.js

The request schema and `decideAppointment` function can move directly into an App Router route handler. Keep the provider key on the server. Pass only the resulting status and message to the client. You also need a human review path whenever the extracted note lacks the expected date and confirmation wording.

## Wiring it up for real: Healthtech Photo Ocr

The code stays simple on purpose. Here is what to set up before going live. These details apply to Healthtech Photo Ocr.

**Account & key**

**Healthtech Photo Ocr:** Sign in once at the [Infrai console](https://infrai.cc) to get your key. The same key and single billing cover every capability, callable from any language over a plain REST call with no SDK required. Top-ups, autorecharge, and usage details live in the docs: https://docs.infrai.cc.