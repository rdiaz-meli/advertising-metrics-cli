import ApiClient from 'lib/api';

export default async function whoami(apiClient: ApiClient) {
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
