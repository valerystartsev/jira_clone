require('dotenv/config');
require('reflect-metadata');

if (process.env.NODE_ENV !== 'test' || process.env.DB_DATABASE !== 'jira_api_test') {
  throw new Error('API tests may only reset jira_api_test in test mode.');
}

const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const request = require('supertest');

const createApp = require('../src/app').default;
const createConnection = require('../src/database/createConnection').default;
const { Comment, Issue, Project, User } = require('../src/entities');
const { signToken } = require('../src/utils/authToken');

const app = createApp();
let connection;
let data;

const auth = (method, path, user = data.user) =>
  request(app)
    [method](path)
    .set('Authorization', `Bearer ${signToken({ sub: user.id })}`);

const issueInput = (overrides = {}) => ({
  title: 'New task',
  type: 'task',
  status: 'backlog',
  priority: '3',
  reporterId: data.user.id,
  projectId: data.project.id,
  userIds: [],
  ...overrides,
});

const seed = async () => {
  const project = await Project.create({ name: 'Own project', category: 'software' }).save();
  const otherProject = await Project.create({ name: 'Other project', category: 'software' }).save();
  const user = await User.create({
    name: 'Own user',
    email: 'own@example.test',
    avatarUrl: '',
    project,
  }).save();
  const otherUser = await User.create({
    name: 'Other user',
    email: 'other@example.test',
    avatarUrl: '',
    project: otherProject,
  }).save();
  const issue = await Issue.create({
    title: 'Own issue',
    type: 'task',
    status: 'backlog',
    priority: '3',
    listPosition: 1,
    reporterId: user.id,
    project,
  }).save();
  const otherIssue = await Issue.create({
    title: 'Other issue',
    type: 'task',
    status: 'backlog',
    priority: '3',
    listPosition: 1,
    reporterId: otherUser.id,
    project: otherProject,
  }).save();
  const comment = await Comment.create({
    body: 'Own comment',
    issueId: issue.id,
    userId: user.id,
  }).save();
  const otherComment = await Comment.create({
    body: 'Other comment',
    issueId: otherIssue.id,
    userId: otherUser.id,
  }).save();
  return { project, otherProject, user, otherUser, issue, otherIssue, comment, otherComment };
};

before(async () => {
  connection = await createConnection();
});

beforeEach(async () => {
  assert.equal(process.env.DB_DATABASE, 'jira_api_test');
  await connection.synchronize(true);
  data = await seed();
});

after(async () => {
  if (connection) await connection.close();
});

test('rejects missing, invalid, and expired tokens', async () => {
  await request(app)
    .get('/currentUser')
    .expect(401);
  await request(app)
    .get('/currentUser')
    .set('Authorization', 'Bearer invalid')
    .expect(401);
  const expired = signToken({ sub: data.user.id }, { expiresIn: -1 });
  await request(app)
    .get('/currentUser')
    .set('Authorization', `Bearer ${expired}`)
    .expect(401);
  const response = await auth('get', '/currentUser').expect(200);
  assert.equal(response.body.currentUser.id, data.user.id);
});

test('lists only own project issues, including search results', async () => {
  const response = await auth('get', '/issues').expect(200);
  assert.deepEqual(
    response.body.issues.map(issue => issue.id),
    [data.issue.id],
  );
  const search = await auth('get', '/issues?searchTerm=Other').expect(200);
  assert.equal(search.body.issues.length, 0);
});

test('hides foreign and missing issues on read, update, and delete', async () => {
  await auth('get', `/issues/${data.otherIssue.id}`).expect(404);
  await auth('put', `/issues/${data.otherIssue.id}`)
    .send({ title: 'Changed' })
    .expect(404);
  await auth('delete', `/issues/${data.otherIssue.id}`).expect(404);
  await auth('get', '/issues/999999').expect(404);
  assert.equal((await Issue.findOne(data.otherIssue.id)).title, 'Other issue');
});

