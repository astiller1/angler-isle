// Builds the game and publishes dist/ to the gh-pages branch of the "origin" remote (GitHub Pages).
//   npm run deploy
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin', { cwd: root }).toString().trim();
const commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();

run('npm run build');
const dist = join(root, 'dist');
writeFileSync(join(dist, '.nojekyll'), '');
run('git init -q -b gh-pages', dist);
run('git add -A', dist);
run(`git -c user.name="deploy" -c user.email="deploy@localhost" commit -q -m "Deploy ${commit}"`, dist);
run(`git push -f -q "${remote}" gh-pages`, dist);
console.log(`Deployed ${commit} to gh-pages.`);
