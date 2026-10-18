import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] ?? {}, URLSearchParams, URL, Headers, Request, Response, Event, CustomEvent, AbortController, AbortSignal, DOMException, setTimeout, clearTimeout, window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setInterval() { return 0; }, clearInterval() {} }, ...globals });
  return exports;
}

test('notification API uses contract query parameters and accepts empty responses', async () => {
  const requests = [];
  const backend = load('app/lib/backend.ts', {}, { fetch: async (url, options) => {
    requests.push({ url, options });
    return new Response(null, { status: options.method === 'POST' ? 204 : 200, headers: { 'content-type': 'application/json' } });
  } });
  const api = load('app/lib/notifications.ts', { '@/app/lib/backend': backend });
  await api.getNotificationCategories();
  assert.equal(requests.at(-1).url, '/api/backend/Notifications/categories');
  await api.getNotifications();
  assert.equal(requests.at(-1).url, '/api/backend/Notifications?limit=50');
  for (const isRead of [false, true]) {
    await api.getNotifications({ category: 'payments', isRead });
    const url = new URL(requests.at(-1).url, 'https://atlas.local');
    assert.equal(url.searchParams.get('category'), 'payments');
    assert.equal(url.searchParams.get('isRead'), String(isRead));
  }
  await api.getNotifications({ isRead: true });
  assert.equal(new URL(requests.at(-1).url, 'https://atlas.local').searchParams.has('category'), false);
  await api.getUnreadNotificationCount();
  assert.equal(requests.at(-1).url, '/api/backend/Notifications/unread-count');
  for (const category of [undefined, 'payments']) {
    assert.equal(await api.markAllNotificationsAsRead(category), null);
    assert.equal(requests.at(-1).url, '/api/backend/Notifications/read-all' + (category ? '?category=payments' : ''));
    assert.equal(requests.at(-1).options.body, undefined);
  }
  assert.equal(await api.markNotificationAsRead(42), null);
  assert.equal(requests.at(-1).url, '/api/backend/Notifications/42/read');
  assert.equal(requests.at(-1).options.body, undefined);
});

