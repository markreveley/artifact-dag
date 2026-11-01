import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { hmac } from '@noble/hashes/hmac';
import { hkdf } from '@noble/hashes/hkdf';
import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes } from '@noble/hashes/utils';
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes){ let n=0n; for(const b of bytes) n=(n<<8n)+BigInt(b); let s=''; while(n>0n){ s=B58[Number(n%58n)]+s; n/=58n;} for(const b of bytes){ if(b===0) s='1'+s; else break;} return s; }
function b64url(bytes){ let s=''; for(const b of bytes) s+=String.fromCharCode(b); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(str){ str=str.replace(/-/g,'+').replace(/_/g,'/'); while(str.length%4) str+='='; const bin=atob(str); return Uint8Array.from(bin,c=>c.charCodeAt(0)); }
const bytesToUtf8 = (b)=> new TextDecoder().decode(b);
export { ed, sha256, sha512, hmac, hkdf, blake3, bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8, randomBytes, base58, b64url, unb64url };
