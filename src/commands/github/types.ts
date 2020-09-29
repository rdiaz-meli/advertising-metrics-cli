import { ListrTaskWrapper } from 'listr';
import ApiClient from '../../lib/ApiClient';

export type PullRequestMetrics = {
  number: number;
  title: string;
  url: string;
  author: {
    login: string;
  };
  deletions: number;
  additions: number;
  changedFiles: number;
  createdAt: string;
  mergedAt: string;
  timelineItems: {
    nodes: {
      __typename:
        | 'ReadyForReviewEvent'
        | 'ConvertToDraftEvent'
        | 'ClosedEvent'
        | 'MergedEvent'
        | 'ReopenedEvent';
      createdAt: string;
    }[];
  };
  repository: {
    name: string;
  };
  reviews: {
    nodes: {
      author: {
        login: string;
      };
      state:
        | 'PENDING'
        | 'COMMENTED'
        | 'APPROVED'
        | 'CHANGES_REQUESTED'
        | 'DISMISSED';
      comments: {
        totalCount: number;
      };
    }[];
  };
};

export type PullRequestMetricsSearchResult = {
  search: {
    pageInfo: {
      startCursor: string;
      endCursor: string;
      hasNextPage: boolean;
    };
    nodes: PullRequestMetrics[];
  };
};

export type GithubCommandArgs = {
  apiClient: ApiClient;
  repos: {
    owner: string;
    repo: string;
  }[];
  ranges: [string, string][];
  labels: string[];
  includePrs: boolean;
  includeAuthors: boolean;
  includeProjects: boolean;
  includeReviewers: boolean;
};

export type GithubCommandOptions = {
  ranges: [string, string][];
  repos: {
    owner: string;
    repo: string;
  }[];
  labels: string[];
  includePrs: boolean;
  includeAuthors: boolean;
  includeProjects: boolean;
  includeReviewers: boolean;
};

export type RangeMetrics = {
  range: [string, string];
  metrics: PullRequestMetrics[];
};

export type GithubCommandCtx = GithubCommandArgs & {
  rangesMetrics: RangeMetrics[];
};

export type GithubCommandTask = ListrTaskWrapper<GithubCommandCtx>;

export type ReportData = {
  [key: string]: { [range: string]: PullRequestMetrics[] };
};

export type ReviewerMetrics = {
  pending: number;
  approved: number;
  dismissed: number;
  comments: number;
  changesRequested: number;
};

export type ReviewersData = {
  [key: string]: { [range: string]: ReviewerMetrics };
};
