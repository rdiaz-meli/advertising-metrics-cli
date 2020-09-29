import ApiClient from 'lib/api';

export { PullRequest, Milestone, Branch } from '@octokit/types';

export type CommandCtx<T> = {
  owner: string;
  repo: string;
  version: string;
  apiClient: ApiClient;
} & T;

export type CommandArgs = {
  owner: string;
  repo: string;
  version: string;
  apiClient: ApiClient;
};
