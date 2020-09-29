import { differenceInMinutes, parseISO } from 'date-fns';
import roundNumber from '../../lib/roundNumber';
import { PullRequestMetrics } from './types';

export default function timeToMerge(pullRequest: PullRequestMetrics) {
  const readyAtString =
    pullRequest.timelineItems.nodes[0]?.__typename === 'ReadyForReviewEvent'
      ? pullRequest.timelineItems.nodes[0].createdAt
      : pullRequest.createdAt;

  let currentDate: Date | null = parseISO(readyAtString);
  let time = 0;

  pullRequest.timelineItems.nodes.forEach((node) => {
    switch (node.__typename) {
      case 'ClosedEvent':
      case 'MergedEvent':
      case 'ConvertToDraftEvent':
        if (currentDate) {
          time +=
            differenceInMinutes(parseISO(node.createdAt), currentDate) / 60;
        }
        currentDate = null;
        break;

      case 'ReadyForReviewEvent':
      case 'ReopenedEvent':
        currentDate = parseISO(node.createdAt);
        break;

      default:
        break;
    }
  });

  return roundNumber(time);
}
