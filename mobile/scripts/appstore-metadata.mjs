/**
 * Pousse la fiche App Store (fr-FR) via l'API App Store Connect.
 *
 * Usage:
 *   node mobile/scripts/appstore-metadata.mjs            # métadonnées seules
 *   node mobile/scripts/appstore-metadata.mjs --screenshots
 *
 * Config lue depuis mobile/eas.json (submit.production.ios) :
 *   ascAppId, ascApiKeyIssuerId, ascApiKeyId, ascApiKeyPath
 * La clé .p8 peut aussi être fournie via ASC_API_KEY_P8 (contenu) ou ASC_API_KEY_PATH.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createSign, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.appstoreconnect.apple.com';
const LOCALE = 'fr-FR';
const WITH_SCREENSHOTS = process.argv.includes('--screenshots');

const eas = JSON.parse(readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
const cfg = eas.submit?.production?.ios ?? {};
const meta = JSON.parse(readFileSync(path.join(ROOT, 'store.fr.json'), 'utf8'));

const appId = process.env.ASC_APP_ID || cfg.ascAppId;
const issuerId = process.env.ASC_ISSUER_ID || cfg.ascApiKeyIssuerId;
const keyId = process.env.ASC_KEY_ID || cfg.ascApiKeyId;
const keyPath = process.env.ASC_API_KEY_PATH || path.join(ROOT, (cfg.ascApiKeyPath || '').replace(/^\.\//, ''));
const privateKey = process.env.ASC_API_KEY_P8 || (existsSync(keyPath) ? readFileSync(keyPath, 'utf8') : null);

if (!appId || !issuerId || !keyId || !privateKey) {
  console.error('Configuration incomplète (appId / issuerId / keyId / clé .p8 introuvable).');
  process.exit(1);
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeToken() {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createSign('SHA256')
    .update(data)
    .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${data}.${sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

const TOKEN = makeToken();

async function api(method, endpoint, body) {
  const res = await fetch(endpoint.startsWith('http') ? endpoint : `${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = json?.errors?.map((e) => `${e.title}: ${e.detail}`).join(' | ') || text;
    throw new Error(`${method} ${endpoint} -> ${res.status} ${detail}`);
  }
  return json;
}

/* ---------- 1. App Info (nom, sous-titre, politique de confidentialité) ---------- */

async function updateAppInfo() {
  const infos = await api('GET', `/v1/apps/${appId}/appInfos`);
  const editable = infos.data.find((i) =>
    ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'WAITING_FOR_REVIEW'].includes(
      i.attributes.appStoreState,
    ),
  ) || infos.data[0];

  const locs = await api('GET', `/v1/appInfos/${editable.id}/appInfoLocalizations`);
  const existing = locs.data.find((l) => l.attributes.locale === LOCALE);

  const attributes = {
    name: meta.name,
    subtitle: meta.subtitle,
    privacyPolicyUrl: meta.privacyPolicyUrl,
  };

  if (existing) {
    await api('PATCH', `/v1/appInfoLocalizations/${existing.id}`, {
      data: { type: 'appInfoLocalizations', id: existing.id, attributes },
    });
    console.log('App Info fr-FR mis à jour.');
  } else {
    await api('POST', '/v1/appInfoLocalizations', {
      data: {
        type: 'appInfoLocalizations',
        attributes: { locale: LOCALE, ...attributes },
        relationships: { appInfo: { data: { type: 'appInfos', id: editable.id } } },
      },
    });
    console.log('App Info fr-FR créé.');
  }
}

/* ---------- 2. Version (description, mots-clés, URLs) ---------- */

async function getEditableVersion() {
  const versions = await api('GET', `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=20`);
  const editable = versions.data.find((v) =>
    ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
      v.attributes.appStoreState,
    ),
  );
  if (editable) return editable;

  const created = await api('POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString: '1.0.0' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });
  return created.data;
}

async function updateVersionLocalization(version) {
  const locs = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
  const existing = locs.data.find((l) => l.attributes.locale === LOCALE);

  const attributes = {
    description: meta.description,
    keywords: meta.keywords,
    promotionalText: meta.promotionalText,
    marketingUrl: meta.marketingUrl,
    supportUrl: meta.supportUrl,
    whatsNew: meta.whatsNew,
  };

  if (existing) {
    try {
      await api('PATCH', `/v1/appStoreVersionLocalizations/${existing.id}`, {
        data: { type: 'appStoreVersionLocalizations', id: existing.id, attributes },
      });
    } catch (e) {
      // 'whatsNew' n'est pas éditable sur une première version : on réessaie sans.
      if (!/whatsNew/.test(e.message)) throw e;
      const { whatsNew, ...rest } = attributes;
      await api('PATCH', `/v1/appStoreVersionLocalizations/${existing.id}`, {
        data: { type: 'appStoreVersionLocalizations', id: existing.id, attributes: rest },
      });
    }
    console.log('Version fr-FR mise à jour.');
    return existing;
  }

  const created = await api('POST', '/v1/appStoreVersionLocalizations', {
    data: {
      type: 'appStoreVersionLocalizations',
      attributes: { locale: LOCALE, ...attributes },
      relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
    },
  });
  console.log('Version fr-FR créée.');
  return created.data;
}

/* ---------- 3. Captures d'écran ---------- */

async function uploadScreenshots(localization) {
  const dir = path.join(ROOT, 'store-assets/screenshots');
  if (!existsSync(dir)) {
    console.warn('Pas de captures : lance d\'abord node mobile/scripts/capture-screenshots.mjs');
    return;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (!files.length) return;

  const sets = await api('GET', `/v1/appStoreVersionLocalizations/${localization.id}/appScreenshotSets`);
  let set = sets.data.find((s) => s.attributes.screenshotDisplayType === 'APP_IPHONE_67');
  if (!set) {
    const created = await api('POST', '/v1/appScreenshotSets', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: 'APP_IPHONE_67' },
        relationships: {
          appStoreVersionLocalization: {
            data: { type: 'appStoreVersionLocalizations', id: localization.id },
          },
        },
      },
    });
    set = created.data;
  }

  const current = await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`);
  for (const s of current.data) {
    await api('DELETE', `/v1/appScreenshots/${s.id}`);
  }

  for (const file of files) {
    const buf = readFileSync(path.join(dir, file));
    const reserved = await api('POST', '/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: { fileName: file, fileSize: buf.length },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } },
      },
    });

    for (const op of reserved.data.attributes.uploadOperations) {
      const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
      const chunk = buf.subarray(op.offset, op.offset + op.length);
      const up = await fetch(op.url, { method: op.method, headers, body: chunk });
      if (!up.ok) throw new Error(`Upload ${file} échoué: ${up.status}`);
    }

    const checksum = createHash('md5').update(buf).digest('hex');
    await api('PATCH', `/v1/appScreenshots/${reserved.data.id}`, {
      data: {
        type: 'appScreenshots',
        id: reserved.data.id,
        attributes: { uploaded: true, sourceFileChecksum: checksum },
      },
    });
    console.log(`Capture envoyée : ${file}`);
  }
}

/* ---------- Exécution ---------- */

try {
  await updateAppInfo();
  const version = await getEditableVersion();
  const localization = await updateVersionLocalization(version);
  if (WITH_SCREENSHOTS) await uploadScreenshots(localization);
  console.log('Fiche App Store fr-FR poussée.');
} catch (e) {
  console.error('Erreur :', e.message);
  process.exit(1);
}
