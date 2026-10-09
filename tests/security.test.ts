import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptData,decryptData} from '../src/crypto.ts';
import {fixture} from './fixture.ts';
import {validateData} from '../src/model.ts';
test('ciphertext round trip keeps Korean names, nulls and integer score components',async()=>{
 const data=fixture(),encrypted=await encryptData(data,'synthetic-test-passphrase');
 assert.deepEqual(validateData(await decryptData(encrypted,'synthetic-test-passphrase')),data);
 assert.equal(JSON.stringify(encrypted).includes(data.people[0].name),false);
 assert.equal(JSON.stringify(encrypted).includes('synthetic-test-passphrase'),false);
});
test('wrong password, modified ciphertext and modified header fail closed',async()=>{
 const e=await encryptData(fixture(),'synthetic-test-passphrase');
 await assert.rejects(decryptData(e,'wrong-password'));
 const bytes=Uint8Array.from(atob(e.ciphertext),c=>c.charCodeAt(0));bytes[0]^=1;
 const changed=btoa(String.fromCharCode(...bytes));
 await assert.rejects(decryptData({...e,ciphertext:changed},'synthetic-test-passphrase'));
 await assert.rejects(decryptData({...e,iterations:1} as unknown as typeof e,'synthetic-test-passphrase'));
 await assert.rejects(decryptData({...e,iv:'AAAA'},'synthetic-test-passphrase'));
});
test('each encryption uses independent salt and IV',async()=>{
 const a=await encryptData(fixture(),'synthetic-test-passphrase'),b=await encryptData(fixture(),'synthetic-test-passphrase');
 assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);assert.notEqual(a.ciphertext,b.ciphertext);
});
