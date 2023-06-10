import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E409, E500, IApiResult } from 'ninsho-base'
import { getNowUnixTime } from 'ninsho-utils'

import { AdminAPIConfig, LendOfHere } from './plugin-admin-api'

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

type DeepPartial<T> = { [K in keyof T]?: T[K] extends Record<string, unknown>
  ? DeepPartial<T[K]>
  : T[K] }

type UpdateResponse = {
  "successID": number[],
  "failure": {
    id: number,
    message: string,
    detail: any
  }[]
}

export class UpdateUsers {

  // - boiler plate -
  lend = {} as LendOfHere
  config = {} as AdminAPIConfig
  static init(lend: LendOfHere, config: AdminAPIConfig) {
    const instance = new this()
    instance.lend = lend
    instance.config = config
    return instance.method
  }

  private async method<MCustom>(
    sessionToken: string,
    ip: string,
    sessionDevice: string,
    userRows: (Partial<MemberInsert> & Required<Pick<MemberInsert, 'id' | 'version'>>)[],
    options?: {
      permissionRole?: number,
      ignoreVersionMatching?: boolean
    }
  ): Promise<IApiResult<UpdateResponse, void, E500 | E400 | E401 | E403 | E409>> {

    const lend = this.lend
    const req = {
      sessionToken,
      ip,
      sessionDevice,
      userRows,
      options: {
        permissionRole: options?.permissionRole ?? MRole.SuperAdministrator,
        ignoreVersionMatching: options?.ignoreVersionMatching === true ? true : false
      }
    }
    const session = await lend.modules.pool.retrieveMemberIfSessionPresentOne<MemberInsert & SessionInsert>(
      lend.modules.secure.toHashForSessionToken(req.sessionToken),
      getNowUnixTime() - lend.options.sessionExpirationSec,
      req.sessionDevice,
      req.ip,
      [
        'members.m_status',
        'members.m_role'
      ]
    )
    /* istanbul ignore if */
    if (session.fail()) return session.pushReplyCode(9081)
    if (session.response.m_role < req.options.permissionRole) return new E403(9019)
    if (session.response.m_status != MStatus.ACTIVE) return new E403(9020)

    const result: UpdateResponse = {
      successID: [],
      failure: []
    }

    const connection = await lend.modules.pool.beginWithClient()

    for (const user of userRows) {
      if (user.id === undefined || user.version === undefined) {
        lend.modules.pool.rollbackWithRelease(connection)
        return new E400(9021, 'The user information must include an ID and a version obtained from the database.')
      }

      const updateObj: Partial<MemberInsert> = {} as MemberInsert
      const values: any[] = []
      Object.keys(user).map(key => {
        if (!key.match(/^m_/)) {
          return null
        }
        values.push(user[key as keyof MemberInsert])
        updateObj[key as keyof MemberInsert] = user[key as keyof MemberInsert]
        return key
      }).filter(f => f)

      await lend.modules.pool.updateOneOrThrow(
        updateObj,
        {
          ...{
            id: user.id
          },
          ...req.options.ignoreVersionMatching ? {} : {
            version: user.version
          }
        },
        "AND",
        lend.options.tableName.members,
        connection
      ).then(
        upd => {
          if (upd.fail()) {
            result.failure.push({
              id: user.id,
              message: upd.message,
              detail: upd.stack
            })
          } else {
            result.successID.push(user.id)
          }
        }
      )
    }

    lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      200,
      result
    )
  }
}
