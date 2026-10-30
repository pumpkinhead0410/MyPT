import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../data/defaults.ts';
import { exportMyPTStateJson, importMyPTStateJson, parseMyPTState } from './storage.ts';

describe('storage & state schema validation', () => {
  it('validates default state successfully', () => {
    const defaultState = createDefaultState();
    const parsed = parseMyPTState(defaultState);
    assert.notEqual(parsed, null);
    assert.equal(parsed?.version, 1);
    assert.equal(parsed?.inventory.length, 6);
    assert.equal(parsed?.milestones.length, 12);
  });

  it('rejects invalid state missing version or required fields', () => {
    assert.equal(parseMyPTState(null), null);
    assert.equal(parseMyPTState({}), null);
    assert.equal(parseMyPTState({ version: 2 }), null);
    assert.equal(parseMyPTState({ version: 1, activeTabId: 99 }), null);
  });

  it('exports and imports state roundtrip perfectly', () => {
    const original = createDefaultState();
    const json = exportMyPTStateJson(original);

    const result = importMyPTStateJson(json);
    assert.equal(result.kind, 'ok');
    if (result.kind === 'ok') {
      assert.deepEqual(result.state, original);
    }
  });

  it('returns structured error when importing malformed JSON', () => {
    const result = importMyPTStateJson('{ not valid json');
    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.match(result.message, /백업 파일을 읽을 수 없습니다/);
    }
  });

  it('returns structured error when importing valid JSON with invalid schema', () => {
    const result = importMyPTStateJson(JSON.stringify({ some: 'other', data: 123 }));
    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.match(result.message, /유효하지 않은 MyPT 백업 데이터 형식/);
    }
  });
});
