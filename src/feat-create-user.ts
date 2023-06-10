import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E404, E409, E500, IApiResult } from 'ninsho-base'
import { getNowUnixTime } from 'ninsho-utils'

import { AdminAPIConfig, LendOfHere } from './plugin-admin-api'

export class CreateUser {

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
    user: {
      name: string,
      mail: string,
      pass: string,
      ip: string,
      role: number,
      status: number,
      custom: MCustom
    },
    options?: {
      permissionRole?: number,
      // userAgent?: string,
      // unconfirmedDataExpiryThresholdSec?: number
    }
  ): Promise<IApiResult<{
    createdUserId: number
  }, void, E500 | E400 | E401 | E403 | E404 | E409>> {

    const lend = this.lend
    const req = {
      sessionToken,
      ip,
      sessionDevice,
      user,
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
    if (session.fail()) return session.pushReplyCode(9004)
    if (session.response.m_role < req.options.permissionRole) return new E403(9005)
    if (session.response.m_status != MStatus.ACTIVE) return new E403(9006)

    const connection = await lend.modules.pool.beginWithClient()

    const ins = await lend.modules.pool.insertOne<MemberInsert>({
      m_name: req.user.name,
      m_pass: lend.modules.secure.toHashForPassword(req.user.pass),
      m_mail: req.user.mail,
      m_custom: req.user.custom,
      m_role: req.user.role,
      m_ip: req.ip,
      m_status: req.user.status
    }, lend.options.tableName.members, connection)
    /* istanbul ignore if */
    if (ins.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      ins.body.message = ins.message
      return ins.pushReplyCode(9007)
    }

    await lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      200,
      {
        createdUserId: ins.response.rows[0].id
      }
    )
  }
}
