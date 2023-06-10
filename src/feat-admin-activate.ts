import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E409, E500, IApiResult } from 'ninsho-base'

import { AdminAPIConfig, LendOfHere } from './plugin-admin-api'


export class AdminActivate {

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
    name: string,
    mail: string,
    pass: string,
    ip: string,
    sessionDevice: string,
    m_custom: MCustom
  ): Promise<IApiResult<{
    session_token: string
  }, void, E500 | E400 | E409>> {

    const lend = this.lend
    const req = {
      name,
      mail,
      pass,
      ip,
      sessionDevice,
      m_custom
    }

    const connection = await lend.modules.pool.beginWithClient()

    const sel = await lend.modules.pool.select<MemberInsert>(
      lend.options.tableName.members, [ 'm_name' ], { }, connection
    )
    /* istanbul ignore if */
    if (sel.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      return sel.pushReplyCode(9000) 
    }

    if (sel.response.rowCount) {
      await lend.modules.pool.rollbackWithRelease(connection)
      return new E400(9001, 'Administrator registration is not possible if there is other data.')
    }
  
    const ins = await lend.modules.pool.insertOne<MemberInsert>({
      m_name: req.name,
      m_pass: lend.modules.secure.toHashForPassword(req.pass),
      m_mail: req.mail,
      m_custom: req.m_custom,
      m_role: MRole.SuperAdministrator,
      m_ip: req.ip,
      otp_hash: null,
      m_status: MStatus.ACTIVE
    }, lend.options.tableName.members, connection)
    /* istanbul ignore if */
    if (ins.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      ins.body.message = ins.message
      return ins.pushReplyCode(9002)
    }
  
    const { sessionToken, hashToken }
      = lend.modules.secure.createSessionTokenWithHash()
    const insSession = await lend.modules.pool.insertOne<SessionInsert>({
      members_id: ins.response.rows[0].id,
      m_name: req.name,
      m_ip: req.ip,
      m_device: req.sessionDevice,
      created_time: Math.floor(new Date().getTime() / 1000),
      token: hashToken,
      m_role: MRole.SuperAdministrator,
    }, 'sessions', connection)
    /* istanbul ignore if */
    if (insSession.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      return insSession.pushReplyCode(9003)
    }  

    await lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      201,
      {
        session_token: sessionToken
      }
    )
  }
}
