import GithubApiClient from '../../lib/GithubApiClient';

export default async function whoamiCommand(apiClient: GithubApiClient) {
  const user = await apiClient.getUser();

  if (!user) {
    console.log(`Invalid ${'ADV_METRICS_GITHUB_TOKEN'.bold} token.`.red);
    return;
  }

  if (user.name) {
    console.log(`${user.name.bold} (@${user.login})`);
  } else {
    console.log(`@${user.login}`.bold);
  }
  console.log(user.email);
}
