import { execFile } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

// Refuse to replace an existing workspace or its edits.
await mkdir('workspace');
await cp('example', 'workspace', {
  recursive: true,
  errorOnExist: true,
  force: false,
});
// Give official file tools a Git boundary outside the parent's ignore rules.
await promisify(execFile)('git', ['init', '--quiet', 'workspace']);
console.log(
  'Created workspace/. Try: pnpm dev --prompt "Trim names in greet and reject blank names. Add tests."',
);
