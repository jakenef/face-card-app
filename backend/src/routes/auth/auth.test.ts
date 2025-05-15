import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

import { authCallback } from "./auth.ts";
import { stub } from '@std/testing/mock';
import { userService } from '../../services/user/user.ts';
import { generateDummyUserData } from '../../dummy-data/helpers/dummy-user.ts';
import { ByuAccount } from '@fhss-web-team/backend-utils/apis';
import { byuAccountService } from '@fhss-web-team/backend-utils/services';
import { Requester } from '@fhss-web-team/backend-utils/endpoint';

describe("Auth Route", () => {
  const user = generateDummyUserData()
  const acct: ByuAccount = {
    type: user.accountType,
    netId: user.netId,
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    lastName: user.lastName,
    suffix: user.suffix ?? '',
    preferredFirstName: user.preferredFirstName,
    preferredLastName: user.preferredLastName
  }
  const requester: Requester = {
    username: user.netId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.netId,
    roles: [],
  }

  it("provisions a user", async () => {
    using _getUser = stub(userService, 'getUser', () => {
      return Promise.resolve(null)
    })
    using _byu = stub(byuAccountService, 'getAccountsByNetId', () => {
      return Promise.resolve([acct])
    })
    using _provUser = stub(userService, 'provisionUser', () => {
      return Promise.resolve(user)
    })

    const res = await authCallback.handler({
      params: {},
      query: null,
      body: null,
      requester
    })

    expect(res).toEqual({ body: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }})
  });

  it("finds an existing user", async () => {
    using _getUser = stub(userService, 'getUser', () => {
      return Promise.resolve(user)
    })
    using provUser = stub(userService, 'provisionUser')

    const res = await authCallback.handler({
      params: {},
      query: null,
      body: null,
      requester
    })

    expect(res).toEqual({ body: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }})
    expect(provUser.calls).toHaveLength(0)
  });

  it("returns 400 on no requester", async () => {
    using getUser = stub(userService, 'getUser', () => {
      return Promise.resolve(null)
    })
    using provUser = stub(userService, 'provisionUser', () => {
      return Promise.resolve(user)
    })

    const res = await authCallback.handler({
      params: {},
      query: null,
      body: null,
      requester: null
    })

    expect(res.status).toEqual(400)
    expect(getUser.calls).toHaveLength(0)
    expect(provUser.calls).toHaveLength(0)
  });
  
  it("catches errors", async () => {
    using _getUser = stub(userService, 'getUser', () => {
      return Promise.resolve(null)
    })
    
    using _byu = stub(byuAccountService, 'getAccountsByNetId', () => {
      return Promise.resolve([acct])
    })
    using _provUser = stub(userService, 'provisionUser', () => {
      throw new Error('uh oh')
    })

    const res = await authCallback.handler({
      params: {},
      query: null,
      body: null,
      requester
    })

    expect(res.status).toEqual(500)
  });
})