import { cp, mkdir } from 'node:fs/promises';

// Refuse to replace an existing workspace or its edits.
await mkdir('workspace');
await cp('example', 'workspace', {
  recursive: true,
  errorOnExist: true,
  force: false,
});
console.log(
  'Created workspace/. Try: pnpm dev --prompt "Trim names in greet and reject blank names. Add tests."',
);
