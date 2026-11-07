// Load test for the storefront API (plan 4.12 / Phase 10).  Run against STAGING, never production:
//   k6 run -e BASE_URL=https://api-staging.example.com loadtest/k6-storefront.js
// Models ~100 shoppers at once for 15 minutes: browse, search, view products, and a few cart reads.
// Pass marks (95th percentile): catalog under 300 ms, search under 600 ms, error rate under 1%.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '10m', target: 100 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:catalog}': ['p(95)<300'],
    'http_req_duration{kind:search}': ['p(95)<600'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';
const API = `${BASE}/api/v1`;
const TERMS = ['phone', 'samsung', 'cable', 'charger', 'watch', 'speaker', 'laptop', 'case'];

export default function () {
  const get = (path, kind) => http.get(`${API}${path}`, { tags: { kind } });

  let res = get('/categories', 'catalog');
  check(res, { 'categories 200': (r) => r.status === 200 });
  res = get('/products?page=1&pageSize=20', 'catalog');
  check(res, { 'products 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  const term = TERMS[Math.floor(Math.random() * TERMS.length)];
  res = get(`/products/search?q=${term}`, 'search');
  check(res, { 'search 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  const list = res.status === 200 ? (res.json('data') || []) : [];
  if (list.length > 0) {
    const id = list[Math.floor(Math.random() * list.length)].id;
    res = get(`/products/${id}`, 'catalog');
    check(res, { 'product 200': (r) => r.status === 200 });
  }
  sleep(Math.random() * 3 + 1);
}
