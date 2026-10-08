// MIT. Validate this offline/static publication, not individual legal or health advice.
import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.dirname(fileURLToPath(import.meta.url));
const preview=process.argv.includes('--preview');
const data=JSON.parse(await readFile(path.join(root,'content.json'),'utf8'));
const report=JSON.parse(await readFile(path.join(root,'size-report.json'),'utf8'));
const baseline=JSON.parse(await readFile(path.join(root,'baseline.json'),'utf8'));
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const routes=JSON.parse(await readFile(path.join(root,'routes.json'),'utf8'));
const units=s=>(s.replace(/https?:\/\/\S+/g,'').match(/\p{Script=Han}|[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/gu)||[]).length;
if(units(await readFile(path.join(root,'baseline-body.txt'),'utf8'))!==baseline.bodyUnits)throw Error('Baseline text/count mismatch');
let raw=0,unique=0,paragraphBodyUnits=0;const seen=new Set(),seenParagraphs=new Set(),errors=[];
const audiences=new Set(['留学生','工作签证','永久居民','公民家庭','父母探亲']);
const canonicalIds=new Set(data.map(a=>a.id));
if(!preview)for(const [series,last] of Object.entries(config.requiredSeries||{}))for(let n=1;n<=last;n++){const id='CN-'+series+String(n).padStart(3,'0');if(!canonicalIds.has(id))errors.push('Required article is unfinished: '+id);}
if(canonicalIds.size!==data.length||new Set(data.map(a=>a.slug)).size!==data.length)errors.push('Duplicate canonical ID or slug');
if(!preview)for(const [aud,title,steps] of routes)for(const [name,desc,ids] of steps)for(const id of ids)if(!canonicalIds.has(id))errors.push('Reading route refers to missing topic '+id);
for(const a of data){
  if(!preview)for(const id of a.related||[])if(!canonicalIds.has(id)||id===a.id)errors.push(a.id+': invalid related article '+id);
  if(a.audiences.some(x=>!audiences.has(x)))errors.push(a.id+': unrecognised audience');
  if(!['医疗','法律','财务','一般'].includes(a.risk))errors.push(a.id+': invalid risk');
  if(a.sections.length<10||!a.terms?.length||a.checklist?.length<5)errors.push(a.id+': missing depth structure');
  const fragments=[a.title,a.summary,...a.sections.flatMap(s=>[s.heading,...s.paragraphs,...(s.bullets||[])]),...(a.terms||[]).flatMap(t=>[t.en,t.zh,t.context]),...(a.checklist||[])].filter(Boolean);
  const total=fragments.reduce((n,f)=>n+units(f),0);if(total<2700)errors.push(a.id+': short article '+total);
  const sectionBody=a.sections.flatMap(s=>[...s.paragraphs,...(s.bullets||[])]).reduce((n,f)=>n+units(f),0);
  for(const f of a.sections.flatMap(s=>[...s.paragraphs,...(s.bullets||[])])){const key=f.replace(/\s+/g,'').trim();if(!seenParagraphs.has(key)){seenParagraphs.add(key);paragraphBodyUnits+=units(f);}}
  if(sectionBody<2800)errors.push(a.id+': section body below required depth '+sectionBody);
  for(const f of fragments){raw+=units(f);const norm=f.replace(/\s+/g,'').trim();if(!seen.has(norm)){seen.add(norm);unique+=units(f);}}
  if(a.sections.some(s=>s.paragraphs.some(p=>/待补充|Lorem ipsum|TODO|这里填写/.test(p))))errors.push(a.id+': unfinished placeholder');
  for(const s of a.sources)if(!s.note||!s.checked||new URL(s.url).protocol!=='https:')errors.push(a.id+': incomplete source');
}
if(paragraphBodyUnits!==report.paragraphBodyUnits)errors.push('Paragraph count mismatch');
if(!preview&&paragraphBodyUnits<config.minimumBodyUnits)errors.push('Main paragraphs alone below tenfold threshold');
if(unique!==report.uniqueBodyUnits||raw!==report.rawBodyUnits)errors.push('Canonical content and generated count differ');
if(!preview&&(!report.complete||unique<config.minimumBodyUnits||unique/baseline.bodyUnits<10))errors.push('Tenfold completion target not reached');
const docs=[...(await readdir(root)).filter(n=>n.endsWith('.html')),...(await readdir(path.join(root,'articles'))).filter(n=>n.endsWith('.html')).map(n=>'articles/'+n)];
const cache=new Map();for(const file of docs)cache.set(file,await readFile(path.join(root,file),'utf8'));
let checkedLinks=0;for(const [file,text] of cache){if(!text.startsWith('<!doctype html>')||!text.includes('lang="zh-CN"'))errors.push(file+': missing language/doctype');
  if(!preview&&text.includes('编写中的本地预览'))errors.push(file+': draft banner in final');
  const ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)errors.push(file+': duplicate HTML ID');
  for(const m of text.matchAll(/(?:href|src)="([^"]+)"/g)){const url=m[1].replaceAll('&amp;','&');if(/^(https?:|tel:|data:)/.test(url))continue;const [target,hash]=url.split('#');const name=(target.split('?')[0]||path.basename(file));const actual=path.normalize(path.join(path.dirname(file),decodeURIComponent(name))).replaceAll('\\','/');
    if(actual.startsWith('../')){errors.push(file+': link escapes package '+url);continue;}try{await stat(path.join(root,actual));checkedLinks++;if(hash&&actual.endsWith('.html')&&!cache.get(actual)?.includes('id="'+hash+'"'))errors.push(file+': missing anchor '+url);}catch{errors.push(file+': missing link '+url);}
  }
}
new vm.Script(await readFile(path.join(root,'app.js'),'utf8'));
const sandbox={window:{}};vm.runInNewContext(await readFile(path.join(root,'search-index.js'),'utf8'),sandbox);
if(sandbox.window.AUDADA_INDEX.length!==data.length)errors.push('Search index count mismatch');
for(const a of data){const i=sandbox.window.AUDADA_INDEX.find(x=>x.id===a.id);if(!i||i.slug!==a.slug||!i.text.includes(a.sections.at(-1).paragraphs.at(-1).toLowerCase()))errors.push(a.id+': incomplete search index');}
if(errors.length)throw Error(errors.join('\n'));
const result={status:preview?'partial preview checks passed':'publication checks passed',articles:data.length,htmlPages:docs.length,internalLinksChecked:checkedLinks,uniqueBodyUnits:unique,paragraphBodyUnits,paragraphBodyRatio:paragraphBodyUnits/baseline.bodyUnits,baselineBodyUnits:baseline.bodyUnits,ratio:unique/baseline.bodyUnits,externalLinks:'source review is recorded per article; this validator does not claim live accessibility or professional correctness',checks:['canonical length and deduplication','minimum article depth','article identifiers and source metadata','all HTML internal file/anchor links','Chinese document language','application JavaScript syntax','search index coverage']};
await writeFile(path.join(root,'validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
