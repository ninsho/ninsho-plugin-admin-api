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

describe('admin-activate', () => {

  it('SCS: Positive case', async () => {
    const res = await plugin.adminActivate(
      admin.name,
      admin.mail,
      admin.pass,
      admin.ip,
      admin.sessionDevice,
      admin.custom
    )
    if (res.fail()) throw 1
    expect(res.statusCode).toEqual(201)
  })

  it('SCS: 400', async () => {

    const connection = await pool.beginWithClient()
    await pool.insertOne<MemberInsert>({
      m_name: 'user',
      m_mail: 'user@localhost',
      m_pass: '...',
      m_role: 1,
      m_status: 1,
      m_custom: {}
    }, 'members', connection)
    await pool.commitWithRelease(connection)

    const res = await plugin.adminActivate(
      admin.name,
      admin.mail,
      admin.pass,
      admin.ip,
      admin.sessionDevice,
      admin.custom
    )
    if (!!!res.fail()) throw 1
    expect(res.statusCode).toEqual(400)
  })

})
