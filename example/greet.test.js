import assert from 'node:assert/strict';
import { test } from 'node:test';
import { greet } from './greet.js';

test('greets a named user', () => {
  assert.equal(greet('Alem'), 'Hello, Alem!');
});
