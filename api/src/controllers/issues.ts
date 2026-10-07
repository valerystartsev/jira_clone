import { pick } from 'lodash';

import { Issue } from 'entities';
import { BadUserInputError, EntityNotFoundError, catchErrors } from 'errors';
import { createEntity, validateAndSaveEntity } from 'utils/typeorm';
import { assertAllowedFields, findProjectIssue, findProjectUsers } from 'utils/access';

const issueFields = [
  'title',
  'type',
  'status',
  'priority',
  'description',
  'estimate',
  'timeSpent',
  'timeRemaining',
  'reporterId',
];

export const getProjectIssues = catchErrors(async (req, res) => {
  const { projectId } = req.currentUser;
  const { searchTerm } = req.query;

  let whereSQL = 'issue.projectId = :projectId';

  if (searchTerm) {
    whereSQL += ' AND (issue.title ILIKE :searchTerm OR issue.descriptionText ILIKE :searchTerm)';
  }

  const issues = await Issue.createQueryBuilder('issue')
    .select()
    .where(whereSQL, { projectId, searchTerm: `%${searchTerm}%` })
    .getMany();

  res.respond({ issues });
});

export const getIssueWithUsersAndComments = catchErrors(async (req, res) => {
  const issue = await findProjectIssue(req.params.issueId, req.currentUser.projectId, [
    'users',
    'comments',
    'comments.user',
  ]);
  res.respond({ issue });
});

export const create = catchErrors(async (req, res) => {
  const { projectId } = req.currentUser;
  assertAllowedFields(req.body, [...issueFields, 'projectId', 'userIds', 'users']);
  if (req.body.projectId !== undefined && req.body.projectId !== projectId) {
    throw new EntityNotFoundError('Project');
  }
  if (req.body.reporterId !== undefined) {
    await findProjectUsers([req.body.reporterId], projectId);
  }
  const users = await findProjectUsers(req.body.userIds || [], projectId);
  const { status } = req.body;
  const listPosition = await calculateListPosition(projectId, status);
  const issue = await createEntity(Issue, {
    ...pick(req.body, issueFields),
    projectId,
    listPosition,
    users,
  });
  res.respond({ issue });
});

export const update = catchErrors(async (req, res) => {
  const { projectId } = req.currentUser;
  const issue = await findProjectIssue(req.params.issueId, projectId);
  assertAllowedFields(req.body, [...issueFields, 'listPosition', 'userIds', 'users']);
  if (req.body.reporterId !== undefined) {
    await findProjectUsers([req.body.reporterId], projectId);
  }
  Object.assign(issue, pick(req.body, [...issueFields, 'listPosition']));
  if (req.body.userIds !== undefined) {
    issue.users = await findProjectUsers(req.body.userIds, projectId);
  } else if (req.body.users !== undefined) {
    throw new BadUserInputError({ fields: { userIds: 'Invalid users.' } });
  }
  await validateAndSaveEntity(issue);
  res.respond({ issue });
});

export const remove = catchErrors(async (req, res) => {
  const issue = await findProjectIssue(req.params.issueId, req.currentUser.projectId);
  await issue.remove();
  res.respond({ issue });
});

const calculateListPosition = async (
  projectId: number,
  status: Issue['status'],
): Promise<number> => {
  const issues = await Issue.find({ projectId, status });

  const listPositions = issues.map(({ listPosition }) => listPosition);

  if (listPositions.length > 0) {
    return Math.min(...listPositions) - 1;
  }
  return 1;
};
