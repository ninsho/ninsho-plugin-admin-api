import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E409, E500, IApiResult } from 'ninsho-base'
import { getNowUnixTime } from 'ninsho-utils'

import { AdminAPIConfig, LendOfHere } from './plugin-admin-api'

type DeleteSessionsResponse = {
  "successID": number[],
  "failure": {
    id: number,
    message: string,
    detail: any
  }[]
}

export class DeleteSessions {

  // - boiler plate -
  lend = {} as LendOfHere
  config = {} as AdminAPIConfig
  static init(lend: LendOfHere, config: AdminAPIConfig) {
    const instance = new this()
    instance.lend = lend
    instance.config = config
    return instance.method
  }

  private async method(
    sessionToken: string,
    ip: string,
    sessionDevice: string,
    userIdList: number[],
    options?: {
      permissionRole?: number
    }
  ): Promise<IApiResult<DeleteSessionsResponse, void, E500 | E400 | E401 | E403 | E409>> {

    const lend = this.lend
    const req = {
      sessionToken,
      ip,
      sessionDevice,
      userIdList,
      options: {
        permissionRole: options?.permissionRole ?? MRole.SuperAdministrator
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
    if (session.fail()) return session.pushReplyCode(2008)
    if (session.response.m_role < req.options.permissionRole) return new E403(2002)
    if (session.response.m_status != MStatus.ACTIVE) return new E403(2009)

    const result: DeleteSessionsResponse = {
      successID: [],
      failure: []
    }

    const connection = await lend.modules.pool.beginWithClient()

    for (const userId of req.userIdList) {
      
      await lend.modules.pool.delete<SessionInsert>(
        {
          members_id: userId
        },
        lend.options.tableName.sessions,
        connection
      ).then(
        del => {
          /* istanbul ignore if */
          if (del.fail()) {
            result.failure.push({
              id: userId,
              message: del.message,
              detail: del.stack
            })
          } else {
            result.successID.push(userId)
          }
        }
      )
    }

    await lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      200,
      result
    )
  }
}
