import test from "node:test";
import assert from "node:assert/strict";
import { deferred, find, hooks, load, settle } from "./owner-read-harness.mjs";

class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const plain = value => JSON.parse(JSON.stringify(value));
const ownerInvitations = load("app/lib/owner/invitations.ts", { "../backend": {} });
const makeLib = (backend = {}) => load("app/lib/trainer/invitations.ts", {
  "../backend": { ApiError, getErrorMessage: (_error, fallback) => fallback, ...backend },
  "../owner/invitations": ownerInvitations,
});
const lib = makeLib();
const helpers = load("app/lib/trainer/client-create.ts", { "../backend": { ApiError, getErrorMessage: (_error, fallback) => fallback } });
const client = { id: 7, email: "anna@example.com", locationId: 2, portalAccessStatus: "NoAccount" };

test("invitations use only the trainer portal endpoints", async () => {
  const calls = [];
  const record = method => async (path, second) => { calls.push([method, path, second]); return []; };
  const api = makeLib({ backendGet: record("GET"), backendPost: record("POST") });
  const payload = { clientId: 7, email: "anna@example.com", role: "Client", locationId: 2 };
  await api.getTrainerInvitations({ Role: "Client" });
  await api.createTrainerClientInvitation(payload);
  await api.resendTrainerInvitation(4);
  await api.cancelTrainerInvitation(4);
  assert.deepEqual(plain(calls), [
    ["GET", "trainer-portal/invitations", { Role: "Client" }],
    ["POST", "trainer-portal/invitations", payload],
    ["POST", "trainer-portal/invitations/4/resend", null],
    ["POST", "trainer-portal/invitations/4/cancel", null],
  ]);
});

test("only clients without an account or with a pending invitation can be invited", () => {
  assert.equal(lib.canInviteClient("NoAccount"), true);
  assert.equal(lib.canInviteClient("Invited"), true);
  for (const status of ["Active", "Blocked", null, undefined]) assert.equal(lib.canInviteClient(status), false);
});

test("the list keeps only pending invitations of this client", () => {
  const invitation = overrides => ({ id: 1, clientId: 7, email: "anna@example.com", isAccepted: false, acceptedAt: null, cancelledAt: null, status: "Pending", ...overrides });
  const ids = list => plain(lib.pendingClientInvitations(list, client).map(item => item.id));
  assert.deepEqual(ids([invitation({ id: 1 }), invitation({ id: 2, clientId: 8 }), invitation({ id: 3, cancelledAt: "2026-11-01" }), invitation({ id: 4, isAccepted: true })]), [1]);
  assert.deepEqual(ids([invitation({ id: 5, clientId: null, email: " ANNA@example.com " }), invitation({ id: 6, clientId: null, email: "inna@example.com" })]), [5]);
});

test("failed actions become Polish messages and never show the backend text", () => {
  const failure = (message, status = 400) => plain(lib.trainerInvitationError(new ApiError(message, status)));
  assert.match(failure("User with this email already exists.").message, /ma już konto/);
  assert.equal(failure("Invalid email.").emailError, lib.INVITATION_EMAIL_INVALID);
  assert.match(failure("Trainer does not work at this location.").message, /lokalizacji, w której pracujesz/);
  assert.match(failure("Client is not assigned to this trainer.").message, /swoim klientom/);
  assert.match(failure("Unexpected").message, /Nie udało się wysłać/);
  assert.match(failure("Forbidden", 403).message, /Nie masz uprawnień/);
  assert.match(failure("Conflict", 409).message, /ma już konto/);
  assert.match(failure("Stack trace", 500).message, /Nie udało się wysłać/);
  for (const status of [400, 403, 404, 409, 500]) assert.doesNotMatch(failure("Raw location of client", status).message, /Raw|location|client/);
});

