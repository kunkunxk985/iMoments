import { createDatabaseClient, createSiteContext, errorResponse, BackendError } from './_qoder/backend.mjs';
import { createStorageClient } from './_qoder/storage.mjs';
import { application } from './routes.mjs';
import { getUser } from './auth.mjs';

const handle = application({ db: createDatabaseClient(), storage: createStorageClient(), getUser, BackendError });

Deno.serve(async request => {
  let context;
  try { context = createSiteContext(request); return await handle(context); }
  catch (error) { return errorResponse(error, context?.requestId); }
});