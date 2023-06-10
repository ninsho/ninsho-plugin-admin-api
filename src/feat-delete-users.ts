import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E409, E500, IApiResult } from 'ninsho-base'
import { getNowUnixTime } from 'ninsho-utils'

import { AdminAPIConfig, LendOfHere } from './plugin-admin-api'

type DeleteUsersResponse = {
  "successID": number[],
  "failure": {
    id: number,
    message: string,
    detail: any
  }[]
}

export class DeleteUsers {

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
  ): Promise<IApiResult<DeleteUsersResponse, void, E500 | E400 | E401 | E403 | E409>> {

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
    if (session.fail()) return session.pushReplyCode(9011)
    if (session.response.m_role < req.options.permissionRole) return new E403(9012)
    if (session.response.m_status != MStatus.ACTIVE) return new E403(9013)

    const result: DeleteUsersResponse = {
      successID: [],
      failure: []
    }

    for (const userId of req.userIdList) {

      const connection = await lend.modules.pool.beginWithClient()
      
      await lend.modules.pool.delete<SessionInsert>(
        {
          members_id: userId
        },
        lend.options.tableName.sessions,
        connection
      ).then(
        async delSessions => {
          /* istanbul ignore if */
          if (delSessions.fail()) {
            result.failure.push({
              id: userId,
              message: delSessions.message,
              detail: delSessions.stack
            })
            await lend.modules.pool.rollbackWithRelease(connection)
          } else {
            const delUser = await lend.modules.pool.deleteOrThrow<MemberInsert>(
              {
                id: userId
              },
              lend.options.tableName.members,
              connection
            )
            if (delUser.fail()) {
              result.failure.push({
                id: userId,
                message: delUser.message,
                detail: delUser.stack
              })
              await lend.modules.pool.rollbackWithRelease(connection)
            } else {
              result.successID.push(userId)
              await lend.modules.pool.commitWithRelease(connection)
            }
          }
        }
      )
    }

    return new ApiSuccess(
      200,
      result
    )
  }
}