test('rejects a foreign project, reporter, and assignee when creating an issue', async () => {
  await auth('post', '/issues')
    .send(issueInput({ projectId: data.otherProject.id }))
    .expect(404);
  await auth('post', '/issues')
    .send(issueInput({ reporterId: data.otherUser.id }))
    .expect(400);
  await auth('post', '/issues')
    .send(issueInput({ userIds: [data.otherUser.id] }))
    .expect(400);
  assert.equal(await Issue.count(), 2);
});

test('rejects foreign users and immutable fields when updating an issue', async () => {
  await auth('put', `/issues/${data.issue.id}`)
    .send({ reporterId: data.otherUser.id })
    .expect(400);
  await auth('put', `/issues/${data.issue.id}`)
    .send({ userIds: [data.otherUser.id] })
    .expect(400);
  await auth('put', `/issues/${data.issue.id}`)
    .send({ projectId: data.otherProject.id })
    .expect(400);
  assert.equal((await Issue.findOne(data.issue.id)).projectId, data.project.id);
});

test('hides foreign comments and rejects forged comment identity', async () => {
  await auth('put', `/comments/${data.otherComment.id}`)
    .send({ body: 'Changed' })
    .expect(404);
  await auth('delete', `/comments/${data.otherComment.id}`).expect(404);
  await auth('post', '/comments')
    .send({ body: 'New', issueId: data.otherIssue.id })
    .expect(404);
  await auth('post', '/comments')
    .send({
      body: 'New',
      issueId: data.issue.id,
      userId: data.otherUser.id,
    })
    .expect(400);
  assert.equal((await Comment.findOne(data.otherComment.id)).body, 'Other comment');
});

test('rejects invalid issue, comment, and project fields without saving', async () => {
  await auth('post', '/issues')
    .send(issueInput({ title: '' }))
    .expect(400);
  await auth('post', '/issues')
    .send(issueInput({ priority: 'unknown' }))
    .expect(400);
  await auth('post', '/issues')
    .send(issueInput({ status: 'unknown' }))
    .expect(400);
  await auth('put', `/issues/${data.issue.id}`)
    .send({ title: 'x'.repeat(201) })
    .expect(400);
  await auth('post', '/comments')
    .send({ body: '', issueId: data.issue.id })
    .expect(400);
  await auth('put', '/project')
    .send({ users: [data.otherUser] })
    .expect(400);
  assert.equal(await Issue.count(), 2);
  assert.equal((await Issue.findOne(data.issue.id)).title, 'Own issue');
});

test('creates at the top of the list and searches stripped description text', async () => {
  const response = await auth('post', '/issues')
    .send(
      issueInput({
        title: 'Searchable',
        description: '<p>Hidden <b>phrase</b></p>',
      }),
    )
    .expect(200);
  assert.equal(response.body.issue.listPosition, 0);
  const issue = await Issue.findOne(response.body.issue.id);
  assert.equal(issue.descriptionText, 'Hidden phrase');
  const search = await auth('get', '/issues?searchTerm=PHRASE').expect(200);
  assert.deepEqual(
    search.body.issues.map(item => item.id),
    [issue.id],
  );
});

test('deletes issue comments together with their issue', async () => {
  await auth('delete', `/issues/${data.issue.id}`).expect(200);
  assert.equal(await Comment.count({ issueId: data.issue.id }), 0);
});

test('allows valid same-project changes and takes comment author from the token', async () => {
  await auth('put', `/issues/${data.issue.id}`)
    .send({ title: 'Updated' })
    .expect(200);
  await auth('put', `/comments/${data.comment.id}`)
    .send({ body: 'Updated' })
    .expect(200);
  const response = await auth('post', '/comments')
    .send({ body: 'Created', issueId: data.issue.id })
    .expect(200);
  assert.equal(response.body.comment.userId, data.user.id);
  assert.equal((await Issue.findOne(data.issue.id)).title, 'Updated');
});
