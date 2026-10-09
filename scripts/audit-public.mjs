import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
const paths=files('dist');
if(!paths.includes(join('dist','data.enc.json')))throw new Error('Encrypted dataset is missing');
for(const path of paths) {
 if(!/\.(html|js|css|svg|json)$/.test(path))throw new Error('Unexpected public file');
 if(path.endsWith('.json')&&!path.endsWith('data.enc.json'))throw new Error('Unexpected public JSON');
 if(/private|password\.dpapi|\.env|\.jsonl|\.xlsx/.test(path))throw new Error('Private file is included');
}
const e=JSON.parse(readFileSync('dist/data.enc.json','utf8'));
const keys=['version','compression','kdf','iterations','cipher','salt','iv','ciphertext'];
if(JSON.stringify(Object.keys(e).sort())!==JSON.stringify(keys.sort())||e.version!==1||e.compression!=='gzip'||e.iterations!==600000||e.cipher!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA-256')throw new Error('Invalid encrypted dataset envelope');
console.log(JSON.stringify({status:'passed',publicFiles:paths.length,onlyEncryptedData:true}));
