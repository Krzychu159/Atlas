import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { deferred, find, hooks, load, settle } from "./owner-read-harness.mjs";

class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const backend = { ApiError, getErrorMessage: (_error, fallback) => fallback };
const helpers = load("app/lib/trainer/client-create.ts", { "../backend": backend });
const validForm = { ...helpers.emptyTrainerClientForm, firstName: " Anna ", lastName: " Kowalska ", locationId: "2" };
const plain = value => JSON.parse(JSON.stringify(value));

test("the client is created through the trainer portal, without a trainer id", async () => {
  const calls = [];
  const portal = load("app/lib/trainer/portal.ts", { "../backend": { backendPost: async (path, body) => { calls.push([path, body]); return { id: 7 }; } } });
  const payload = helpers.toCreateTrainerClientPayload({ ...validForm, email: " anna@example.com ", phoneNumber: " 500600700 ", goal: " Redukcja ", notes: " Kolano ", trainingStartDate: "2026-11-05" });
  await portal.createTrainerPortalClient(payload);
  assert.equal(calls[0][0], "trainer-portal/clients");
  assert.deepEqual(plain(calls[0][1]), { firstName: "Anna", lastName: "Kowalska", locationId: 2, email: "anna@example.com", phoneNumber: "500600700", goal: "Redukcja", notes: "Kolano", trainingStartDate: "2026-11-05", nextSessionAt: null });
});

test("optional fields left empty are sent as null", () => {
  assert.deepEqual(plain(helpers.toCreateTrainerClientPayload(validForm)), { firstName: "Anna", lastName: "Kowalska", locationId: 2, email: null, phoneNumber: null, goal: null, notes: null, trainingStartDate: null, nextSessionAt: null });
});

test("validation requires a name and a location and checks the e-mail only when given", () => {
  assert.deepEqual(plain(helpers.validateTrainerClientForm(validForm)), {});
  assert.deepEqual(Object.keys(helpers.validateTrainerClientForm(helpers.emptyTrainerClientForm)).sort(), ["firstName", "lastName", "locationId"]);
  assert.deepEqual(Object.keys(helpers.validateTrainerClientForm({ ...validForm, firstName: "   " })), ["firstName"]);
  assert.deepEqual(Object.keys(helpers.validateTrainerClientForm({ ...validForm, email: "anna@" })), ["email"]);
  assert.deepEqual(plain(helpers.validateTrainerClientForm({ ...validForm, email: "anna@example.com" })), {});
});

test("rejected saves become Polish messages and never show the backend text", () => {
  const failure = (message, status = 400) => plain(helpers.trainerClientCreateError(new ApiError(message, status)));
  assert.match(failure("Trainer does not work at this location.").fields.locationId, /lokalizacji, w której pracujesz/);
  assert.equal(failure("Trainer does not work at this location.").message, helpers.TRAINER_CLIENT_FIX_FIELDS);
  assert.match(failure("Invalid email address.").fields.email, /poprawny adres e-mail/);
  assert.deepEqual(Object.keys(failure("First name and last name are required.").fields).sort(), ["firstName", "lastName"]);
  assert.match(failure("Cannot assign another trainer.").message, /swojej listy/);
  for (const message of ["Something unexpected", "Coś poszło nie tak po stronie serwera"]) assert.match(failure(message).message, /Sprawdź wpisane dane/);
  assert.match(failure("Forbidden", 403).message, /Nie masz uprawnień/);
  assert.match(failure("Conflict", 409).message, /Sprawdź listę klientów/);
  assert.match(failure("NullReferenceException at Foo.Bar()", 500).message, /Nie udało się dodać klienta/);
  for (const status of [400, 403, 409, 500]) assert.doesNotMatch(failure("Raw trainer location", status).message, /Raw|trainer|location/);
  assert.match(helpers.trainerClientCreateError(new Error("offline")).message, /Nie udało się dodać klienta/);
});

function renderModal({ me = { locationIds: [2, 5], locationNames: ["Centrum", "Mokotów"] }, create } = {}) {
  const h = hooks();
  const calls = { create: [], created: 0 };
  const modal = load("app/(app)/trainer/clients/components/AddTrainerClientModal.tsx", {
    react: h.react,
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/app/lib/trainer/client-create": helpers,
    "@/app/lib/trainer/portal": {
      getTrainerPortalMe: async () => { if (me instanceof Error) throw me; return me; },
      createTrainerPortalClient: payload => { calls.create.push(plain(payload)); return create ? create() : Promise.resolve({ id: 7, fullName: "Anna Kowalska" }); },
    },
    "@/app/lib/trainer/portal-mappers": load("app/lib/trainer/portal-mappers.ts"),
    "@/app/(app)/owner/components/location-options": load("app/(app)/owner/components/location-options.ts"),
  });
  const render = () => h.render(modal.default, { onClose() {}, onCreated: () => { calls.created += 1; } });
  const field = label => find(render(), el => el.props?.label === label);
  return {
    render, field, calls,
    async start() { render(); h.commit(); await settle(); },
    fill(values) { for (const [label, value] of Object.entries(values)) field(label).props.onChange(value); },
    submit: () => find(render(), el => el.type === "form").props.onSubmit({ preventDefault() {} }),
    submitButton: () => find(render(), el => el.props?.type === "submit"),
    text: () => JSON.stringify(render()),
  };
}

