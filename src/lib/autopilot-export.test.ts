import { describe, it, expect } from 'vitest';
import { escapeCsvField, buildCsv, auditLogsToCsv, eventsToCsv } from './autopilot-export';

describe('escapeCsvField', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
  it('quotes fields with comma, quote, semicolon, newline', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('a;b')).toBe('"a;b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
  });
  it('leaves plain strings untouched', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField(42)).toBe('42');
  });
});

describe('buildCsv', () => {
  it('starts with UTF-8 BOM and uses CRLF', () => {
    const csv = buildCsv(['a', 'b'], [[1, 2]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('\r\n');
    expect(csv).toContain('a,b');
    expect(csv).toContain('1,2');
  });
});

describe('auditLogsToCsv', () => {
  it('escapes resource_id with comma', () => {
    const csv = auditLogsToCsv([{
      id: '1', created_at: '2026-01-01T10:00:00Z', action: 'update',
      resource_type: 'post', resource_id: 'a,b', api_key_name: 'crawlers',
      reverted: false, reverted_at: null, previous_data: null, new_data: null,
    }]);
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('crawlers');
    expect(csv).toContain('no');
  });
});

describe('eventsToCsv', () => {
  it('outputs all 8 columns in order', () => {
    const csv = eventsToCsv([{
      id: '1', audit_log_id: 'log-1', created_at: '2026-01-01T10:00:00Z',
      event_type: 'mutation', severity: 'info', page_key: '/blog',
      message: 'ok', resolved: true, resolved_at: '2026-01-01T11:00:00Z',
    }]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('\uFEFFdate,severity,event_type,page_key,message,resolved,resolved_at,audit_log_id');
    expect(lines[1]).toContain('yes');
    expect(lines[1]).toContain('log-1');
  });
});
