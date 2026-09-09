// Local-only fake backend for acceptance checks. Never imported by app/.
import http from 'node:http';
const bookings = new Map();
const locations = [{ id: 4, name: 'Kłaj', city: 'Kłaj', address: 'Adres testowy 4' }, { id: 5, name: 'Niepołomice', city: 'Niepołomice', address: 'Adres testowy 5' }];
const packages = [
  { id: 10, name: 'Pojedyncze wejście', price: 59, entriesCount: 1, durationDays: 14 },
  { id: 12, name: 'Pakiet 8 wejść', price: 349, entriesCount: 8, durationDays: 30 },
  { id: 13, name: 'Pakiet 4 wejścia', price: 199, entriesCount: 4, durationDays: 30 },
].map(item => ({ ...item, currency: 'PLN', description: 'Pakiet testowy do weryfikacji rezerwacji.', locationId: 4, locationName: 'Kłaj', publicSlug: `package-${item.id}` }));
function sessions(day, locationId, token) {
  return ['Full Body', 'Cross & Conditioning', 'Mobility & Core', 'Trening Siłowy'].map((title, i) => ({
    id: 88 + i, title, note: 'Opis testowy zajęć grupowych. Trening w kameralnej grupie prowadzony przez instruktora.',
    startAt: `${day}T${18 + i}:00:00`, endAt: `${day}T${19 + i}:00:00`, trainerId: i + 1,
    trainerFullName: ['Szymon Testowy', 'Marek Testowy', 'Anna Testowa', 'Karolina Testowa'][i],
    locationId, locationName: locations.find(l => l.id === locationId)?.name || 'Kłaj', capacity: 12,
    bookedSeats: (i === 3 ? 12 : i === 1 ? 10 : 4) + (bookings.get(token)?.has(88 + i) ? 1 : 0),
    availableSeats: (i === 3 ? 0 : i === 1 ? 2 : 8) - (bookings.get(token)?.has(88 + i) ? 1 : 0),
    isFullyBooked: i === 3, isBookedByCurrentClient: bookings.get(token)?.has(88 + i) || false,
    publicSlug: `class-${88 + i}-${day}`,
  }));
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(status === 204 ? undefined : JSON.stringify(body)); };
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  if (/\/(?:Auth\/login|public\/group-classes\/register)$/i.test(path)) {
    if (payload.email === 'exists@example.test') return respond(409, { message: 'Email already exists.' });
    return respond(200, { token: 'fixture-client', refreshToken: 'fixture-refresh', userId: 123, email: payload.email, role: 'Client' });
  }
  if (token === 'expired') return respond(401, { message: 'Expired' });
  if (req.method === 'GET') {
    if (path.endsWith('/locations')) return respond(200, locations);
    if (path.endsWith('/packages')) return respond(200, Number(url.searchParams.get('locationId')) === 5 ? [] : packages);
    if (path.includes('/packages/by-slug/')) return respond(200, packages[0]);
    if (path.includes('/by-slug/')) {
      const match = path.match(/class-(\d+)-(\d{4}-\d{2}-\d{2})$/);
      if (!match) return respond(404, { message: 'Class not found.' });
      return respond(200, sessions(match[2], 4, token).find(s => s.id === Number(match[1])));
    }
    if (path.endsWith('/group-classes')) {
      const locationId = Number(url.searchParams.get('locationId'));
      return respond(200, locationId === 5 ? [] : sessions((url.searchParams.get('from') || '2026-09-11').slice(0, 10), locationId, token));
    }
    if (/\/group-classes\/\d+$/.test(path)) return respond(200, sessions('2026-09-11', 4, token)[0]);
  }
  if (!token) return respond(401, { message: 'Unauthorized' });
  if (path.endsWith('/purchases/me')) return respond(200, { clientPackageId: 77, packageId: 12, packageName: 'Pakiet 8 wejść', amountDue: 349, currency: 'PLN', paymentStatus: 'Unpaid', entriesCount: 8, remainingEntries: 8, validUntil: '2026-10-11T00:00:00' });
  if (path.endsWith('/bookings/me')) {
    const id = Number(path.split('/').at(-3));
    if (!bookings.has(token)) bookings.set(token, new Set());
    if (req.method === 'DELETE') { bookings.get(token).delete(id); return respond(204); }
    if (id === 91) return respond(409, { message: 'Class is fully booked.' });
    if (bookings.get(token).has(id)) return respond(409, { message: 'Client is already booked.' });
    bookings.get(token).add(id);
    return respond(200, { sessionId: id, clientId: 55, sessionParticipantId: 301, clientPackageId: 77, status: 'Planned', remainingEntries: 7 });
  }
  if (path.endsWith('/client-portal/payments')) return respond(200, { id: 1, status: 1 });
  respond(404, { message: 'Unknown test endpoint' });
});
server.listen(4010, '127.0.0.1', () => console.log('Fixture backend: http://127.0.0.1:4010'));
