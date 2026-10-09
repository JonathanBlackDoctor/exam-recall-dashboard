export type Envelope = { version: 1; compression: 'gzip'; kdf: 'PBKDF2-SHA-256'; iterations: 600000; cipher: 'AES-256-GCM'; salt: string; iv: string; ciphertext: string };
const encode64 = (b: Uint8Array) => { let s=''; for (const n of b) s+=String.fromCharCode(n); return btoa(s); };
const decode64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function transform(bytes: Uint8Array, compress: boolean) {
  const stream=new Blob([new Uint8Array(bytes)]).stream().pipeThrough(compress?new CompressionStream('gzip'):new DecompressionStream('gzip'));
  const reader=stream.getReader(), chunks: Uint8Array[]=[]; let length=0;
  try {
    while (true) {const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>6_000_000)throw new Error('Data is too large');chunks.push(value);}
    const result=new Uint8Array(length); let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
  } finally {await reader.cancel();}
}
async function keyFor(password: string, salt: Uint8Array, usage: 'encrypt' | 'decrypt') {
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt: new Uint8Array(salt), iterations:600000},material,{name:'AES-GCM',length:256},false,[usage]);
}
export async function encryptData(value: unknown, password: string): Promise<Envelope> {
  const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await keyFor(password,salt,'encrypt');
  const packed=await transform(new TextEncoder().encode(JSON.stringify(value)),true);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,tagLength:128},key,packed);
  packed.fill(0);
  return {version:1,compression:'gzip',kdf:'PBKDF2-SHA-256',iterations:600000,cipher:'AES-256-GCM',salt:encode64(salt),iv:encode64(iv),ciphertext:encode64(new Uint8Array(ciphertext))};
}
export async function decryptData(envelope: Envelope, password: string): Promise<unknown> {
  if (!envelope || envelope.version!==1 || envelope.compression!=='gzip' || envelope.kdf!=='PBKDF2-SHA-256' || envelope.iterations!==600000 || envelope.cipher!=='AES-256-GCM' || typeof envelope.ciphertext!=='string' || envelope.ciphertext.length>8_000_000) throw new Error('Invalid encrypted file');
  const salt=decode64(envelope.salt), iv=decode64(envelope.iv), ciphertext=decode64(envelope.ciphertext);
  if (salt.length!==16 || iv.length!==12 || ciphertext.length<16) throw new Error('Invalid encrypted file');
  const key=await keyFor(password,salt,'decrypt');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,tagLength:128},key,ciphertext);
  let unpacked: Uint8Array | undefined;
  try {unpacked=await transform(new Uint8Array(plain),false);return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(unpacked));}
  finally { new Uint8Array(plain).fill(0);unpacked?.fill(0); }
}
