import Database, { QueryResult } from '@tauri-apps/plugin-sql';

let appDb: Database | null = null;

const db = async () => {
  if (!appDb) {
    appDb = await Database.load('sqlite:settings.db');
  }

  return appDb;
};

const AppDb = {
  select: async <T>(query: string, bindValues?: unknown[]): Promise<T> => {
    return (await db()).select(query, bindValues);
  },
  execute: async (
    query: string,
    bindValues?: unknown[]
  ): Promise<QueryResult> => {
    return (await db()).execute(query, bindValues);
  },
};

export default AppDb;
