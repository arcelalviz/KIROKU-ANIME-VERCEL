import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
const root = process.cwd();
const required = [
  'app/page.tsx', 'app/search/page.tsx', 'app/anime/[id]/page.tsx', 'app/library/page.tsx',
  'app/auth/page.tsx', 'app/account/page.tsx', 'app/stats/page.tsx', 'app/community/page.tsx',
  'app/moderation/page.tsx', 'app/u/[handle]/page.tsx',
  'lib/kitsu.ts', 'components/anime-review-panel.tsx', 'components/public-profile-settings.tsx',
  'supabase/migrations/20261113_kiroku_phase2.sql', 'supabase/migrations/20261113_kiroku_phase3_4.sql',
];
const failures=[];
for (const rel of required) if (!existsSync(join(root,rel))) failures.push(`Missing ${rel}`);
const sources=[];
function collect(dir){if(!existsSync(dir))return; for(const name of readdirSync(dir)){
  const p=join(dir,name);if(statSync(p).isDirectory())collect(p);else if(/\.tsx?$/.test(name))sources.push(p);
}}
for (const dir of ['app','components','lib']) collect(join(root,dir));
for(const path of sources){
  const contents=readFileSync(path,'utf8');
  for(const match of contents.matchAll(/from\s+["'](@\/[^"']+)["']/g)){
    const modulePath=join(root,match[1].slice(2));
    if(!['.ts','.tsx','.js','.jsx','/index.ts','/index.tsx'].some(s=>existsSync(modulePath+s)))failures.push(`Unresolved import ${match[1]} in ${path.slice(root.length+1)}`);
  }
}
const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
if(!pkg.dependencies?.next || !pkg.dependencies?.['@supabase/ssr']) failures.push('Missing required runtime dependencies');
if(failures.length){console.error('KIROKU preflight failed:',...failures.map(f=>'\n - '+f));process.exit(1);}
console.log(`KIROKU preflight passed: ${sources.length} application source files, ${required.length} required features.`);
console.log('NOTE: this does not replace npm install, typecheck, production build, SQL migration, or live API testing.');