const jsx = (type, props) => ({ type, props });
function descendants(tree) {
  if (!tree || typeof tree !== 'object') return [];
  const children = [tree.props?.children].flat(Infinity);
  return [tree, ...children.flatMap(descendants)];
}
function renderCard({ isRead = false, actionUrl = '/owner/payments?clientId=5', type = 'PaymentPendingConfirmation', category = 'payments', mark = async () => {}, timers = {}, variant = "panel", expanded = false, onToggle = () => {} } = {}) {
  const navigations = [];
  const api = load('app/lib/notifications.ts');
  const component = load('app/(app)/owner/components/Notification.tsx', {
    react: { useRef: () => ({ current: null }), useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: href => navigations.push(href) }), usePathname: () => '/owner/notifications' },
    './notification-display': load('app/(app)/owner/components/notification-display.ts'),
    '@/app/lib/notifications': api,
    '@/app/lib/payment-notification-target': { resolvePaymentNotificationTarget: async (_item, _role, destination) => destination },
  }, timers);
  return { navigations, tree: component.default({ item: { id: 1, type, category, createdAt: new Date().toISOString(), title: 'Płatność', isRead, actionUrl }, role: 'owner', variant, expanded, onToggle, onMarkAsRead: mark }) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('unread panel card marks once before navigating to the selected notification', async () => {
  let resolveRead;
  let posts = 0;
  const { tree, navigations } = renderCard({ mark: () => { posts++; return new Promise(resolve => { resolveRead = resolve; }); } });
  tree.props.children[0].props.onClick(); tree.props.children[0].props.onClick();
  assert.equal(posts, 1); assert.equal(navigations.length, 0);
  resolveRead(); await tick();
  assert.deepEqual(navigations, ['/owner/clients/5/payments']);
});
test('read panel card skips POST; missing actionUrl still opens the full notification', async () => {
  let posts = 0;
  const read = renderCard({ isRead: true, mark: async () => { posts++; } });
  read.tree.props.children[0].props.onClick(); await tick();
  assert.equal(posts, 0); assert.equal(read.navigations.length, 1);
  const noUrl = renderCard({ actionUrl: null, type: 'SystemAnnouncement', category: 'system', mark: async () => { posts++; } });
  noUrl.tree.props.children[0].props.onClick(); await tick();
  assert.equal(posts, 1); assert.deepEqual(noUrl.navigations, ['/owner/notifications?notificationId=1']);
});
test('details CTA navigates exactly once using actionUrl', async () => {
  let posts = 0;
  const { tree, navigations } = renderCard({ variant: 'page', expanded: true, mark: async () => { posts++; } });
  const cta = descendants(tree).find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.some(value => typeof value === 'string' && value.includes('Przejdź do szczegółów')));
  cta.props.onClick();
  // CTA is a sibling of the summary button, so it has no parent click handler.
  assert.equal(tree.props.onClick, undefined);
  await tick();
  assert.equal(posts, 1); assert.deepEqual(navigations, ['/owner/clients/5/payments']);
});
test('failed or slow mark-read never blocks navigation', async () => {
  const failed = renderCard({ mark: async () => { throw Error('offline'); } });
  failed.tree.props.children[0].props.onClick(); await tick();
  assert.equal(failed.navigations.length, 1);
  const slow = renderCard({ mark: () => new Promise(() => {}), timers: { setTimeout: callback => { queueMicrotask(callback); return 1; }, clearTimeout() {} } });
  slow.tree.props.children[0].props.onClick(); await tick();
  assert.equal(slow.navigations.length, 1);
});
test('category pills show only positive authoritative counts; read filters stay separate', () => {
  const component = load('app/(app)/owner/components/NotificationFilters.tsx', { 'react/jsx-runtime': { jsx, jsxs: jsx } });
  const choices = [];
  const tree = component.default({ category: 'payments', setCategory: key => choices.push(key), readFilter: '', setReadFilter: key => choices.push(key), categories: [{ key: 'payments', label: 'Płatności' }, { key: 'schedule', label: 'Grafik' }], counts: { unreadCount: 5, unreadByCategory: { payments: 2, schedule: 0 } } });
  const nodes = descendants(tree);
  assert.deepEqual(nodes.filter(node => node.type === 'span').map(node => node.props.children), [5, 2]);
  const buttons = nodes.filter(node => node.type === 'button');
  assert.equal(buttons[1].props['aria-pressed'], true);
  buttons[0].props.onClick(); buttons[4].props.onClick(); buttons[5].props.onClick();
  assert.deepEqual(choices, ['', 'false', 'true']);
  assert.equal(component.markAllLabel('payments', []), 'Oznacz wszystkie w Płatnościach jako przeczytane');
});

function hookHarness(api, options = [], windowStub) {
  const slots = []; let cursor = 0; let effects = []; let dirty = false;
  const same = (a, b) => a?.length === b?.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true; }]; },
    useRef(value) { const i = cursor++; slots[i] ??= { current: value }; return slots[i]; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const hook = load('app/lib/use-notifications.ts', { react, sonner: { toast: { error() {} } }, './backend': { getErrorMessage: error => error.message, isAbortError: error => error?.name === 'AbortError' }, './notifications': api }, windowStub ? { window: windowStub } : {});
  let state;
  function render() { cursor = 0; dirty = false; state = hook.useNotifications(...options); const pending = effects; effects = []; pending.forEach(fn => fn()); return state; }
  return { render, async flush() { await tick(); if (dirty) render(); await tick(); if (dirty) render(); return state; } };
}

