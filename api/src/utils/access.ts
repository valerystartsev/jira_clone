import { Comment, Issue, User } from 'entities';
import { BadUserInputError, EntityNotFoundError } from 'errors';

export const findProjectIssue = async (
  issueId: string | number,
  projectId: number,
  relations: string[] = [],
): Promise<Issue> => {
  const id = Number(issueId);
  if (!Number.isInteger(id) || id < 1) throw new EntityNotFoundError('Issue');

  const issue = await Issue.findOne({ where: { id, projectId }, relations });
  if (!issue) throw new EntityNotFoundError('Issue');
  return issue;
};

export const findProjectComment = async (
  commentId: string | number,
  projectId: number,
): Promise<Comment> => {
  const id = Number(commentId);
  if (!Number.isInteger(id) || id < 1) throw new EntityNotFoundError('Comment');

  const comment = await Comment.createQueryBuilder('comment')
    .innerJoin('comment.issue', 'issue')
    .where('comment.id = :id AND issue.projectId = :projectId', { id, projectId })
    .getOne();
  if (!comment) throw new EntityNotFoundError('Comment');
  return comment;
};

export const findProjectUsers = async (ids: number[], projectId: number): Promise<User[]> => {
  if (!Array.isArray(ids) || ids.some(id => !Number.isInteger(id))) {
    throw new BadUserInputError({ fields: { userIds: 'Invalid users.' } });
  }

  const users = await User.findByIds(ids, { relations: ['project'] });
  if (users.length !== ids.length || users.some(user => user.project.id !== projectId)) {
    throw new BadUserInputError({ fields: { userIds: 'Users must belong to the project.' } });
  }
  return users;
};

export const assertAllowedFields = (body: object, allowed: string[]): void => {
  const invalid = Object.keys(body).find(field => !allowed.includes(field));
  if (invalid) {
    throw new BadUserInputError({ fields: { [invalid]: 'Field cannot be changed.' } });
  }
};
