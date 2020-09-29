import { Octokit } from '@octokit/core';

export default class GithubApiClient {
  client: Octokit;

  constructor(token: string) {
    this.client = new Octokit({ auth: token });
  }

  async isRepoValid(owner: string, repo: string) {
    try {
      await this.client.request('GET /repos/:owner/:repo', {
        owner,
        repo,
      });

      return true;
    } catch (err) {
      return false;
    }
  }

  async getUser() {
    try {
      const response = await this.client.request('GET /user');

      return response.data;
    } catch (err) {
      return null;
    }
  }

  graphql<T = unknown>(query: string) {
    return this.client.graphql(query) as Promise<T>;
  }
}