test('shared hook updates locally after marking, scopes mark-all and ignores stale filter results', async () => {
  const requests = []; const marks = []; let counts = 0; let resolveOld;
  const harness = hookHarness({
    getNotificationCategories: async () => [{ key: 'payments', label: 'Płatności' }],
    getUnreadNotificationCount: async () => { counts++; return { unreadCount: 3, unreadByCategory: { payments: 2 } }; },
    getNotificationsPage: params => { requests.push(params); if (params.category === 'schedule') return new Promise(resolve => { resolveOld = items => resolve({ items, totalCount: items.length, totalPages: 1 }); }); return Promise.resolve({ items: [{ id: 1, category: params.category ?? 'system', isRead: false }], totalCount: 1, totalPages: 1 }); },
    markNotificationAsRead: async id => marks.push(id),
    markAllNotificationsAsRead: async category => marks.push(category),
  });
  harness.render(); let state = await harness.flush();
  assert.equal(state.categories[0].key, 'payments'); assert.equal(counts, 1);
  assert.equal(requests[0].category, undefined); assert.equal(requests[0].isRead, undefined);
  state.setCategory('schedule'); harness.render(); await tick();
  state.setCategory('payments'); harness.render(); state = await harness.flush();
  resolveOld([{ id: 99, category: 'schedule' }]); state = await harness.flush();
  assert.equal(state.notifications[0].category, 'payments'); assert.equal(state.unreadCount, 2);
  state.setReadFilter('false'); harness.render(); state = await harness.flush();
  assert.equal(requests.at(-1).isRead, false);
  const before = requests.length;
  await state.handleMarkAsRead(1); state = await harness.flush();
  assert.equal(requests.length, before, 'marking as read updates the list locally');
  assert.equal(state.notifications[0].isRead, true); assert.equal(state.unreadCount, 1);
  await state.handleMarkAllAsRead(); state = await harness.flush();
  assert.equal(marks.at(-1), 'payments');
  state.setCategory(''); harness.render(); state = await harness.flush();
  await state.handleMarkAllAsRead(); await harness.flush();
  assert.equal(marks.at(-1), undefined);
});

test('page summary expands and marks without navigation; panel remains compact', async () => {
  let expanded = 0; let marked = 0;
  const page = renderCard({ variant: 'page', onToggle: () => { expanded++; }, mark: async () => { marked++; } });
  page.tree.props.children[0].props.onClick(); await tick();
  assert.equal(expanded, 1); assert.equal(marked, 1); assert.equal(page.navigations.length, 0);
  const panel = renderCard();
  const panelButtons = descendants(panel.tree).filter(node => node.type === 'button');
  assert.deepEqual(panelButtons.map(node => node.props['aria-label'] ?? null), [null, 'Oznacz jako przeczytane']);
  assert.equal(descendants(panel.tree).some(node => node.props?.id === 'notification-details-1'), false);
  assert.equal(descendants(renderCard({ isRead: true }).tree).filter(node => node.type === 'button').length, 1);
  const full = renderCard({ variant: 'page', expanded: true });
  assert.equal(full.tree.props.children[0].props['aria-expanded'], true);
  assert.equal(descendants(full.tree).find(node => node.props?.id === 'notification-details-1').props.hidden, false);
});

test('destinations preserve full app paths and normalize only known legacy routes', () => {
  const api = load('app/lib/notifications.ts');
  for (const [raw, expected] of [
    ['/owner/clients/12?tab=packages#payment', '/owner/clients/12?tab=packages#payment'],
    ['/clients/12', '/owner/clients/12'], ['schedule?sessionId=5', '/owner/schedule?sessionId=5'],
    ['/trainers/3/settlements', '/owner/trainers/3/settlements'],
    [null, null], ['javascript:alert(1)', null], ['//evil.test/path', null], ['/\\evil.test', null],
  ]) assert.equal(api.getNotificationDestination({ actionUrl: raw }, 'owner'), expected);
  assert.equal(api.getNotificationDestination({ actionUrl: '/schedule' }, 'trainer'), '/trainer/schedule');
});

test('payment notifications for a known client open that client payments tab', () => {
  const api = load('app/lib/notifications.ts');
  for (const [raw, role, expected] of [
    ['/owner/payments?clientId=5', 'owner', '/owner/clients/5/payments'],
    ['/payments?clientId=5', 'owner', '/owner/clients/5/payments'],
    ['/billing/9?clientId=5&paymentId=9', 'owner', '/owner/clients/5/payments?paymentId=9'],
    ['/trainer/payments?clientId=7', 'trainer', '/trainer/clients/7/payments'],
    ['/owner/payments?clientId=abc', 'owner', '/owner/payments?clientId=abc'],
    ['/owner/payments', 'owner', '/owner/payments'],
    ['/payments?clientId=5', 'client', '/client/payments?clientId=5'],
  ]) assert.equal(api.getNotificationDestination({ actionUrl: raw }, role), expected, raw);
});

