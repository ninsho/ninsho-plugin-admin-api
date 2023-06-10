import { MemberInsert, SessionInsert } from 'ninsho-base'
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

describe('admin-delete-users', () => {

  it('SCS: Positive case', async () => {
    const userOrder = 3
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(userOrder)

    const ignoreDeleteSession = userIdList.shift()
    // test
    const res1 = await plugin.deleteUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      userIdList
    )
    if (res1.fail()) throw 1
    expect(res1.statusCode).toEqual(200)
    const ignoreConfirm = await pool.select<SessionInsert>('sessions', ['members_id'], { m_role: 0 })
    if (ignoreConfirm.fail()) throw 2
    expect(ignoreConfirm.response.rows[0].members_id).toEqual(ignoreDeleteSession)
    expect(ignoreConfirm.response.rowCount).toEqual(1)
  })

  it('403: role', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(1)
    // test
    const res1 = await plugin.deleteUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      userIdList,
      {
        permissionRole: 20000
      }
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })

  it('403: status', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(1)
    // brake
    await pool.updateOneOrThrow<MemberInsert>({ m_status: 0 }, { m_name: admin.name }, 'AND', 'members')
    // test
    const res1 = await plugin.deleteUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      userIdList
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })


  it('200: deleteOrThrow', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // brake
    await pool.delete<MemberInsert>({ id: userIdList[0] }, 'members')
    test
    const res1 = await plugin.deleteUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      userIdList
    )
    if (res1.fail()) throw 1
    expect(res1.statusCode).toEqual(200)
    expect(res1.body.failure[0].id).toEqual(userIdList[0])
  })

})
