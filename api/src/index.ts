import 'module-alias/register';
import 'dotenv/config';
import 'reflect-metadata';

import createDatabaseConnection from 'database/createConnection';
import createApp from './app';

const establishDatabaseConnection = async (): Promise<void> => {
  try {
    await createDatabaseConnection();
  } catch (error) {
    console.log(error);
  }
};

const initializeApp = async (): Promise<void> => {
  await establishDatabaseConnection();
  createApp().listen(process.env.PORT || 3000);
};

initializeApp();
