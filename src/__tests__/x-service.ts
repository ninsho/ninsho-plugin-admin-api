import { defaultOptions, SessionInsert } from 'ninsho-base'
import { getNowUnixTime } from 'ninsho-utils'
import ModPg from 'ninsho-module-pg'
import ModSecure from 'ninsho-module-secure'

import * as dotenv from 'dotenv'
import util from 'util'
export const log = (...args: any[]) => {
  process.stdout.write(util.format(...args) + '\n')
}

import { AdminAPI } from '../plugin-admin-api'

jest.setTimeout(8000)

/**
 * initializeLocalPlugin
 * @returns {plugin, pool}
 */
export function initializeLocalPlugin() {

  dotenv.config()
  const env = process.env as any

  const pool = ModPg.init(
    {
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: 'postgres',
      port: 5432,
      forceRelease: true
    }
  ).setOptions(defaultOptions)

  const plugin = AdminAPI.init().setModules(
    {
      options: defaultOptions,
      pool: pool,
      secure: ModSecure.init({ secretKey: 'Abracadabra' })
    }
  )

  beforeEach(async function () {
    await pool.truncate(['members', 'sessions'])
    log(expect.getState().currentTestName)
  })

  return {
    plugin,
    env,
    pool
  }
}

export async function insertOrderUsers(
  pool: ModPg,
  plugin: AdminAPI,
  adminSessionToken: string,
  adminIp: string,
  adminSessionDevice: string,
  orderNum: number
): Promise<number[]> {

  const userIdList: number[] = []

  await Promise.all([...Array(orderNum).keys()].map(i => {
    return (async () => {
      const res = await plugin.create(
        adminSessionToken,
        adminIp,
        adminSessionDevice,
        {
          name: `user_${i}`,
          mail: `user_${i}@localhost`,
          pass: `pass_${i}`,
          ip: `127.0.0.${i}`,
          role: 0,
          status: 1,
          custom: { tel: `000-0000-000${i}` }
        }
      )
      if (res.fail()) throw `insertOrderUsers.${i}`
      userIdList.push(res.body.createdUserId)
      // create session
      const connection = await pool.beginWithClient()
      const resSession = await pool.insertOne<SessionInsert>({
        members_id: res.body.createdUserId,
        m_name: `user_${i}`,
        m_role: 0,
        m_ip: `127.0.0.${i}`,
        m_device: 'user-device',
        token: 'fake',
        created_time: getNowUnixTime() - 3600,
      },
      'sessions',
      connection
      )
      if (resSession.fail()) throw resSession.stack
      await pool.commitWithRelease(connection)
    })()
  }))

  return userIdList
}
