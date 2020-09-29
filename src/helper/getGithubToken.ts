import inquirer from 'inquirer';
import { execSync } from 'child_process';

export default async function getGithubToken() {
  if (process.env.ADV_METRICS_GITHUB_TOKEN) {
    return process.env.ADV_METRICS_GITHUB_TOKEN;
  }

  console.log(
    `Environment variable ${'ADV_METRICS_GITHUB_TOKEN'.bold} not found`.yellow,
  );
  console.log('1. Visit https://github.com/settings/tokens.');
  console.log(`2. Generate a token with ${'repo'.bold} permissions.`);

  return inquirer
    .prompt([
      {
        type: 'input',
        name: 'token',
        message: 'Enter the generated token:',
        prefix: '3.',
        validate: (token) => !!token.trim(),
      },
    ])
    .then((answers) => {
      const fileName = /zsh/.test(process.env.SHELL ?? '')
        ? '~/.zshrc'
        : '~/.bash_profile';

      execSync(
        `echo "export ADV_METRICS_GITHUB_TOKEN=\\""${answers.token}\\""" >> ${fileName}`,
      );

      console.log(
        `\n${'ADV_METRICS_GITHUB_TOKEN'.bold} added to file ${fileName}\n`
          .green,
      );

      return answers.token;
    });
}
