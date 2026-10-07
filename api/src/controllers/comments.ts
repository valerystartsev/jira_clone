import { Comment } from 'entities';
import { BadUserInputError, catchErrors } from 'errors';
import { createEntity, validateAndSaveEntity } from 'utils/typeorm';
import { assertAllowedFields, findProjectComment, findProjectIssue } from 'utils/access';

export const create = catchErrors(async (req, res) => {
  assertAllowedFields(req.body, ['body', 'issueId', 'userId']);
  if (req.body.userId !== undefined && req.body.userId !== req.currentUser.id) {
    throw new BadUserInputError({ fields: { userId: 'Invalid author.' } });
  }
  const issue = await findProjectIssue(req.body.issueId, req.currentUser.projectId);
  const comment = await createEntity(Comment, {
    body: req.body.body,
    issueId: issue.id,
    userId: req.currentUser.id,
  });
  res.respond({ comment });
});

export const update = catchErrors(async (req, res) => {
  const comment = await findProjectComment(req.params.commentId, req.currentUser.projectId);
  assertAllowedFields(req.body, ['body']);
  comment.body = req.body.body;
  await validateAndSaveEntity(comment);
  res.respond({ comment });
});

export const remove = catchErrors(async (req, res) => {
  const comment = await findProjectComment(req.params.commentId, req.currentUser.projectId);
  await comment.remove();
  res.respond({ comment });
});
