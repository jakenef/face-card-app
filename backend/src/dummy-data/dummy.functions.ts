import { createUsers } from "./functions/create-users.ts";
import { deleteUsers } from "./functions/delete-users.ts";
import { DummyFunction } from '@fhss-web-team/backend-utils/dummy';

// deno-lint-ignore no-explicit-any
export const dummyFunctions: DummyFunction<any>[] = [
	deleteUsers,
	createUsers,
];