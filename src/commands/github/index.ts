import Listr from 'listr';
import Table from 'cli-table';
import { orderBy, uniq } from 'lodash';
import roundNumber from '../../helper/roundNumber';
import numberFormat from '../../helper/numberFormat';
import {
  GithubCommandArgs,
  GithubCommandCtx,
  GithubCommandTask,
  PullRequestMetrics,
  ReportData,
  ReviewersData,
} from './types';
import queryMetrics from './queryMetrics';
import timeToMerge from './timeToMerge';

async function fetchPullRequests(
  ctx: GithubCommandCtx,
  task: GithubCommandTask,
) {
  task.title = 'Fetching metrics';

  ctx.rangesMetrics = await Promise.all(
    ctx.ranges.map((range) => queryMetrics(ctx, range)),
  );

  task.title = `Metrics fetched`;
}

function avg(
  pullRequests: PullRequestMetrics[],
  callback: (pr: PullRequestMetrics) => number,
) {
  return roundNumber(
    pullRequests.reduce((result, current) => result + callback(current), 0) /
      pullRequests.length,
  );
}

function aggregatePullRequestsMetrics(pullRequests: PullRequestMetrics[]) {
  return {
    mergedPRs: pullRequests.length,
    additions: avg(pullRequests, (current) => current.additions),
    deletions: avg(pullRequests, (current) => current.deletions),
    changedFiles: avg(pullRequests, (current) => current.changedFiles),
    hoursToMerge: avg(pullRequests, (current) => timeToMerge(current)),
  };
}

function stringifyLOC(additions: number, deletions: number) {
  return `+${numberFormat(additions)} -${numberFormat(deletions)}`;
}

function diffSymbol(diff: number) {
  return diff >= 0 ? '+' : '-';
}

function stringifyDiff(
  value: number,
  previousValue?: number,
  desiredSymbol: '+' | '-' = '+',
) {
  const diff =
    previousValue == null ? null : roundNumber(value - previousValue);
  const valueString = numberFormat(value);

  if (diff == null || previousValue == null || Number.isNaN(diff)) {
    return valueString;
  }

  if (diff === 0) {
    return `${valueString}  ${'='.yellow}`;
  }

  const absDiff = Math.abs(diff);
  const symbol = diffSymbol(diff);
  const color = symbol === desiredSymbol ? 'green' : 'red';
  const percentage = roundNumber((absDiff * 100) / (previousValue || 1));

  return `${valueString}  ${`${symbol}${numberFormat(percentage)}%`[color]}`;
}

function printAggregatedReport(
  ctx: GithubCommandCtx,
  keyName: string,
  data: ReportData,
) {
  const showDateRange = ctx.ranges.length > 1;
  const head = [
    keyName,
    'MERGED PRS',
    'AVG LEAD TIME',
    'AVG LINES OF CODE',
    'AVG CHANGED FILES',
  ];

  if (showDateRange) {
    head.splice(1, 0, 'DATE RANGE');
  }

  const metricsTable = new Table({
    head,
    style: { head: ['bold'] },
  });

  orderBy(Object.entries(data), (entry) => entry[0].toLowerCase()).forEach(
    ([key, rangeMetrics]) => {
      const sortedMetrics = orderBy(
        Object.entries(rangeMetrics),
        (entry) => entry[0],
      );
      const calculatedMetrics = sortedMetrics.map(([, metrics]) =>
        aggregatePullRequestsMetrics(metrics),
      );

      sortedMetrics.forEach(([rangeKey], rangeIndex) => {
        const {
          mergedPRs,
          additions,
          deletions,
          changedFiles,
          hoursToMerge,
        } = calculatedMetrics[rangeIndex];
        const row = [
          rangeIndex === 0 ? key.bold : ' ∟',
          stringifyDiff(
            mergedPRs,
            calculatedMetrics[rangeIndex - 1]?.mergedPRs,
            '+',
          ),
          stringifyDiff(
            hoursToMerge,
            calculatedMetrics[rangeIndex - 1]?.hoursToMerge,
            '-',
          ),
          stringifyLOC(additions, deletions),
          numberFormat(changedFiles),
        ];

        if (showDateRange) {
          row.splice(1, 0, rangeKey);
        }

        metricsTable.push(row);
      });
    },
  );

  console.log('');
  console.log(metricsTable.toString());
}

