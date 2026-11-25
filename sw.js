// ON THE ICE 서비스워커 (web/index.html에서 등록, build_all.sh가 web/sw.js로 복사)
// - 앱 파일(같은 주소): 열 때마다 서버에 바뀌었는지 확인 → 배포하면 앱을 다시 열 때 바로 새 버전
//   (GitHub Pages가 10분 캐시하라고 해도 무시). 오프라인이면 마지막으로 받은 파일
// - 그리기 엔진·글꼴(gstatic.com): 주소에 버전이 들어 있어 안 바뀌므로 저장해 둔 것을 먼저 씀 → 여는 속도 개선
// - 예전 HTML 웹 앱 캐시(wolves-*)는 지움
const APP = 'ontheice-app';
const STATIC = 'ontheice-static-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('wolves-')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) {
          const copy = res.clone();
          caches.open(APP).then((c) => c.put(req, copy));
        }
        return res;
      } catch (err) {
        const hit = await caches.match(req);
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  if (url.hostname.endsWith('gstatic.com')) {
    e.respondWith((async () => {
      const c = await caches.open(STATIC);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    })());
  }
});
