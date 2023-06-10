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

describe('admin-update-users', () => {

  it('200: non userRow', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [],
    )
    if (res1.fail()) throw 1
    expect(res1.statusCode).toEqual(200)
  })

  it('400: no version', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        id: userIdList[0],
        m_role: 1
      } as any],
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(400)
  })

  it('400: no id', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        version: 0,
        m_role: 1
      } as any],
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(400)
  })

  it('200: normal', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        id: userIdList[0],
        version: 0,
        m_role: 1
      }],
    )
    if (res1.fail()) throw 1
    expect(res1.statusCode).toEqual(200)
    const res2 = await pool.selectOne<MemberInsert>('members', ['m_role'], { id: userIdList[0] })
    if (res2.fail()) throw 2
    expect(res2.response?.m_role).toEqual(1)
  })

  it('200: unknown id', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        id: 9999,
        version: 0,
        m_role: 1
      }],
    )
    if (res1.fail()) throw 1
    expect(res1.body.failure[0].id).toEqual(9999)
  })

  it('403: role', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        id: 1,
        version: 0,
        m_role: 1
      }],
      {
        permissionRole: 20000
      }
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })

  it('403: status', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // break
    await pool.updateOneOrThrow<MemberInsert>({ m_status: 0 }, { m_name: admin.name }, 'AND', 'members')
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        id: 9999,
        version: 0,
        m_role: 1
      }],
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })

  it('200: ignoreVersionMatching', async () => {
    const { resAdmin, userIdList } = await createAdminWithOrderUsers(3)
    // test
    const res1 = await plugin.updateUsers(
      resAdmin.body.session_token,
      admin.ip,
      admin.sessionDevice,
      [{
        id: userIdList[0],
        version: 7777,
        m_role: 1
      }],
      {
        ignoreVersionMatching: true
      }
    )
    if (res1.fail()) throw 1
    expect(res1.statusCode).toEqual(200)
    const res2 = await pool.selectOne<MemberInsert>('members', ['m_role'], { id: userIdList[0] })
    if (res2.fail()) throw 2
    expect(res2.response?.m_role).toEqual(1)
  })


})