test('proxy forwards capitalized Notifications paths without changing case', async () => {
  const requests = [];
  const proxy = load('app/api/backend/[...path]/route.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'fixture-token' }) }) },
    'next/server': { NextResponse: Response },
    '@/app/lib/server/auth-cookies': { expireAuthCookies() {} },
    '@/app/lib/server/backend-cookies': { relayBackendSetCookies() {} },
    '@/app/lib/server/request-origin': { hasSameOrigin: () => true },
  }, { process: { env: { BACKEND_API_URL: 'https://backend.test' } }, fetch: async (url, options) => { requests.push({ url, options }); return new Response(null, { status: 204 }); } });
  for (const path of ['Notifications', 'Notifications/categories', 'Notifications/unread-count', 'Notifications/1/read', 'Notifications/read-all']) {
    const method = path.endsWith('/read') || path.endsWith('/read-all') ? 'POST' : 'GET';
    const req = new Request('https://atlas.test/api/backend/' + path, { method });
    req.nextUrl = new URL(req.url);
    await proxy[method](req, { params: Promise.resolve({ path: path.split('/') }) });
    assert.equal(requests.at(-1).url, 'https://backend.test/api/' + path);
    assert.equal(requests.at(-1).options.body, undefined);
  }
});

test('deep links fetch only the addressed notification and ignore invalid or inactive lookups', async () => {
  const paths = [];
  const api = load('app/lib/notifications.ts', { '@/app/lib/backend': { backendGet: async path => { paths.push(path); return { id: Number(path.split('/')[1]) }; } } });
  assert.equal((await api.findNotificationInList(150)).id, 150);
  assert.deepEqual(paths, ['Notifications/150']);
  assert.equal(await api.findNotificationInList(0), null);
  assert.equal(await api.findNotificationInList(1, () => false), null);
  assert.deepEqual(paths, ['Notifications/150']);
});

test('panel never fetches categories; a failed read rolls back optimistic state and permits retry', async () => {
  let categoryCalls = 0; let rejectRead; let posts = 0;
  const harness = hookHarness({
    getNotificationCategories: async () => { categoryCalls++; return []; },
    getUnreadNotificationCount: async () => ({unreadCount:1, unreadByCategory:{payments:1}}),
    getNotifications: async () => [{id:1, category:'payments', isRead:false}],
    markNotificationAsRead: () => { posts++; return new Promise((_resolve,reject) => { rejectRead = reject; }); },
  }, [true, '', '', true]);
  harness.render(); let state = await harness.flush();
  assert.equal(categoryCalls, 0);
  const operation = state.handleMarkAsRead(1);
  state = harness.render();
  assert.equal(state.notifications[0].isRead, true);
  assert.equal(state.handleMarkAsRead(1), operation);
  rejectRead(Error('offline')); assert.equal(await operation, false);
  state = await harness.flush();
  assert.equal(state.notifications[0].isRead, false);
  assert.equal(posts, 1);
});

