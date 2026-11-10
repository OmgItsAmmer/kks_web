// Dataset-driven test engine for the live check (see tests/live/README.md).
// A "case" is plain data: who calls, what request, and what must come back (plus optional database checks).
// The same engine runs the full destructive suite on a temporary copy of the database, and a read-only subset
// against the real production site.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ---------- paths, templates, matchers ----------------------------------------------------------------------------

export const getPath = (obj, p) => {
  if (p === '' || p === undefined) return obj;
  const parts = String(p).split('.');
  const walk = (cur, i) => {
    if (i === parts.length) return cur;
    if (cur === null || cur === undefined) return undefined;
    const part = parts[i];
    if (part === '*') {
      if (!Array.isArray(cur)) return undefined;
      return cur.map((x) => walk(x, i + 1));
    }
    return walk(cur[part], i + 1);
  };
  return walk(obj, 0);
};

export const resolve = (value, vars) => {
  if (typeof value === 'string') {
    const whole = value.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
    if (whole) {
      const v = getPath(vars, whole[1]);
      if (v === undefined) throw new Error(`unknown variable {{${whole[1]}}}`);
      return v;
    }
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => {
      const v = getPath(vars, name);
      if (v === undefined) throw new Error(`unknown variable {{${name}}}`);
      return String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => resolve(v, vars));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, vars)]));
  return value;
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Returns null when `actual` satisfies `expected`, otherwise a short reason. */
export const matches = (actual, expected) => {
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && Object.keys(expected).some((k) => k.startsWith('$'))) {
    for (const [op, arg] of Object.entries(expected)) {
      let ok = true;
      switch (op) {
        case '$eq': ok = same(actual, arg); break;
        case '$num': ok = actual !== null && actual !== '' && Number(actual) === Number(arg); break;
        case '$approx': ok = Math.abs(Number(actual) - Number(arg[0])) <= Number(arg[1]); break;
        case '$gt': ok = Number(actual) > Number(arg); break;
        case '$gte': ok = Number(actual) >= Number(arg); break;
        case '$lt': ok = Number(actual) < Number(arg); break;
        case '$lte': ok = Number(actual) <= Number(arg); break;
        case '$exists': ok = (actual !== undefined && actual !== null) === Boolean(arg); break;
        case '$regex': ok = typeof actual === 'string' && new RegExp(arg, 'i').test(actual); break;
        case '$in': ok = arg.some((x) => same(x, actual) || String(x) === String(actual)); break;
        case '$length':
          ok = (Array.isArray(actual) || typeof actual === 'string') && (arg && typeof arg === 'object' ? matches(actual.length, arg) === null : actual.length === arg);
          break;
        case '$type': ok = (arg === 'array' ? Array.isArray(actual) : typeof actual === arg); break;
        case '$contains': ok = (Array.isArray(actual) && actual.some((x) => same(x, arg) || String(x) === String(arg))) || (typeof actual === 'string' && actual.includes(arg)); break;
        case '$not': ok = matches(actual, arg) !== null; break;
        case '$each': ok = Array.isArray(actual) && actual.every((x) => matches(x, arg) === null); break;
        case '$sorted': {
          if (!Array.isArray(actual)) { ok = false; break; }
          const nums = actual.map((x) => Number(x));
          ok = nums.every((x, i) => i === 0 || (arg === 'asc' ? nums[i - 1] <= x : nums[i - 1] >= x));
          break;
        }
        default: return `unknown matcher ${op}`;
      }
      if (!ok) return `expected ${op} ${JSON.stringify(arg)}, got ${short(actual)}`;
    }
    return null;
  }
  return same(actual, expected) || (typeof expected === 'number' && Number(actual) === expected && actual !== null && typeof actual !== 'object')
    ? null
    : `expected ${short(expected)}, got ${short(actual)}`;
};

const short = (v) => {
  const s = JSON.stringify(v);
  return s === undefined ? 'undefined' : s.length > 140 ? s.slice(0, 137) + '...' : s;
};

