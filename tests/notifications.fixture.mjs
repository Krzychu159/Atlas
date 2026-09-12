// Standalone visual fixture: renders the real notification components and built
// ATLAS styles with synthetic data. It never changes auth or contacts the backend.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const categories = [ ['payments','Płatności'], ['packages','Pakiety'], ['schedule','Grafik'], ['invitations','Zaproszenia'], ['trainers','Trenerzy'], ['system','System'] ].map(([key,label]) => ({key,label}));
const titles = ['Pakiet wymaga opłacenia', 'Pakiet kończy się za 3 dni', 'Sesja nie została zsynchronizowana z Outlookiem', 'Zaproszenie czeka na akceptację', 'Zbliża się termin rozliczenia trenera', 'Osiągnięto limit lokalizacji'];
const notifications = Array.from({length: 9}, (_, index) => ({
  id: index + 1, userId: 1, type: ['PackagePaymentRequired','PackageEndingSoon','SessionNotSyncedToOutlook','InvitationPending','TrainerSettlementReminder','LocationLimitExceeded'][index % 6],
  category: categories[index % 6].key, title: titles[index % 6], isRead: index > 3,
  message: 'To jest przykładowe powiadomienie do kontroli układu. Pełny opis zawiera dodatkowy kontekst i instrukcję kolejnego kroku.\nDrugi akapit pozostaje czytelny po rozwinięciu, także na telefonie. DługiIdentyfikatorBezSpacji_12345678901234567890123456789012345678901234567890.',
  severity: index % 2 ? 'Information' : 'Warning', createdAt: '2026-09-11T09:00:00Z', readAt: null,
  relatedEntityId: null, relatedEntityType: null, actionUrl: '/owner/payments?clientId=5',
}));
function render(url) {
  const cache = new Map();
  const load = file => {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    const localRequire = name => {
      if (name === 'next/navigation') return { useRouter: () => ({ push() {} }), usePathname: () => '/owner/notifications', useSearchParams: () => url.searchParams };
      if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
      if (name.endsWith('/use-notifications')) return { useNotifications: () => ({ notifications, categories, category: '', readFilter: '', counts: { unreadCount: 4, unreadByCategory: {payments:1,packages:1,schedule:1,invitations:1} }, unreadCount: 4, loading: false, error: null, markingIds: [], markingAll: false, setCategory() {}, setReadFilter() {}, handleMarkAsRead: async () => true, handleMarkAllAsRead() {}, loadNotifications() {} }) };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
        const target = [base, base+'.tsx', base+'.ts'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        return load(target);
      }
      return require(name);
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX} }).outputText, { exports, require: localRequire, URLSearchParams, URL, Headers, setTimeout, clearTimeout });
    return exports;
  };
  const panel = url.pathname === '/panel';
  const Component = load(panel ? 'app/(app)/owner/components/NotificationsPanel.tsx' : 'app/(app)/owner/notifications/page.tsx').default;
  const props = panel ? { open:true, onClose(){}, notificationsHref:'/owner/notifications', totalUnreadCount:4, role:'owner' } : {};
  const markup = renderToStaticMarkup(React.createElement(Component, props));
  return '<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS — notification visual fixture</title><link rel="stylesheet" href="/style.css"><style>body{margin:0;font-family:Arial,sans-serif;background:#121416;color:#e4e2e6}main{max-width:1100px;margin:auto;padding:24px 12px}</style></head><body><main>'+markup+'</main></body></html>';
}
const css = fs.readdirSync('.next/static/chunks').filter(file => file.endsWith('.css')).map(file => fs.readFileSync('.next/static/chunks/'+file,'utf8')).join('\n');
http.createServer((req,res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3099');
  try { res.setHeader('Content-Type', url.pathname === '/style.css' ? 'text/css' : 'text/html; charset=utf-8'); res.end(url.pathname === '/style.css' ? css : render(url)); }
  catch(error) { res.statusCode=500; res.end(String(error.stack)); }
}).listen(3099,'127.0.0.1', () => console.log('Notification visual fixture: http://127.0.0.1:3099/panel and /page?notificationId=1'));
