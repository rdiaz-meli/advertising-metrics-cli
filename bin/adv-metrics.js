#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const semver = require('semver');

if (semver.gte(process.version, '8.3.0')) {
  // eslint-disable-next-line global-require
  require('../dist/index');
} else {
  console.log('Node >=8.3.0 is required');
}
