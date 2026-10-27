import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for (const [file, verb] of [
  ['app/api/crud/blog/create/route.ts', 'POST'],
  ['app/api/crud/blog/update/route.ts', 'PUT'],
  ['app/api/crud/blog/delete/route.ts', 'DELETE'],
  ['app/api/marketing/blog-image/route.ts', 'POST'],
]) {
  for (const status of [401, 403]) {
    test(`${file} rejects ${status === 401 ? 'unauthenticated' : 'unauthorised'} callers before reading their payload`, async () => {
      const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      const calls = [];
      const result = { status };
      const exports = {};
      vm.runInNewContext(code, { exports, console, require(name) {
        if (name === '@prisma/client') return { PrismaClient: class {} };
        if (name === '@/app/api/_lib/adminAccess') return { requireAdminServiceAccess: async (...args) => { calls.push(args); return { ok: false, response: result }; } };
        return {};
      } });
      const request = new Proxy({}, { get() { throw Error('Unauthorised payload accessed'); } });
      assert.equal(await exports[verb](request), result);
      assert.deepEqual(calls[0], ['blog_management', 'edit']);
    });
  }
}
