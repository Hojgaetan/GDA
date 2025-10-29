#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  const { stdio = 'inherit', dryRun = false, cwd = root } = opts;
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return '';
  }
  return execSync(cmd, { stdio, cwd });
}

function getPkg() {
  return JSON.parse(readFileSync(path.join(root, 'package.json')));
}

function hasUncommittedChanges() {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf8', cwd: root });
    return out.trim().length > 0;
  } catch {
    return true;
  }
}

function remoteExists(name = 'origin') {
  try {
    const out = execSync('git remote', { encoding: 'utf8', cwd: root });
    return out.split('\n').map(s => s.trim()).filter(Boolean).includes(name);
  } catch {
    return false;
  }
}

function ensureBadgeInReadme(version) {
  const readmePath = path.join(root, 'README.md');
  if (!existsSync(readmePath)) return;
  let content = readFileSync(readmePath, 'utf8');
  const badge = `![version](https://img.shields.io/badge/version-v${version}-blue)`;
  const marker = '<!-- version-badge -->';
  if (content.includes(marker)) {
    // remplace entre le marker et la fin de la ligne
    content = content.replace(new RegExp(`${marker}.*`), `${marker} ${badge}`);
  } else {
    // insère après le titre principal si possible
    content = content.replace(/^(# .+?)\n/, `$1\n\n${marker} ${badge}\n\n`);
  }
  writeFileSync(readmePath, content, 'utf8');
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

  const before = getPkg().version;
  console.log(`\nVersion actuelle: v${before}`);

  console.log('\n▶ Génération CHANGELOG + bump + tag (standard-version)');
  const stdVerCmd = isType
    ? `npx standard-version --release-as ${versionOrType}`
    : `npx standard-version --release-as ${versionOrType}`;
  run(stdVerCmd, { dryRun });

  const after = dryRun ? '(calculée)' : getPkg().version;
  console.log(`Nouvelle version: v${after}`);

  if (!dryRun) {
    ensureBadgeInReadme(after);
    run('git add README.md', {});
    run(`git commit -m "docs(README): badge version v${after}"`, {});
  } else {
    console.log('[dry-run] mise à jour du badge README');
  }

  console.log('\n▶ Push commits + tags');
  const canPush = remoteExists('origin');
  if (!canPush) {
    console.warn('Aucun remote "origin" détecté, skip push.');
  } else {
    run('git push origin HEAD --follow-tags', { dryRun });
  }

  // Création de la GitHub Release via l'API (si GITHUB_TOKEN dispo)
  console.log('\n▶ GitHub Release');
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.warn('Pas de GITHUB_TOKEN/GH_TOKEN détecté - skip création de la Release.');
  } else {
    const repoUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8', cwd: root }).trim();
    const match = repoUrl.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (!match) {
      console.warn('Impossible de déduire owner/repo depuis remote.origin.url');
    } else {
      const owner = match[1];
      const repo = match[2];
      const tag = dryRun ? `v${after}` : execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: root }).trim();
      const changelog = existsSync(path.join(root, 'CHANGELOG.md'))
        ? readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
        : `Release ${tag}`;
      const body = changelog.split('\n').slice(0, 200).join('\n');
      const payload = {
        tag_name: tag,
        name: tag,
        body,
        draft: false,
        prerelease: false
      };
      const curlCmd = `curl -sS -X POST \
        -H 'Accept: application/vnd.github+json' \
        -H 'Authorization: Bearer ${token}' \
        https://api.github.com/repos/${owner}/${repo}/releases \
        -d '${JSON.stringify(payload)}' | cat`;
      run(curlCmd, { dryRun: !!dryRun, stdio: 'inherit' });
    }
  }

  console.log('\n✓ Release terminée');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
