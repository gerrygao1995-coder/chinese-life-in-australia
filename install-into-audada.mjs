// MIT. Explicit local installation only. Does not deploy or overwrite an existing guide.
import {readFile,readdir,mkdir,copyFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url));
const i=process.argv.indexOf('--audada-root');
if(i<0||!process.argv[i+1]||!path.isAbsolute(process.argv[i+1]))throw Error('Usage: node install-into-audada.mjs --audada-root ABSOLUTE_PROJECT_PATH');
const project=await realpath(process.argv[i+1]);
const pkg=JSON.parse(await readFile(path.join(project,'package.json'),'utf8'));
if(!pkg.dependencies?.react||!pkg.dependencies?.vinext)throw Error('Expected the existing React/Vinext AUDADA project; no files copied.');
const report=JSON.parse(await readFile(path.join(source,'size-report.json'),'utf8'));
if(!report.complete||report.ratio<10||report.paragraphBodyRatio<10)throw Error('Guide is an incomplete preview; refusing integration.');
const publicDir=await realpath(path.join(project,'public'));
const target=path.resolve(publicDir,'life-guide');
if(path.dirname(target)!==publicDir)throw Error('Unexpected target directory');
try{await stat(target);throw Error('public/life-guide already exists. Review and back it up in your project workflow; this installer will not overwrite it.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(target);
let files=0;
async function copy(dir,relative=''){for(const e of await readdir(dir,{withFileTypes:true})){const rel=path.join(relative,e.name);if(e.isDirectory()){if(relative===''&&e.name!=='articles')continue;await mkdir(path.join(target,rel));await copy(path.join(dir,e.name),rel);}else if(/\.(html|css|js|svg|png|xml)$/.test(e.name)||['.nojekyll','LICENSE','LICENSE-CODE','ATTRIBUTION.md'].includes(e.name)){await copyFile(path.join(dir,e.name),path.join(target,rel));files++;}}}
await copy(source);console.log(JSON.stringify({target,files,entry:'/life-guide/index.html',deployed:false,navigationChanged:false},null,2));