function printPRsReport(ctx: GithubCommandCtx) {
  const metricsTable = new Table({
    head: ['PR', 'AUTHOR', 'LEAD TIME', 'LINES OF CODE', 'CHANGED FILES'],
    style: { head: ['bold'] },
  });

  ctx.rangesMetrics.forEach(({ metrics }) => {
    orderBy(metrics, 'number').forEach((pullRequest) => {
      metricsTable.push([
        `${pullRequest.title.bold}\n${pullRequest.url}`,
        `@${pullRequest.author.login}`,
        numberFormat(timeToMerge(pullRequest)),
        stringifyLOC(pullRequest.additions, pullRequest.deletions),
        numberFormat(pullRequest.changedFiles),
      ]);
    });
  });

  console.log('');
  console.log(metricsTable.toString());
}

function getReviewersMetrics(ctx: GithubCommandCtx) {
  const data: ReviewersData = {};

  const users = uniq(
    ctx.rangesMetrics.reduce<string[]>(
      (result, current) => [
        ...result,
        ...current.metrics.reduce<string[]>(
          (metricResults, metric) => [
            ...metricResults,
            ...metric.reviews.nodes.map((review) => review.author.login),
          ],
          [],
        ),
      ],
      [],
    ),
  );

  users.forEach((user) => {
    ctx.rangesMetrics.forEach(({ range, metrics }) => {
      const rangeKey = `${range[0]}..${range[1]}`;

      metrics.forEach((pullRequest) => {
        const reviews = pullRequest.reviews.nodes.filter(
          (review) => review.author.login === user,
        );
        const approved = !!reviews.find(
          (review) => review.state === 'APPROVED',
        );
        const dismissed =
          !approved && !!reviews.find((review) => review.state === 'DISMISSED');
        const changesRequested = !!reviews.find(
          (review) => review.state === 'CHANGES_REQUESTED',
        );
        const comments = reviews.reduce(
          (result, current) => result + current.comments.totalCount,
          0,
        );
        const pending = !!reviews.find((review) => review.state === 'PENDING');

        if (!data[user]) {
          data[user] = {};
        }

        if (!data[user][rangeKey]) {
          data[user][rangeKey] = {
            pending: 0,
            approved: 0,
            dismissed: 0,
            changesRequested: 0,
            comments: 0,
          };
        }

        if (pending) {
          data[user][rangeKey].pending += 1;
        }

        if (approved) {
          data[user][rangeKey].approved += 1;
        }

        if (dismissed) {
          data[user][rangeKey].dismissed += 1;
        }

        if (changesRequested) {
          data[user][rangeKey].changesRequested += 1;
        }

        data[user][rangeKey].comments += comments;
      });
    });
  });

  return data;
}

function printReviewersReport(ctx: GithubCommandCtx) {
  const showDateRange = ctx.ranges.length > 1;
  const head = [
    'REVIEWER',
    'REVIEWED PRS',
    'REQUESTED CHANGES PRS',
    'COMMENTS',
  ];

  if (showDateRange) {
    head.splice(1, 0, 'DATE RANGE');
  }

  const metricsTable = new Table({
    head,
    style: { head: ['bold'] },
  });

  const data = getReviewersMetrics(ctx);

  orderBy(Object.entries(data), (entry) => entry[0].toLowerCase()).forEach(
    ([key, rangeMetrics]) => {
      const sortedMetrics = orderBy(
        Object.entries(rangeMetrics),
        (entry) => entry[0],
      );

      sortedMetrics.forEach(([rangeKey, metrics], rangeIndex) => {
        const { approved, dismissed, changesRequested, comments } = metrics;
        const prevMetrics = sortedMetrics[rangeIndex - 1]?.[1];
        const row = [
          rangeIndex === 0 ? key.bold : ' ∟',
          stringifyDiff(
            approved + dismissed,
            prevMetrics?.approved + prevMetrics?.dismissed,
            '+',
          ),
          stringifyDiff(changesRequested),
          stringifyDiff(comments),
        ];

        if (showDateRange) {
          row.splice(1, 0, rangeKey);
        }

        metricsTable.push(row);
      });
    },
  );

  console.log('');
  console.log(metricsTable.toString());
}

