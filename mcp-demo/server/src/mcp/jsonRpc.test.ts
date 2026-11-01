import { describe, it, expect } from 'vitest';
import {
  parseJsonRpc,
  jsonRpcResult,
  jsonRpcError,
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR
} from './jsonRpc';

describe('the JSON-RPC error codes', () => {
  it('are the ones JSON-RPC 2.0 assigns', () => {
    // Pinned to the literals: a model recovers from `-32602 invalid params` by
    // fixing its arguments and from `-32601 method not found` by not calling
    // again, so a swapped pair changes what the client does next.
    expect(PARSE_ERROR).toBe(-32700);
    expect(INVALID_REQUEST).toBe(-32600);
    expect(METHOD_NOT_FOUND).toBe(-32601);
    expect(INVALID_PARAMS).toBe(-32602);
    expect(INTERNAL_ERROR).toBe(-32603);
  });
});

describe('parseJsonRpc', () => {
  it('reads a request', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })).toEqual({
      id: 1,
      method: 'tools/list',
      params: {}
    });
  });

  it('reads a string id, which the spec allows as well as a number', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 'abc', method: 'tools/list' })?.id).toBe('abc');
  });

  /*
    Zero is a legal id and a falsy value. Anything written as `if (id)` treats
    it as absent, which turns a request into a notification and answers `202`
    with no body — the client then waits for a response that will never come.
  */
  it('reads an id of zero as a request, not as an absent id', () => {
    const call = parseJsonRpc({ jsonrpc: '2.0', id: 0, method: 'tools/list' });
    expect(call?.id).toBe(0);
  });

  it('reads a notification as an absent id', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).toEqual({
      id: null,
      method: 'notifications/initialized',
      params: {}
    });
  });

  it('defaults absent params to an empty object, so callers never check', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' })?.params).toEqual({});
  });

  it('refuses a missing or wrong jsonrpc version', () => {
    expect(parseJsonRpc({ id: 1, method: 'tools/list' })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: '1.0', id: 1, method: 'tools/list' })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: 2.0, id: 1, method: 'tools/list' })).toBeNull();
  });

  it('refuses a missing, empty, or non-string method', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1 })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: '' })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: 42 })).toBeNull();
  });

  it('refuses an id that is neither a string nor a number', () => {
    // Including an explicit `null`, which JSON-RPC permits and discourages and
    // MCP never sends. Accepting it would make it indistinguishable from a
    // notification.
    expect(parseJsonRpc({ jsonrpc: '2.0', id: null, method: 'tools/list' })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: '2.0', id: true, method: 'tools/list' })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: '2.0', id: { nested: 1 }, method: 'tools/list' })).toBeNull();
  });

  it('refuses array params, because every MCP method takes an object', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: [] })).toBeNull();
  });

  it('refuses non-object params', () => {
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: 'x' })).toBeNull();
    expect(parseJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: null })).toBeNull();
  });

  /*
    Batching was in 2025-03-26 and removed in 2025-06-18. Refusing an array
    outright is better than half-supporting it: a client that batches and gets
    one object back has no way to match responses to requests.
  */
  it('refuses a batch', () => {
    expect(parseJsonRpc([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }])).toBeNull();
  });

  it('refuses anything that is not an object, without throwing', () => {
    expect(parseJsonRpc(undefined)).toBeNull();
    expect(parseJsonRpc(null)).toBeNull();
    expect(parseJsonRpc('a string')).toBeNull();
    expect(parseJsonRpc(42)).toBeNull();
  });
});

describe('jsonRpcResult', () => {
  it('wraps a result with the id it answers', () => {
    expect(jsonRpcResult(7, { tools: [] })).toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: { tools: [] }
    });
  });

  it('carries an id of zero through', () => {
    expect(jsonRpcResult(0, {})).toMatchObject({ id: 0 });
  });
});

describe('jsonRpcError', () => {
  it('wraps a code and a message', () => {
    expect(jsonRpcError(7, METHOD_NOT_FOUND, 'Unknown method: nope')).toEqual({
      jsonrpc: '2.0',
      id: 7,
      error: { code: METHOD_NOT_FOUND, message: 'Unknown method: nope' }
    });
  });

  it('uses a null id when the request was too malformed to have one', () => {
    // JSON-RPC 2.0: a parse error is answered with `id: null`, because there
    // was no readable id to echo. The field has to be present.
    const error = jsonRpcError(null, PARSE_ERROR, 'Invalid JSON');
    expect(error).toHaveProperty('id', null);
  });

  it('never carries a result alongside an error', () => {
    expect(jsonRpcError(1, INTERNAL_ERROR, 'x')).not.toHaveProperty('result');
  });
});
