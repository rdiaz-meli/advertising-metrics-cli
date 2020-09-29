import stringifyParams from '../../helper/stringifyQuery';
import {
  GithubCommandCtx,
  PullRequestMetricsSearchResult,
  RangeMetrics,
} from './types';

export default async function queryMetrics(
  ctx: GithubCommandCtx,
  range: [string, string],
): Promise<RangeMetrics> {
  const query = {
    repo: ctx.repos.map(({ owner, repo }) => `${owner}/${repo}`),
    is: ['pr', 'merged'],
    merged: `${range[0]}..${range[1]}`,
    label: ctx.labels,
  };
  const search: {
    first: number;
    query: string;
    type: string;
    after?: string;
  } = {
    first: 25,
    query: `"${stringifyParams(query)}"`,
    type: 'ISSUE',
    after: undefined,
  };

  let response: PullRequestMetricsSearchResult | null = null;

  do {
    if (response) {
      search.after = `"${response.search.pageInfo.endCursor}"`;
    }

    // eslint-disable-next-line no-await-in-loop
    const current = await ctx.apiClient.graphql<
      PullRequestMetricsSearchResult
    >(`
      {
        search(${stringifyParams(search)}) {
          pageInfo {
            startCursor
            hasNextPage
            endCursor
          }
          nodes {
            ... on PullRequest {
              number
              deletions
              additions
              changedFiles
              createdAt
              mergedAt

              timelineItems(
                first: 50,
                itemTypes: [
                  READY_FOR_REVIEW_EVENT,
                  CONVERT_TO_DRAFT_EVENT,
                  CLOSED_EVENT,
                  REOPENED_EVENT,
                  MERGED_EVENT
                ]
              ) {
                nodes {
                  __typename

                  ... on ConvertToDraftEvent {
                    createdAt
                  }
                  ... on ReadyForReviewEvent {
                    createdAt
                  }
                  ... on ClosedEvent {
                    createdAt
                  }
                  ... on MergedEvent {
                    createdAt
                  }
                  ... on ReopenedEvent {
                    createdAt
                  }
                }
              }

              ${
                ctx.includePrs
                  ? `
                title
                url
                `
                  : ''
              }

              ${
                ctx.includeAuthors || ctx.includePrs
                  ? `
                author {
                  login
                }
                `
                  : ''
              }

              ${
                ctx.includeProjects
                  ? `
                repository {
                  name
                }
                `
                  : ''
              }

              ${
                ctx.includeReviewers
                  ? `
                  reviews(first: 100) {
                    nodes {
                      author {
                        login
                      }
                      state
                      comments(first: 100) {
                        totalCount
                      }
                    }
                  }
                `
                  : ''
              }
            }
          }
        }
      }
    `);

    if (response) {
      response.search.pageInfo = current.search.pageInfo;
      response.search.nodes.push(...current.search.nodes);
    } else {
      response = current;
    }
  } while (response?.search.pageInfo.hasNextPage);

  return {
    range,
    metrics: response?.search.nodes || [],
  };
}
