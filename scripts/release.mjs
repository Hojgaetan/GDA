#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(cmd, opts = {}) {
  const { stdio = 'inherit', dryRun = false } = opts;
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return '';
  }
  return execSync(cmd, { stdio });
}

function getPkgVersion() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  return pkg.version;
}

function hasUncommittedChanges() {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf8' });
    return out.trim().length > 0;
  } catch {
    return true;
  }
}

function remoteExists(name = 'origin') {
  try {
    const out = execSync('git remote', { encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(Boolean).includes(name);
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(`\nUsage: npm run release [--] <type|version> [--dry-run]\n\nArguments:\n  type        patch | minor | major\n  version     x.y.z explicite\n\nOptions:\n  --dry-run   affiche les commandes sans les exécuter\n\nExemples:\n  npm run release -- patch\n  npm run release -- minor\n  npm run release -- 1.2.3\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const filtered = argv.filter(a => a !== '--dry-run');
  const arg = filtered[0];

  if (!arg || arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(arg ? 0 : 1);
  }

  const isType = ['patch', 'minor', 'major'].includes(arg);
  const versionOrType = arg;

  if (hasUncommittedChanges()) {
    console.error('\nErreur: votre working tree contient des modifications non committées. Commitez ou stash avant de relâcher.');
    process.exit(1);
  }

  console.log('✓ Working tree propre');

  console.log('\n▶ Tests');
  run('npm test', { dryRun });

  console.log('\n▶ Build');
  run('npm run -s build', { dryRun });

  const before = getPkgVersion();
  console.log(`\nVersion actuelle: v${before}`);

  console.log('\n▶ Bump version + tag');
  const versionCmd = isType
    ? `npm version ${versionOrType} -m "chore(release): v%s"`
    : `npm version ${versionOrType} -m "chore(release): v%s"`;
  run(versionCmd, { dryRun });

  const after = dryRun ? '(calculée)' : getPkgVersion();
  console.log(`Nouvelle version: v${after}`);

  console.log('\n▶ Push commits + tags');
  const canPush = remoteExists('origin');
  if (!canPush) {
    console.warn('Aucun remote "origin" détecté, skip push.');
  } else {
    run('git push origin HEAD --follow-tags', { dryRun });
  }

  console.log('\n✓ Release terminée');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

