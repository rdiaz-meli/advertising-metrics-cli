import { Octokit } from '@octokit/core';
import {
  Milestone,
  IssuesUpdateMilestoneEndpoint,
  PullsCreateEndpoint,
  PullsUpdateEndpoint,
  ReposListPullRequestAssociatedWithCommit,
  Endpoints,
  ResponseHeaders,
  Branch,
} from '@octokit/types';
import { Optional } from 'utility-types';

type Endpoint<
  T extends Record<string, unknown>,
  K extends keyof T = never
> = Omit<Optional<T, K>, 'owner' | 'repo'>;

function getNextPage(headers: ResponseHeaders) {
  const match = headers.link?.match(/<.*?page=(\d+)>; rel="next"/);

  return match ? parseInt(match[1], 10) : null;
}

class ApiClient {
  owner: string;
  repo: string;
  client: Octokit;

  constructor(owner: string, repo: string, token: string) {
    this.owner = owner;
    this.repo = repo;
    this.client = new Octokit({ auth: token });
  }

  async isValid(owner = this.owner, repo = this.repo) {
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

  async paginate<R extends keyof Endpoints>(route: R, options?: any) {
    const response: Endpoints[R]['response'] = (await this.client.request<R>(
      route,
      options,
    )) as any;
    let nextPage = getNextPage(response.headers);

    while (nextPage) {
      // eslint-disable-next-line no-await-in-loop
      const pageResponse: Endpoints[R]['response'] = (await this.client.request<
        R
      >(route, { ...options, page: nextPage })) as any;

      nextPage = getNextPage(pageResponse.headers);
      response.data.push(...pageResponse.data);
    }

    return response;
  }

  async getMilestone(title: string) {
    const response = await this.paginate('GET /repos/:owner/:repo/milestones', {
      owner: this.owner,
      repo: this.repo,
      state: 'all',
    });

    return response.data.find((milestone) => milestone.title === title);
  }

  async getMilestonePendingPullRequests(milestone?: Milestone) {
    if (!milestone) {
      return [];
    }

    const response = await this.client.request(
      'GET /repos/:owner/:repo/pulls',
      {
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        base: 'develop',
      },
    );

    return response.data.filter(
      (pr) => pr.milestone && milestone && pr.milestone.id === milestone.id,
    );
  }

  async createMilestone(title: string) {
    const response = await this.client.request(
      'POST /repos/:owner/:repo/milestones',
      {
        owner: this.owner,
        repo: this.repo,
        title,
        state: 'open',
      },
    );

    return response.data;
  }

  async updateMilestone(
    milestoneNumber: number,
    data: Endpoint<IssuesUpdateMilestoneEndpoint, 'milestone_number'>,
  ) {
    const response = await this.client.request(
      'PATCH /repos/:owner/:repo/milestones/:milestone_number',
      {
        owner: this.owner,
        repo: this.repo,
        milestone_number: milestoneNumber,
        ...data,
      },
    );

    return response.data;
  }

  async closeMilestone(milestoneNumber: number) {
    const response = await this.client.request(
      'PATCH /repos/:owner/:repo/milestones/:milestone_number',
      {
        owner: this.owner,
        repo: this.repo,
        milestone_number: milestoneNumber,
        state: 'closed',
      },
    );

    return response.data;
  }

  async getBranch(branch: string) {
    try {
      const response = await this.client.request(
        'GET /repos/:owner/:repo/branches/:branch',
        {
          owner: this.owner,
          repo: this.repo,
          branch,
        },
      );

      return response.data;
    } catch (err) {
      if (err.message === 'Branch not found') {
        return null;
      }

      throw err;
    }
  }

  async getBranchCommit(branchName: string) {
    const branch = await this.getBranch(branchName);

    return branch?.commit.sha;
  }

  async createBranch(base: string, branchName: string) {
    const baseCommit = await this.getBranchCommit(base);

    if (!baseCommit) {
      throw new Error(`Branch ${base} not found`);
    }

    const response = await this.client.request(
      'POST /repos/:owner/:repo/git/refs',
      {
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseCommit,
      },
    );

    return response;
  }

  async updateBranch(base: string, branchName: string) {
    const baseCommit = await this.getBranchCommit(base);

    if (!baseCommit) {
      throw new Error(`Branch ${base} not found`);
    }

    const response = await this.client.request(
      'PATCH /repos/:owner/:repo/git/refs/:ref',
      {
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`,
        sha: baseCommit,
      },
    );

    return response.data;
  }

  async getPullRequest(branchName: string) {
    const response = await this.client.request(
      'GET /repos/:owner/:repo/pulls',
      {
        owner: this.owner,
        repo: this.repo,
        state: 'all',
        head: `${this.owner}:${branchName}`,
      },
    );

    return response.data.find((pr) => pr.head.ref === branchName);
  }

  graphql<T = unknown>(query: string) {
    return this.client.graphql(query) as Promise<T>;
  }

  async createPullRequest(data: Endpoint<PullsCreateEndpoint, 'base'>) {
    const response = await this.client.request(
      'POST /repos/:owner/:repo/pulls',
      {
        owner: this.owner,
        repo: this.repo,
        base: 'master',
        ...data,
      },
    );

    return response.data;
  }

  async mergePullRequest(pullNumber: number) {
    const response = await this.client.request(
      'PUT /repos/:owner/:repo/pulls/:pull_number/merge',
      {
        owner: this.owner,
        repo: this.repo,
        pull_number: pullNumber,
      },
    );

    return response.data;
  }

  async updatePullRequest(
    pullNumber: number,
    data: Endpoint<PullsUpdateEndpoint, 'pull_number'>,
  ) {
    const response = await this.client.request(
      'PATCH /repos/:owner/:repo/pulls/:pull_number',
      {
        owner: this.owner,
        repo: this.repo,
        pull_number: pullNumber,
        ...data,
      },
    );

    return response.data;
  }

  async getCommitsListBetweenBranches(base: string, head: string) {
    const response = await this.client.request(
      'GET /repos/:owner/:repo/compare/:base...:head',
      {
        owner: this.owner,
        repo: this.repo,
        base,
        head,
      },
    );

    return response.data.commits;
  }

  async getBranchCommitsList(branch: Branch) {
    const response = await this.client.request(
      'GET /repos/:owner/:repo/commits',
      {
        owner: this.owner,
        repo: this.repo,
        sha: branch.commit.sha,
      },
    );

    return response.data;
  }

  async getCommitPullRequests(sha: string) {
    const response = await this.client.request(
      'GET /repos/:owner/:repo/commits/:commit_sha/pulls',
      {
        owner: this.owner,
        repo: this.repo,
        commit_sha: sha,
        mediaType: {
          previews: ['groot'],
        },
      },
    );

    return response.data;
  }

  async getMergedPRs(commits: { sha: string }[]) {
    const merged: {
      [key: number]: ReposListPullRequestAssociatedWithCommit;
    } = {};

    const responses = await Promise.all(
      commits.map((commit) => this.getCommitPullRequests(commit.sha)),
    );

    responses.forEach((prs) => {
      prs
        .filter((pr) => pr.state === 'closed')
        .forEach((pr) => {
          merged[pr.number] = pr;
        });
    });

    return Object.values(merged);
  }

  async assignMilestoneToPR(pullNumber: number, milestoneNumber: number) {
    const response = await this.client.request(
      'PATCH /repos/:owner/:repo/issues/:issue_number',
      {
        owner: this.owner,
        repo: this.repo,
        issue_number: pullNumber,
        milestone: milestoneNumber,
      },
    );

    return response.data;
  }
}

export default ApiClient;
