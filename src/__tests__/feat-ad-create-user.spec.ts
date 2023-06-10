import { MemberInsert } from 'ninsho-base'
import { initializeLocalPlugin } from './x-service'

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

const createAdmin = async () => {
  const res = await plugin.adminActivate(
    admin.name,
    admin.mail,
    admin.pass,
    admin.ip,
    admin.sessionDevice,
    admin.custom
  )
  if (res.fail()) throw 1
  return res
}

describe('admin-create', () => {

  it('SCS: Positive case', async () => {
    const res1 = await createAdmin()

    const res2 = await plugin.create(
      res1.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        name: user.name,
        mail: user.mail,
        pass: user.pass,
        ip: user.ip,
        role: user.role,
        status: user.status,
        custom: user.custom
      }
    )
    if (res2.fail()) throw 1
    expect(res2.statusCode).toEqual(200)
  })

  it('403: role', async () => {
    const res1 = await createAdmin()

    const res2 = await plugin.create(
      res1.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        name: user.name,
        mail: user.mail,
        pass: user.pass,
        ip: user.ip,
        role: user.role,
        status: user.status,
        custom: user.custom
      },
      {
        permissionRole: 20000
      }
    )
    if (!!!res2.fail()) throw 1
    expect(res2.statusCode).toEqual(403)
  })

  it('403: status', async () => {
    const res1 = await createAdmin()

    await pool.updateOneOrThrow<MemberInsert>(
      {
        m_status: 0
      },
      {
        m_name: admin.name
      },
      'AND',
      'members'
    )

    const res2 = await plugin.create(
      res1.body.session_token,
      admin.ip,
      admin.sessionDevice,
      {
        name: user.name,
        mail: user.mail,
        pass: user.pass,
        ip: user.ip,
        role: user.role,
        status: user.status,
        custom: user.custom
      }
    )
    if (!!!res2.fail()) throw 1
    expect(res2.statusCode).toEqual(403)
  })

})