function renderModal({ status = "NoAccount", create, list = [] } = {}) {
  const h = hooks();
  const calls = { create: [], resend: [], cancel: [], closed: 0, changed: 0, toasts: [], lists: 0 };
  const modal = load("app/(app)/trainer/clients/components/TrainerInviteClientModal.tsx", {
    react: h.react,
    "@/app/components/ui/app-toast": { showAppSuccess: message => calls.toasts.push(message) },
    "@/app/lib/trainer/client-create": helpers,
    "@/app/lib/trainer/invitations": {
      ...lib,
      getTrainerInvitations: async () => { calls.lists += 1; if (list instanceof Error) throw list; return list; },
      createTrainerClientInvitation: payload => { calls.create.push(plain(payload)); return create ? create() : Promise.resolve({ id: 1 }); },
      resendTrainerInvitation: async id => { calls.resend.push(id); return { id }; },
      cancelTrainerInvitation: async id => { calls.cancel.push(id); },
    },
  });
  const props = { client: { ...client, portalAccessStatus: status }, onClose: () => { calls.closed += 1; }, onChanged: () => { calls.changed += 1; } };
  const render = () => h.render(modal.default, props);
  return {
    calls, render, h,
    async start() { render(); h.commit(); await settle(); },
    submit: () => find(render(), el => el.type === "form").props.onSubmit({ preventDefault() {} }),
    email: () => find(render(), el => el.props?.label === "E-mail"),
    list: () => find(render(), el => "invitations" in (el.props || {})),
    text: () => JSON.stringify(render()),
  };
}

test("the address is prefilled, a double submit sends once and the caller refreshes", async () => {
  const pending = deferred();
  const modal = renderModal({ create: () => pending.promise });
  await modal.start();
  assert.equal(modal.email().props.value, "anna@example.com");
  const first = modal.submit();
  const second = modal.submit();
  assert.equal(modal.calls.create.length, 1);
  assert.deepEqual(modal.calls.create[0], { clientId: 7, email: "anna@example.com", role: "Client", locationId: 2 });
  pending.resolve({ id: 1, token: "secret" });
  await Promise.all([first, second]);
  assert.equal(modal.calls.changed, 1);
  assert.match(modal.calls.toasts[0], /zostało wysłane/);
  assert.doesNotMatch(modal.text(), /secret/);
});

test("an invalid address stops before sending and a rejection keeps the address", async () => {
  const modal = renderModal({ create: async () => { throw new ApiError("Invalid email.", 400); } });
  await modal.start();
  modal.email().props.onChange("anna@");
  await modal.submit();
  assert.equal(modal.calls.create.length, 0);
  assert.equal(modal.email().props.error, lib.INVITATION_EMAIL_INVALID);
  modal.email().props.onChange("anna@example.pl");
  await modal.submit();
  assert.equal(modal.calls.create.length, 1);
  assert.equal(modal.email().props.value, "anna@example.pl");
  assert.equal(modal.calls.changed, 0);
  assert.doesNotMatch(modal.text(), /Invalid email/);
});

test("an undelivered message stays visible and closing still refreshes the caller", async () => {
  const modal = renderModal({ create: async () => ({ id: 1, lastSendError: "SMTP 550 mailbox" }) });
  await modal.start();
  await modal.submit();
  assert.equal(modal.calls.changed, 0);
  assert.match(modal.text(), /Nie udało się dostarczyć wiadomości/);
  assert.doesNotMatch(modal.text(), /SMTP/);
  find(modal.render(), el => el.props?.children === "Zamknij").props.onClick();
  assert.equal(modal.calls.changed, 1);
  assert.equal(modal.calls.closed, 0);
});

test("a pending invitation can be resent and cancelled", async () => {
  const invitation = { id: 4, clientId: 7, email: "anna@example.com", isAccepted: false, status: "Pending" };
  const modal = renderModal({ status: "Invited", list: [invitation] });
  await modal.start();
  assert.equal(modal.email(), null);
  assert.deepEqual(plain(modal.list().props.invitations.map(item => item.id)), [4]);
  await modal.list().props.onResend(4);
  assert.deepEqual(modal.calls.resend, [4]);
  assert.match(modal.calls.toasts[0], /ponowione/);
  await modal.list().props.onCancel(4);
  assert.deepEqual(modal.calls.cancel, [4]);
  assert.equal(modal.calls.changed, 1);
});

test("an invitation sent by the studio or an unavailable list does not look like a dead end", async () => {
  const empty = renderModal({ status: "Invited" });
  await empty.start();
  assert.match(empty.text(), /poproś właściciela studia o ponowienie/);

  const failed = renderModal({ status: "Invited", list: new Error("offline") });
  await failed.start();
  assert.match(failed.text(), /Nie udało się pobrać zaproszenia/);
  assert.match(failed.text(), /Spróbuj ponownie/);
});
