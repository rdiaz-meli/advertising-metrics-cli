import ApiClient from '../../lib/ApiClient';

export default async function whoamiCommand(apiClient: ApiClient) {
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
