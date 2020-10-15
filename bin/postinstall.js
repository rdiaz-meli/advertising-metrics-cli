/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require('child_process');
const isInstalledGlobally = require('is-installed-globally');
require('colors');

if (isInstalledGlobally) {
  console.log('');
  console.log('');
  console.log(`✅ ${'adv-metrics'.bold} installed!`.green);
  console.log('');
  console.log(
    `You can run ${'adv-metrics --help'.bold} to get usage info:`.yellow,
  );
  console.log('');
  execSync('adv-metrics --help', { stdio: 'inherit' });
}