function printTotals(ctx: GithubCommandCtx) {
  const metricsTable = new Table({
    head: [
      'DATE RANGE',
      'MERGED PRS',
      'AVG LEAD TIME',
      'AVG LINES OF CODE',
      'AVG CHANGED FILES',
    ],
    style: { head: ['bold'] },
  });

  const calculatedMetrics = ctx.rangesMetrics.map(({ metrics }) =>
    aggregatePullRequestsMetrics(metrics),
  );

  ctx.rangesMetrics.forEach(({ range }, index) => {
    const {
      mergedPRs,
      additions,
      deletions,
      changedFiles,
      hoursToMerge,
    } = calculatedMetrics[index];

    metricsTable.push([
      `${range[0]}..${range[1]}`.bold,
      stringifyDiff(mergedPRs, calculatedMetrics[index - 1]?.mergedPRs, '+'),
      stringifyDiff(
        hoursToMerge,
        calculatedMetrics[index - 1]?.hoursToMerge,
        '-',
      ),
      stringifyLOC(additions, deletions),
      numberFormat(changedFiles),
    ]);
  });

  console.log('');
  console.log(metricsTable.toString());
}

function printProjectsReport(ctx: GithubCommandCtx) {
  const data: ReportData = {};
  const keys = uniq(
    ctx.rangesMetrics.reduce<string[]>(
      (result, range) => [
        ...result,
        ...range.metrics.map((metric) => metric.repository.name),
      ],
      [],
    ),
  );

  keys.forEach((key) => {
    ctx.rangesMetrics.forEach(({ range, metrics }) => {
      const rangeKey = `${range[0]}..${range[1]}`;

      if (!data[key]) {
        data[key] = {};
      }

      if (!data[key][rangeKey]) {
        data[key][rangeKey] = [];
      }

      metrics.forEach((pullRequest) => {
        if (pullRequest.repository.name === key) {
          data[key][rangeKey].push(pullRequest);
        }
      });
    });
  });

  printAggregatedReport(ctx, 'PROJECT', data);
}

function printAuthorsReport(ctx: GithubCommandCtx) {
  const data: ReportData = {};
  const keys = uniq(
    ctx.rangesMetrics.reduce<string[]>(
      (result, range) => [
        ...result,
        ...range.metrics.map((metric) => metric.author.login),
      ],
      [],
    ),
  );

  keys.forEach((key) => {
    ctx.rangesMetrics.forEach(({ range, metrics }) => {
      const rangeKey = `${range[0]}..${range[1]}`;

      if (!data[key]) {
        data[key] = {};
      }

      if (!data[key][rangeKey]) {
        data[key][rangeKey] = [];
      }

      metrics.forEach((pullRequest) => {
        if (pullRequest.author.login === key) {
          data[key][rangeKey].push(pullRequest);
        }
      });
    });
  });

  printAggregatedReport(ctx, 'AUTHOR', data);
}

export default async function githubCommand(args: GithubCommandArgs) {
  console.log('');

  const context: GithubCommandCtx = {
    ...args,
    rangesMetrics: [],
  };

  const appTasks = new Listr(
    [
      {
        title: 'Fetch metrics',
        task: fetchPullRequests,
      },
    ],
    { collapse: false },
  );

  try {
    const result = await appTasks.run(context);

    if (result.includePrs) {
      printPRsReport(result);
    }

    if (result.includeAuthors) {
      printAuthorsReport(result);
    }

    if (result.includeProjects) {
      printProjectsReport(result);
    }

    if (result.includeReviewers) {
      printReviewersReport(result);
    }

    printTotals(result);
  } catch (error) {
    console.log(`\n${error.message}`);
  }
}
