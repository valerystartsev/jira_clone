<h1 align="center">A simplified Jira clone built with React and Node</h1>

<div align="center">Auto formatted with Prettier, tested with Cypress 🎗</div>

<h3 align="center">
  <a href="https://jira.ivorreic.com/">Visit the live app</a> |
  <a href="https://github.com/oldboyxx/jira_clone/tree/master/client">View client</a> |
  <a href="https://github.com/oldboyxx/jira_clone/tree/master/api">View API</a>
</h3>

![Tech logos](https://i.ibb.co/DVFj8PL/tech-icons.jpg)

![App screenshot](https://i.ibb.co/W3qVvCn/jira-optimized.jpg)

## What is this and who is it for 🤷‍♀️

I do React consulting and this is a showcase product I've built in my spare time. It's a very good example of modern, real-world React codebase.

There are many showcase/example React projects out there but most of them are way too simple. I like to think that this codebase contains enough complexity to offer valuable insights to React developers of all skill levels while still being _relatively_ easy to understand.

## Features

- Proven, scalable, and easy to understand project structure
- Written in modern React, only functional components with hooks
- A variety of custom light-weight UI components such as datepicker, modal, various form elements etc
- Simple local React state management, without redux, mobx, or similar
- Custom webpack setup, without create-react-app or similar
- Client written in Babel powered JavaScript
- API written in TypeScript and using TypeORM

## Development and tests 🛠

Use Node 24 and PostgreSQL. Run the following commands from the repository root. First install
dependencies with `npm run install-dependencies`. Create `api/.env` from `api/.env.example`, and set
the PostgreSQL username and password there. Create three databases owned by that user:

| Database | Used by |
| --- | --- |
| `jira_development` | Local development |
| `jira_api_test` | API HTTP tests |
| `jira_test` | Cypress end-to-end tests |

Keep these databases separate: the API tests reset `jira_api_test`, and Cypress changes data in
`jira_test`. Never commit `api/.env`.

Start the application with `npm run start:dev`. It starts the API on `http://localhost:3000` and the
client on `http://localhost:8080`. Leave this terminal open while using the app.

### Run tests

| Tests | Command | Servers required |
| --- | --- | --- |
| API HTTP tests (Supertest and Node test runner) | `npm run test:api` | None; requires PostgreSQL and `jira_api_test` |
| Client Jest tests | `npm run test:jest` | None; currently no Jest test files, so it reports 0 tests |
| Cypress headless browser tests | `npm run test:cypress` | Run `npm run start:cypress` first in another terminal |
| Cypress interactive browser tests | `npm run test:cypress:open` | Run `npm run start:cypress` first in another terminal; requires a desktop display |

`npm run start:cypress` starts the API against `jira_test` and the client in Cypress-compatible
development mode. Wait for both servers to be ready before running Cypress. Use a new terminal for
the test command. To run one spec, use
`npm run test:cypress -- --spec cypress/integration/issueCreate.spec.js`.
On WSL/Linux, Cypress also needs the system library `libXss.so.1`; if it is
missing, install the `libxss1` package (for Ubuntu/Debian: `sudo apt install libxss1`).

### Stop everything

Press **Ctrl+C** in the terminal running `start:dev` or `start:cypress`. The combined command stops
both API and client. If you started them in separate terminals, press **Ctrl+C** in each terminal;
also close the Cypress window if it is open. PostgreSQL is a separate system service and keeps
running. Stop it separately only if you want to shut down the database service too.

## What's missing?

There are features missing from this showcase product which should exist in a real product:

### Migrations 🗄

We're currently using TypeORM's `synchronize` feature which auto creates the database schema on every application launch. It's fine to do this in a showcase product or during early development while the product is not used by anyone, but before going live with a real product, we should [introduce migrations](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md).

### Proper authentication system 🔐

We currently auto create an auth token and seed a project with issues and users for anyone who visits the API without valid credentials. In a real product we'd want to implement a proper [email and password authentication system](https://www.google.com/search?q=email+and+password+authentication+node+js&oq=email+and+password+authentication+node+js).

### Accessibility ♿

Not all components have properly defined [aria attributes](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA), visual focus indicators etc. Most early stage companies tend to ignore this aspect of their product but in many cases they shouldn't, especially once their userbase starts growing.

### More test coverage 🧪

The API has HTTP tests in `api/test`, and browser flows have Cypress specs in
`client/cypress/integration`. Jest is configured for client unit tests, but no Jest test files have
been added yet.

## Contributing

I will not be accepting PR's on this repository. Feel free to fork and maintain your own version.

## License

[MIT](https://opensource.org/licenses/MIT)

<hr>

<h3>
  <a href="https://jira.ivorreic.com/">Visit the live app</a> |
  <a href="https://github.com/oldboyxx/jira_clone/tree/master/client">View client</a> |
  <a href="https://github.com/oldboyxx/jira_clone/tree/master/api">View API</a>
</h3>
