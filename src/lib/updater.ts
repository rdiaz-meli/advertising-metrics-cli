import semver from 'semver';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import packageJson from '../../package.json';

export default async function updater() {
  const logTimeout = setTimeout(() => {
    console.log('Checking for updates...\n');
  }, 2000);

  const currentVersion = packageJson.version;

  try {
    const latestVersion = execSync(`npm show ${packageJson.name} version`, {
      stdio: 'pipe',
    }).toString();

    clearTimeout(logTimeout);

    if (semver.gt(latestVersion, currentVersion)) {
      return inquirer
        .prompt([
          {
            type: 'confirm',
            name: 'update',
            message: 'A new version was found. ¿Update now?',
          },
        ])
        .then((answers) => {
          if (answers.update) {
            execSync(`npm i -g ${packageJson.name}`, { stdio: 'inherit' });
            console.log('\n');
          }

          return answers.update;
        });
    }
    return false;
  } catch (_error) {
    clearTimeout(logTimeout);
    return false;
  }
}
