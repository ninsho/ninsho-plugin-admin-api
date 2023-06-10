import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E409, E500, IApiResult } from 'ninsho-base'
import { calibrationOfColumnsForMembers, getNowUnixTime } from 'ninsho-utils'

import { AdminAPIConfig, LendOfHere } from './plugin-admin-api'

export class SelectUser {

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
    conditions: {
      name?: { type: 'like' | 'eq', values: string[] },
      mail?: { type: 'like' | 'eq', values: string[] },
      ip?: { type: 'like' | 'eq', values: string[] },
      role?: { low: number, high?: number },
      status?: { low: number, high?: number },
    },
    queryOptions?: {
      escapeString?: string,
      offset?: number
      limit?: number,
      columnToRetrieve?: (keyof MemberInsert)[] | '*'
      order?: { column: keyof MemberInsert, sortOrder: 'DESC' | 'ASC' }
    },
    options?: {
      permissionRole?: number,
    }
  ): Promise<IApiResult<
    { 
      users: MemberInsert<MCustom>[]
    },
    {
      query: string,
      values: (string | number)[],
      totalCount: number
    }, E500 | E400 | E401 | E403 | E409>> {

    const lend = this.lend
    const req = {
      sessionToken,
      ip,
      sessionDevice,
      conditions: {
        name: conditions.name,
        mail: conditions.mail,
        ip: conditions.ip,
        role: conditions.role,
        status: conditions.status
      },
      queryOptions: {
        escapeString: queryOptions?.escapeString,
        offset: queryOptions?.offset || 0,
        limit: queryOptions?.limit ?? this.config.searchLimit,
        columnToRetrieve: calibrationOfColumnsForMembers(queryOptions?.columnToRetrieve, [
          'id',
          'm_name',
          'm_custom',
          'version'
        ]),
        order: queryOptions?.order
      },
      options: {
        permissionRole: options?.permissionRole ?? MRole.SuperAdministrator,
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
    if (session.fail()) return session.pushReplyCode(9014)
    if (session.response.m_role < req.options.permissionRole) return new E403(9015)
    if (session.response.m_status != MStatus.ACTIVE) return new E403(9016)

    const values: (string | number)[] = []
    const whereList: string[] = []

    req.conditions.name
      ? whereList.push(makeStringQuery('m_name', req.conditions.name, values, req.queryOptions.escapeString))
      : null
    req.conditions.mail
      ? whereList.push(makeStringQuery('m_mail', req.conditions.mail, values, req.queryOptions.escapeString))
      : null
    req.conditions.ip
      ? whereList.push(makeStringQuery('m_ip', req.conditions.ip, values, req.queryOptions.escapeString))
      : null
    req.conditions.role
      ? whereList.push(makeBetweenQuery('m_role', req.conditions.role, values))
      : null
    req.conditions.status
      ? whereList.push(makeBetweenQuery('m_status', req.conditions.status, values))
      : null
    const where = whereList.length
      ? `WHERE (${whereList.join(')\nAND (')}) `
      : ''
    const order = req.queryOptions.order
      ? `ORDER BY ${req.queryOptions.order.column} ${req.queryOptions.order.sortOrder}`
      : ''

    const QuerySelect = {
      text: `
        SELECT
          ${req.queryOptions.columnToRetrieve === '*' ? '*' : req.queryOptions.columnToRetrieve.join()}
        FROM
          ${this.lend.options.tableName.members}
        ${where}
        ${order}
        ${'LIMIT ' + req.queryOptions.limit}
        ${req.queryOptions.offset ? `OFFSET ${req.queryOptions.offset}` : ''}
        
      `,
      values: values
    }

    const QueryForTotalCount = {
      text: `
        SELECT
          count(id) over() as total_count
        FROM
          ${this.lend.options.tableName.members}
        ${where}
        limit 1
      `,
      values: values
    }

    const connection = await lend.modules.pool.getConnect()

    let resSelect, resCount

    try {
      resSelect = await connection.query<MemberInsert>(QuerySelect)
      resCount = await connection.query<{ total_count: string }>(QueryForTotalCount)
    } catch (e) /* istanbul ignore next */ {
      lend.modules.pool.releaseConnect(connection)
      return new E500(9017, e as any)
    }

    lend.modules.pool.releaseConnect(connection)

    return new ApiSuccess(
      200,
      { 
        users: resSelect.rows
      },
      {
        query: QuerySelect.text.replace(/\s+/g, ' '),
        values,
        totalCount: parseInt(resCount.rows[0]?.total_count as any || 0)
      }
    )
  }
}

function makeStringQuery(
  columnName: string,
  rq: { type: 'like' | 'eq', values: string[] },
  valuesRef: (string | number)[],
  escape: string | undefined
) {
  return rq.values.map(v => {
    valuesRef.push(v)
    return `${columnName} ${rq.type === 'like' ? 'ILIKE' : '='} $${valuesRef.length}
            ${rq.type === 'like' && escape ? `ESCAPE '${escape}'` : ''}`
  }).join(' OR ')
}

function makeBetweenQuery(
  columnName: string,
  rq: { low: number, high?: number },
  valuesRef: (string | number)[]
) {
  if (!rq.high || rq.low === rq.high) {
    valuesRef.push(rq.low)
    return `m_role = $${valuesRef.length}`
  } else {
    valuesRef.push(rq.low)
    valuesRef.push(rq.high)
    return `${columnName} BETWEEN $${valuesRef.length - 1} AND $${valuesRef.length}`
  }
}