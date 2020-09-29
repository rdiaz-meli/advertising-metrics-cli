import { execSync } from 'child_process';
import checkForUpdates from './updater';
import getGithubToken from './token';

export default async function action() {
  if (await checkForUpdates()) {
    execSync(`adv-metrics ${process.argv.slice(2).join(' ')}`, {
      stdio: 'inherit',
    });
    process.exit();
  }

  return getGithubToken();
}