// ---------- loading ---------------------------------------------------------------------------------------------------

export const loadSuites = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, ...JSON.parse(readFileSync(path.join(dir, f), 'utf8')) }));

// ---------- the runner --------------------------------------------------------------------------------------------------

export async function runSuites({ suites, mode, baseUrl, adminOrigin, actors, db, vars, jwtSign, makeImage, only, log = console.log }) {
  const results = [];
  const state = { vars: { ...vars }, lastAdminCall: 0 };

  const pace = async (urlPath) => {
    // The admin API allows 240 requests a minute per address; stay well under it.
    if (!urlPath.startsWith('/admin')) return;
    const wait = 270 - (Date.now() - state.lastAdminCall);
    if (wait > 0) await sleep(wait);
    state.lastAdminCall = Date.now();
  };

  const callOnce = async (c, actorName, body, urlPath, multipartSpec) => {
    const headers = {};
    const actor = actors[actorName];
    if (actorName !== 'anon' && !actor) throw new Error(`unknown actor "${actorName}"`);
    if (actor?.cookie) headers.Cookie = actor.cookie;
    if (actor?.token) headers.Authorization = `Bearer ${actor.token}`;
    if (c.method !== 'GET' && urlPath.startsWith('/admin')) headers.Origin = adminOrigin;
    if (c.headers) Object.assign(headers, resolve(c.headers, state.vars));
    let payload;
    if (multipartSpec) {
      const fd = new FormData();
      for (const [k, f] of Object.entries(multipartSpec)) {
        if (f.png) fd.append(k, new Blob([await makeImage(f.png[0], f.png[1])], { type: 'image/png' }), f.filename || 'test.png');
        else fd.append(k, new Blob([Buffer.from(f.text)], { type: f.type || 'image/png' }), f.filename || 'evil.png');
      }
      payload = fd;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const started = Date.now();
    const res = await fetch(/^https?:\/\//.test(urlPath) ? urlPath : baseUrl + urlPath, { method: c.method, headers, body: payload, redirect: 'manual', signal: AbortSignal.timeout(60000) });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = undefined; }
    const set = res.headers.get('set-cookie');
    if (set && actor && c.captureCookie) actor.cookie = set.split(';')[0];
    return { status: res.status, json, text, headers: res.headers, ms: Date.now() - started };
  };

  const checkResponse = (c, r, problems) => {
    const ex = c.expect || {};
    if (ex.status !== undefined) {
      const allowed = Array.isArray(ex.status) ? ex.status : [ex.status];
      if (!allowed.includes(r.status)) problems.push(`status ${r.status}, expected ${allowed.join(' or ')}${r.json?.error ? ` (${short(r.json.error)}${r.json.errors ? ' ' + short(r.json.errors) : ''})` : ''}`);
    }
    for (const [p, want] of Object.entries(ex.json || {})) {
      const bad = matches(getPath(r.json, p), resolve(want, state.vars));
      if (bad) problems.push(`${p}: ${bad}`);
    }
    for (const [h, rx] of Object.entries(ex.headers || {})) {
      const val = r.headers.get(h) || '';
      if (!new RegExp(rx, 'i').test(val)) problems.push(`header ${h}: "${val.slice(0, 80)}" does not match /${rx}/`);
    }
    if (ex.text && !new RegExp(ex.text, 'i').test(r.text.slice(0, 20000))) problems.push(`body does not match /${ex.text}/`);
    if (ex.maxMs && r.ms > ex.maxMs) problems.push(`took ${r.ms} ms, limit ${ex.maxMs} ms`);
  };

  const runSql = async (c, problems) => {
    for (const step of c.sql || []) {
      if (!db) { problems.push('sql step needs a database (branch mode only)'); return; }
      const q = resolve(step.q, state.vars);
      const args = resolve(step.args || [], state.vars);
      const res = await db.query(q, args);
      const view = { rows: res.rows, rowCount: res.rowCount };
      for (const [p, want] of Object.entries(step.expect || {})) {
        const bad = matches(getPath(view, p), resolve(want, state.vars));
        if (bad) problems.push(`sql ${p}: ${bad}`);
      }
      for (const [name, p] of Object.entries(step.save || {})) state.vars[name] = getPath(view, p);
    }
  };

  for (const suite of suites) {
    if (only && !only.split(',').some((o) => suite.file.includes(o))) continue;
    log(`\n== ${suite.name || suite.file} ==`);
    for (const c of suite.cases) {
      const entry = { suite: suite.file, id: c.id, title: c.title, status: 'pass', problems: [] };
      results.push(entry);
      try {
        if (mode === 'prod' && !c.readonly) { entry.status = 'skip'; continue; }
        if (c.needsVar && state.vars[c.needsVar] === undefined) { entry.status = 'skip'; continue; }
        if (c.needsActor && !(actors[c.needsActor]?.cookie || actors[c.needsActor]?.token)) { entry.status = 'skip'; continue; }
        if (c.sleep) await sleep(c.sleep);
        for (const m of c.mint || []) {
          const customerId = Number(resolve(m.customerId, state.vars));
          actors[m.actor] = { token: jwtSign({ id: customerId, email: m.email || `${m.actor}@test.local`, role: 'customer', customerId }) };
        }
        let response;
        if (c.burst) {
          const count = c.burst.count;
          const names = Array.from({ length: count }, (_, i) => c.burst.as.replace('{i}', String(i + 1)));
          const all = await Promise.all(
            names.map((n, i) => {
              state.vars.i = i + 1;
              if (c.burst.each) state.vars.each = state.vars[c.burst.each]?.[i];
              const body = c.body === undefined ? undefined : resolve(c.body, state.vars);
              return callOnce(c, n, body, resolve(c.path, state.vars));
            }),
          );
          const counts = {};
          for (const r of all) counts[r.status] = (counts[r.status] || 0) + 1;
          response = { status: 0, json: { statusCounts: counts }, text: JSON.stringify(counts), headers: new Headers(), ms: 0 };
          const wantCounts = c.expect?.statusCounts || {};
          for (const [code, n] of Object.entries(wantCounts)) {
            if ((counts[code] || 0) !== n) entry.problems.push(`${n} x HTTP ${code} expected, got ${JSON.stringify(counts)}`);
          }
          if (c.expect?.statusOnly) {
            const bad = Object.keys(counts).filter((k) => !c.expect.statusOnly.map(String).includes(k));
            if (bad.length) entry.problems.push(`unexpected statuses ${bad.join(',')} in ${JSON.stringify(counts)}`);
          }
        } else if (c.method) {
          const urlPath = resolve(c.path, state.vars);
          await pace(urlPath);
          const body = c.body === undefined ? undefined : resolve(c.body, state.vars);
          const times = c.repeat || 1;
          for (let t = 0; t < times; t++) {
            response = await callOnce(c, c.as || 'anon', body, urlPath, c.multipart);
            if (t < times - 1) await pace(urlPath);
            if (c.repeat && c.repeatUntilStatus && response.status === c.repeatUntilStatus) break;
          }
          checkResponse(c, response, entry.problems);
          for (const [name, p] of Object.entries(c.save || {})) {
            const val = getPath(response.json ?? { text: response.text }, p);
            if (val === undefined && !c.saveOptional) entry.problems.push(`could not save ${name} from ${p}`);
            state.vars[name] = val;
          }
        }
        await runSql(c, entry.problems);
      } catch (e) {
        entry.problems.push(`error: ${e.message}`);
      }
      if (entry.problems.length && entry.status !== 'skip') entry.status = 'fail';
      if (entry.status !== 'skip') {
        log(`${entry.status === 'pass' ? 'PASS' : entry.status === 'skip' ? 'SKIP' : 'FAIL'}  ${c.id}  ${c.title}`);
        for (const p of entry.problems) log(`        - ${p}`);
      }
    }
  }
  return { results, vars: state.vars };
}