test('notificationId auto-expands the selected entry; filters clear selection; popup has no filters', () => {
  const display = load('app/(app)/owner/components/notification-display.ts');
  const filter = function Filters() {};
  const card = function Card() {};
  const panelOptions = [];
  const state = { notifications:[{id:7,isRead:true,message:'Pełny opis',createdAt:new Date().toISOString()}], loading:false, error:null, markingIds:[], counts:{unreadCount:0,unreadByCategory:{}}, categories:[], category:'', readFilter:'', unreadCount:0, page:1, pageSize:25, totalCount:1, setCategory(){}, setReadFilter(){}, setPage(){}, loadNotifications(){} };
  const stateValues = [];
  const react = { Suspense:'suspense', useState: initial => { const value = typeof initial === 'function' ? initial() : initial; return [value, next => stateValues.push(next)]; }, useEffect(){}, useRef: value => ({ current: value }) };
  const dependencies = {
    react, 'react/jsx-runtime':{jsx,jsxs:jsx},
    'next/navigation':{usePathname:()=>'/owner/notifications',useSearchParams:()=>new URLSearchParams('notificationId=7')},
    '@/app/lib/notifications':{getNotificationPreview:()=>null},
    '@/app/lib/use-notifications':{useNotifications:(...options)=>{panelOptions.push(options); return state;}, useNow:()=>Date.now()},
    '../components/notification-display': display, './notification-display': display,
    '../components/Notification':{default:card}, './Notification':{default:card},
    '../components/NotificationFilters':{default:filter,markAllLabel:()=>''},
  };
  const page = load('app/(app)/owner/notifications/page.tsx', dependencies).default;
  const content = page().props.children;
  const list = content.type(content.props);
  const tree = list.type(list.props);
  const selected = descendants(tree).find(node => node.type === card);
  assert.equal(selected.props.item.id, 7); assert.equal(selected.props.expanded, true);
  const filters = descendants(tree).find(node => node.type === filter);
  assert.ok(filters);
  filters.props.setCategory('payments'); assert.equal(stateValues[0], null);
  const panel = load('app/(app)/owner/components/NotificationsPanel.tsx', dependencies).default({open:true,role:'owner',notificationsHref:'/owner/notifications'});
  assert.equal(descendants(panel).some(node => node.type === filter), false);
  assert.equal(panelOptions.at(-1)[3], true);
});

test('mark-read requests are deduplicated across panel and page during navigation', async () => {
  let resolveRead; let calls = 0;
  const api = load('app/lib/notifications.ts', { '@/app/lib/backend': { invalidateBackendGets() {}, backendPost: () => { calls++; return new Promise(resolve => { resolveRead = resolve; }); } } });
  const panel = api.markNotificationAsRead(9);
  const page = api.markNotificationAsRead(9);
  assert.equal(panel, page); assert.equal(calls, 1);
  resolveRead(); await page;
});

test('a read event from another view updates the list and counters without refetching', async () => {
  const listeners = [];
  const requests = [];
  const harness = hookHarness({
    getNotificationCategories: async () => [],
    getUnreadNotificationCount: async () => { requests.push('count'); return { unreadCount: 3, unreadByCategory: { payments: 2, schedule: 1 } }; },
    getNotifications: async () => { requests.push('list'); return [{ id: 1, category: 'payments', isRead: false }, { id: 2, category: 'schedule', isRead: false }]; },
    NOTIFICATIONS_CHANGED_EVENT: 'changed',
  }, [true, '', '', true], { addEventListener: (_name, handler) => listeners.push(handler), removeEventListener() {} });
  harness.render(); let state = await harness.flush();
  const before = requests.length;
  listeners.at(-1)({ detail: { source: 'local', readIds: [1, 99], unreadCountDelta: -2 } });
  state = await harness.flush();
  assert.equal(requests.length, before);
  assert.deepEqual(state.notifications.map(item => item.isRead), [true, false]);
  assert.equal(state.counts.unreadCount, 1); assert.equal(state.counts.unreadByCategory.payments, 1);
  listeners.at(-1)({ detail: { source: 'local', readAll: { category: 'schedule' } } });
  state = await harness.flush();
  assert.equal(state.counts.unreadByCategory.schedule, 0); assert.equal(state.counts.unreadCount, 0);
  listeners.at(-1)({ detail: { source: 'poll' } });
  await harness.flush();
  assert.ok(requests.length > before, 'a server-side change reloads the list');
});