test("only the trainer's own locations are offered and a single one is preselected", async () => {
  const many = renderModal();
  await many.start();
  assert.deepEqual(plain(many.field("Lokalizacja").props.options.map(option => option.label)), ["Wybierz lokalizację", "Centrum", "Mokotów"]);
  assert.equal(many.field("Lokalizacja").props.value, "");

  const one = renderModal({ me: { locationIds: [5], locationNames: ["Mokotów"] } });
  await one.start();
  assert.equal(one.field("Lokalizacja").props.value, "5");
});

test("a double submit sends one request and the save ends with the notice about missing access", async () => {
  const pending = deferred();
  const modal = renderModal({ create: () => pending.promise });
  await modal.start();
  modal.fill({ "Imię": "Anna", "Nazwisko": "Kowalska", "Lokalizacja": "2" });
  const first = modal.submit();
  const second = modal.submit();
  assert.equal(modal.calls.create.length, 1);
  assert.equal(modal.submitButton().props.disabled, true);
  pending.resolve({ id: 7, fullName: "Anna Kowalska" });
  await Promise.all([first, second]);
  assert.equal(modal.calls.created, 1);
  assert.match(modal.text(), /Brak dostępu do panelu klienta/);
  assert.match(modal.text(), /wyślij jej zaproszenie/);
  find(modal.render(), el => el.props?.icon && el.props?.children === "Wyślij zaproszenie").props.onClick();
  const invite = modal.render();
  assert.deepEqual(plain(invite.props.client), { id: 7, email: null, locationId: 2, portalAccessStatus: "NoAccount" });
});

test("a rejected save keeps the entered data and allows another attempt", async () => {
  let attempts = 0;
  const modal = renderModal({ create: async () => { attempts += 1; if (attempts === 1) throw new ApiError("Trainer does not work at this location.", 400); return { id: 7 }; } });
  await modal.start();
  modal.fill({ "Imię": "Anna", "Nazwisko": "Kowalska", "Lokalizacja": "2", "Telefon (opcjonalnie)": "500600700" });
  await modal.submit();
  assert.equal(modal.calls.created, 0);
  assert.equal(modal.field("Imię").props.value, "Anna");
  assert.equal(modal.field("Telefon (opcjonalnie)").props.value, "500600700");
  assert.match(modal.text(), /lokalizacji, w której pracujesz/);
  assert.doesNotMatch(modal.text(), /Trainer does not work/);
  await modal.submit();
  assert.equal(modal.calls.create.length, 2);
  assert.equal(modal.calls.created, 1);
});

test("invalid data stops before sending", async () => {
  const modal = renderModal();
  await modal.start();
  await modal.submit();
  assert.equal(modal.calls.create.length, 0);
  assert.equal(modal.field("Imię").props.error, "Podaj imię klienta.");
  assert.match(modal.text(), /Wybierz lokalizację klienta/);
});

test("a trainer without locations cannot submit and an unavailable list can be retried", async () => {
  const none = renderModal({ me: { locationIds: [], locationNames: [] } });
  await none.start();
  assert.equal(none.submitButton().props.disabled, true);
  assert.match(none.text(), /Nie pracujesz jeszcze w żadnej lokalizacji/);

  const failed = renderModal({ me: new Error("offline") });
  await failed.start();
  assert.match(failed.text(), /Nie udało się pobrać Twoich lokalizacji/);
  assert.match(failed.text(), /Spróbuj ponownie/);
});

test("the trainer list shows the new client after the save and owner endpoints stay unused", () => {
  const page = fs.readFileSync("app/(app)/trainer/clients/page.tsx", "utf8");
  assert.match(page, /sort: "newest"/);
  assert.match(page, /onCreated=\{handleClientCreated\}/);
  const modal = fs.readFileSync("app/(app)/trainer/clients/components/AddTrainerClientModal.tsx", "utf8");
  assert.doesNotMatch(modal, /lib\/owner/);
  assert.doesNotMatch(modal, /trainerId/);
});
