import { MemberInsert } from 'ninsho-base'
import { insertOrderUsers, initializeLocalPlugin } from './x-service'

const { pool, plugin } = initializeLocalPlugin()

const admin = {
  name: 'admin',
  mail: 'admin@localhost_com',
  pass: 'admin1234',
  ip: '127.0.0.1',
  sessionDevice: 'admin-client',
  custom: {
    view_name: 'im admin',
    tel: '000-0000-9999'
  }
}

const user = {
  name: 'test_user',
  mail: 'test@localhost_com',
  newEmail: 'new@localhost_com',
  pass: 'test1234',
  ip: '127.0.0.1',
  role: 0,
  status: 1,
  sessionDevice: 'test-client',
  custom: {
    view_name: 'is user',
    tel: '000-0000-1111'
  }
}

type MCustomT = Partial<{
  view_name: string,
  tel: string
}>

const createAdminWithOrderUsers = async (userOrderNum: number) => {
  const resAdmin = await plugin.adminActivate(
    admin.name,
    admin.mail,
    admin.pass,
    admin.ip,
    admin.sessionDevice,
    admin.custom
  )
  if (resAdmin.fail()) throw 100

  const userIdList = await insertOrderUsers(
    pool,
    plugin as any,
    resAdmin.body.session_token,
    admin.ip,
    admin.sessionDevice,
    userOrderNum
  )

  return { resAdmin, userIdList }
}

describe('admin-select-users', () => {

  it('200: condition name', async () => {
    const { resAdmin } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        name: { type: 'eq', 'values': ['user_0'] }
      },
      {
        columnToRetrieve: '*'
      }
    )
    if (res1.fail()) throw 1
    expect(res1.system.totalCount).toEqual(1)
    expect(res1.body.users[0].m_name).toEqual('user_0')
  })

  it('200: condition mail', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        mail: { type: 'like', 'values': ['user#_0%'] }
      },
      {
        escapeString: '#'
      }
    )
    if (res1.fail()) throw 1
    expect(res1.system.totalCount).toEqual(1)
    expect(res1.body.users[0].m_name).toEqual('user_0')
  })

  it('200: condition ip', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        ip: { type: 'like', 'values': ['127.0.0.%'] },
        role: { low: 0 }
      }
    )
    if (res1.fail()) throw 1
    expect(res1.system.totalCount).toEqual(3)
    expect(res1.body.users.length).toEqual(3)
  })
  
  it('200: condition no where', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {

      }
    )
    if (res1.fail()) throw 1
    expect(res1.body.users.length).toEqual(4)
  })

  it('200: condition no where', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {

      }
    )
    if (res1.fail()) throw 1
    expect(res1.system.totalCount).toEqual(4)
    expect(res1.body.users.length).toEqual(4)
  })

  it('200: condition status', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(5)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        status: { low: 0, high: 1 }
      },
      {
        limit: 1,
        order: { column: 'm_name', sortOrder: 'DESC' }
      }
    )
    if (res1.fail()) throw 1
    expect(res1.body.users[0].m_name).toEqual('user_4')
    expect(res1.system.totalCount).toEqual(6)
    expect(res1.statusCode).toEqual(200)
  })

  it('200: condition offset', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(5)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        status: { low: 0, high: 1 }
      },
      {
        limit: 1,
        offset: 1,
        order: { column: 'm_name', sortOrder: 'DESC' }
      }
    )
    if (res1.fail()) throw 1
    expect(res1.body.users[0].m_name).toEqual('user_3')
    expect(res1.system.totalCount).toEqual(6)
    expect(res1.statusCode).toEqual(200)
  })

  it('200: no response', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(5)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        status: { low: 100 }
      }
    )
    if (res1.fail()) throw 1
    expect(res1.body.users.length).toEqual(0)
    expect(res1.system.totalCount).toEqual(0)
    expect(res1.statusCode).toEqual(200)
  })

  it('200: queryOptions status', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(5)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        status: { low: 0 }
      }
    )
    if (res1.fail()) throw 1
    expect(res1.body.users.length).toEqual(5)
  })

  it('403: role', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(5)
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        status: { low: 0 }
      },
      {

      },
      {
        permissionRole: 20000
      }
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })

  it('403: status', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(5)
    // break
    await pool.updateOneOrThrow<MemberInsert>({ m_status: 0 }, { m_name: admin.name }, 'AND', 'members')
    // test
    const res1 = await plugin.selectUser(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        status: { low: 0 }
      }
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })

})
