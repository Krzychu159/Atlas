import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] ?? {}, URLSearchParams, URL, Headers, Event, setTimeout, clearTimeout, window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }, ...globals });
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
function renderCard({ isRead = false, actionUrl = '/owner/payments?clientId=5', mark = async () => {}, timers = {}, variant = "panel", expanded = false, onToggle = () => {} } = {}) {
  const navigations = [];
  const api = load('app/lib/notifications.ts');
  const component = load('app/(app)/owner/components/Notification.tsx', {
    react: { useRef: () => ({ current: null }), useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: href => navigations.push(href) }) },
    '@/app/lib/notifications': api,
  }, timers);
  return { navigations, tree: component.default({ item: { id: 1, type: 'PaymentPendingConfirmation', category: 'payments', createdAt: new Date().toISOString(), title: 'Płatność', isRead, actionUrl }, role: 'owner', variant, expanded, onToggle, onMarkAsRead: mark }) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('unread panel card marks once before navigating to the selected notification', async () => {
  let resolveRead;
  let posts = 0;
  const { tree, navigations } = renderCard({ mark: () => { posts++; return new Promise(resolve => { resolveRead = resolve; }); } });
  tree.props.children[0].props.onClick(); tree.props.children[0].props.onClick();
  assert.equal(posts, 1); assert.equal(navigations.length, 0);
  resolveRead(); await tick();
  assert.deepEqual(navigations, ['/owner/notifications?notificationId=1']);
});
test('read panel card skips POST; missing actionUrl still opens the full notification', async () => {
  let posts = 0;
  const read = renderCard({ isRead: true, mark: async () => { posts++; } });
  read.tree.props.children[0].props.onClick(); await tick();
  assert.equal(posts, 0); assert.equal(read.navigations.length, 1);
  const noUrl = renderCard({ actionUrl: null, mark: async () => { posts++; } });
  noUrl.tree.props.children[0].props.onClick(); await tick();
  assert.equal(posts, 1); assert.equal(noUrl.navigations.length, 1);
});
test('details CTA navigates exactly once using actionUrl', async () => {
  let posts = 0;
  const { tree, navigations } = renderCard({ variant: 'page', expanded: true, mark: async () => { posts++; } });
  const cta = descendants(tree).find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.some(value => typeof value === 'string' && value.includes('Przejdź do szczegółów')));
  cta.props.onClick();
  // CTA is a sibling of the summary button, so it has no parent click handler.
  assert.equal(tree.props.onClick, undefined);
  await tick();
  assert.equal(posts, 1); assert.deepEqual(navigations, ['/owner/payments?clientId=5']);
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

function hookHarness(api, options = []) {
  const slots = []; let cursor = 0; let effects = []; let dirty = false;
  const same = (a, b) => a?.length === b?.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true; }]; },
    useRef(value) { const i = cursor++; slots[i] ??= { current: value }; return slots[i]; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const hook = load('app/lib/use-notifications.ts', { react, sonner: { toast: { error() {} } }, './backend': { getErrorMessage: error => error.message }, './notifications': api });
  let state;
  function render() { cursor = 0; dirty = false; state = hook.useNotifications(...options); const pending = effects; effects = []; pending.forEach(fn => fn()); return state; }
  return { render, async flush() { await tick(); if (dirty) render(); await tick(); if (dirty) render(); return state; } };
}

test('shared hook refetches after mutations, scopes mark-all and ignores stale filter results', async () => {
  const requests = []; const marks = []; let counts = 0; let resolveOld;
  const harness = hookHarness({
    getNotificationCategories: async () => [{ key: 'payments', label: 'Płatności' }],
    getUnreadNotificationCount: async () => { counts++; return { unreadCount: 3, unreadByCategory: { payments: 2 } }; },
    getNotifications: params => { requests.push(params); if (params.category === 'schedule') return new Promise(resolve => { resolveOld = resolve; }); return Promise.resolve([{ id: 1, category: params.category ?? 'system', isRead: false }]); },
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
  assert.ok(requests.length > before);
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
  assert.equal(descendants(panel.tree).filter(node => node.type === 'button').length, 1);
  assert.equal(descendants(panel.tree).some(node => node.props?.id === 'notification-details-1'), false);
  const full = renderCard({ variant: 'page', expanded: true });
  assert.equal(full.tree.props.children[0].props['aria-expanded'], true);
  assert.equal(full.tree.props.children[1].props.hidden, false);
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

test('proxy forwards capitalized Notifications paths without changing case', async () => {
  const requests = [];
  const proxy = load('app/api/backend/[...path]/route.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'fixture-token' }) }) },
    'next/server': { NextResponse: Response },
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

test('older deep links increase the supported limit and stop at exhausted or capped history', async () => {
  const limits = [];
  const api = load('app/lib/notifications.ts', { '@/app/lib/backend': { backendGet: async (_path, params) => {
    limits.push(params.limit);
    return Array.from({length: Math.min(params.limit, 180)}, (_, index) => ({id:index+1}));
  } } });
  assert.equal((await api.findNotificationInList(150)).id, 150);
  assert.deepEqual(limits, [100,200]);
  assert.equal(await api.findNotificationInList(999), null);
  const before = limits.length;
  assert.equal(await api.findNotificationInList(1, () => false), null);
  assert.equal(limits.length, before);
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
  const filter = function Filters() {};
  const card = function Card() {};
  const panelOptions = [];
  const state = { notifications:[{id:7,isRead:true,message:'Pełny opis'}], loading:false, error:null, markingIds:[], counts:{unreadCount:0,unreadByCategory:{}}, categories:[], category:'', readFilter:'', unreadCount:0, setCategory(){}, setReadFilter(){} };
  const stateValues = [];
  const react = { Suspense:'suspense', useState: initial => { const value = typeof initial === 'function' ? initial() : initial; return [value, next => stateValues.push(next)]; }, useEffect(){} };
  const dependencies = {
    react, 'react/jsx-runtime':{jsx,jsxs:jsx},
    'next/navigation':{usePathname:()=>'/owner/notifications',useSearchParams:()=>new URLSearchParams('notificationId=7')},
    '@/app/lib/notifications':{getNotificationPreview:()=>null},
    '@/app/lib/use-notifications':{useNotifications:(...options)=>{panelOptions.push(options); return state;}},
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
  const api = load('app/lib/notifications.ts', { '@/app/lib/backend': { backendPost: () => { calls++; return new Promise(resolve => { resolveRead = resolve; }); } } });
  const panel = api.markNotificationAsRead(9);
  const page = api.markNotificationAsRead(9);
  assert.equal(panel, page); assert.equal(calls, 1);
  resolveRead(); await page;
});