test('notifications are grouped by day and show compact Polish times', () => {
  const display = load('app/(app)/owner/components/notification-display.ts', {}, { Intl, Date });
  const now = new Date(2026, 9, 15, 12, 0).getTime();
  const at = (days, hours, minutes = 0) => new Date(2026, 9, 15 - days, hours, minutes).toISOString();
  const groups = display.groupNotificationsByDay([{ createdAt: at(0, 11, 30) }, { createdAt: at(0, 8) }, { createdAt: at(1, 18) }, { createdAt: at(10, 9) }], now);
  assert.equal(JSON.stringify(groups.map(group => [group.label, group.items.length])), JSON.stringify([['Dziś', 2], ['Wczoraj', 1], ['5 października', 1]]));
  assert.equal(display.formatNotificationTime(new Date(now - 20_000).toISOString(), now), 'Teraz');
  assert.equal(display.formatNotificationTime(at(0, 11, 30), now), '30 min temu');
  assert.equal(display.formatNotificationTime(at(0, 8), now), '08:00');
  assert.equal(display.formatNotificationTime(at(1, 18), now), 'wczoraj, 18:00');
  assert.equal(display.notificationCategoryLabel('payments'), 'Płatności');
  assert.equal(display.notificationCategoryLabel('unknown'), null);
  assert.equal(display.pluralizeNotifications(3), '3 powiadomienia');
  assert.equal(display.pluralizeNotifications(12), '12 powiadomień');
});

test('payment notifications use the client named by their entity or profile link', () => {
  const api = load('app/lib/notifications.ts');
  const payment = { type: 'PaymentPendingConfirmation' };
  assert.equal(api.getNotificationDestination({ ...payment, actionUrl: '/owner/clients/5' }, 'owner'), '/owner/clients/5/payments');
  assert.equal(api.getNotificationDestination({ ...payment, actionUrl: '/clients/7' }, 'trainer'), '/trainer/clients/7/payments');
  assert.equal(api.getNotificationDestination({ ...payment, actionUrl: '/owner/payments', relatedEntityType: 'Client', relatedEntityId: 9 }, 'owner'), '/owner/clients/9/payments');
  assert.equal(api.getNotificationDestination({ ...payment, actionUrl: null, relatedEntityType: 'Client', relatedEntityId: 9 }, 'trainer'), '/trainer/clients/9/payments');
  assert.equal(api.getNotificationDestination({ ...payment, actionUrl: '/owner/payments?ClientId=4' }, 'owner'), '/owner/clients/4/payments');
  assert.equal(api.getNotificationDestination({ type: 'SessionReminder', actionUrl: '/owner/clients/5' }, 'owner'), '/owner/clients/5');
  assert.equal(api.getNotificationPaymentId({ relatedEntityType: 'ClientPayment', relatedEntityId: 31 }), 31);
  assert.equal(api.getNotificationPaymentId({ actionUrl: '/owner/payments?paymentId=12' }), 12);
  assert.equal(api.getNotificationPaymentId({ actionUrl: '/billing/payments/15' }), 15);
  assert.equal(api.getNotificationPaymentId({ relatedEntityType: 'TrainerSettlementPayment', relatedEntityId: 3 }), null);
});

test('a payment known only by id is matched among pending payments of the right portal', async () => {
  const api = load('app/lib/notifications.ts');
  const calls = [];
  const resolver = load('app/lib/payment-notification-target.ts', {
    '@/app/lib/notifications': api,
    '@/app/lib/owner/billing': { getPendingPayments: async () => { calls.push('owner'); return [{ id: 31, clientId: 8 }]; } },
    '@/app/lib/trainer/portal': { getTrainerPortalPendingPayments: async () => { calls.push('trainer'); return [{ id: 31, clientId: 6 }]; } },
  });
  const item = { type: 'PaymentPendingConfirmation', relatedEntityType: 'Payment', relatedEntityId: 31, actionUrl: '/owner/payments' };
  assert.equal(await resolver.resolvePaymentNotificationTarget(item, 'owner', '/owner/payments'), '/owner/clients/8/payments');
  assert.equal(await resolver.resolvePaymentNotificationTarget(item, 'trainer', '/trainer/payments'), '/trainer/clients/6/payments');
  assert.equal(await resolver.resolvePaymentNotificationTarget({ ...item, relatedEntityId: 99 }, 'owner', '/owner/payments'), '/owner/payments');
  assert.equal(await resolver.resolvePaymentNotificationTarget(item, 'owner', '/owner/clients/8/payments'), '/owner/clients/8/payments');
  assert.deepEqual(calls, ['owner', 'trainer', 'owner']);
});
