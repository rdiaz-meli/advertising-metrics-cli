import 'colors';
import { program } from 'commander';
import { GithubCommandOptions } from 'commands/github/types';
import * as commands from './commands';
import initAction from './lib/action';
import { parseProject } from './lib/args-parser';
import ApiClient from './lib/api';
import packageJson from '../package.json';

program.version(packageJson.version);

program
  .command('github')
  .description('Get pull requests metrics in a date range.')
  .requiredOption(
    '--ranges <ranges...>',
    'data ranges to compare, ex "2020-08-17..2020-08-28"',
    (value, previous = []) => {
      (previous as unknown[]).push(value.split('..'));
      return previous;
    },
  )
  .requiredOption(
    '--repos <repos...>',
    'repositories to analyse',
    (value, previous = []) => {
      (previous as unknown[]).push(parseProject(value));
      return previous;
    },
  )
  .option('--labels <labels...>', 'repositories to analyse')
  .option('--include-authors', 'include metrics by author', false)
  .option('--include-projects', 'include metrics by project', false)
  .option('--include-prs', 'include metrics by pull request', false)
  .option('--include-reviewers', 'include metrics by reviewer', false)
  .on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log(
      '  adv-metrics github --range 2020-08-17..2020-08-28 2020-08-31..2020-09-11 --repos fury_advertising-pads-frontend fury_advertising-pads-middlend --labels multicampaign',
    );
  })
  .action(async (options: GithubCommandOptions) => {
    const token = await initAction();
    const apiClient = new ApiClient('', '', token);

    for (let i = 0; i < options.repos.length; i += 1) {
      const { owner, repo } = options.repos[i];

      // eslint-disable-next-line no-await-in-loop
      if (!(await apiClient.isValid(owner, repo))) {
        console.log(
          `${
            `${owner}/${repo}`.bold
          } repository not found. Check the project name or ${
            'ADV_METRICS_GITHUB_TOKEN'.bold
          } value.`.red,
        );
        process.exit();
      }
    }

    await commands.github({ apiClient, ...options });

    console.log('');
  });

program
  .command('whoami')
  .description('Validates the registered github access token.')
  .action(async () => {
    const token = await initAction();
    const apiClient = new ApiClient('', '', token);

    await commands.whoami(apiClient);
  });

program.on('--help', () => {
  console.log('');
  console.log('Environment variables:');
  console.log('  ADV_METRICS_GITHUB_TOKEN: github access token.');
  console.log('');
  console.log('Examples:');
  console.log(
    '  adv-metrics github --range 2020-08-17..2020-08-28 2020-08-31..2020-09-11 --repos fury_advertising-pads-frontend fury_advertising-pads-middlend --labels multicampaign',
  );
});

program.parse(process.argv);
