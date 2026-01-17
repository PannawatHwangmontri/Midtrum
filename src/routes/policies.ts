import { Hono } from 'hono'
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'
import db from '../db/index.js'

const policyRoutes = new Hono()

type Policy = {
    PolicyID: number
    Coverage: string
    Premium: number
    StartDate: string
    EndDate: string
}

policyRoutes.get('/', (c) => {
    let sql = 'SELECT * FROM Policy'
    let stmt = db.prepare<[], Policy>(sql)
    let policies: Policy[] = stmt.all()

    return c.json({ message: 'List of policies', data: policies })
})

policyRoutes.get('/:id', (c) => {
    const { id } = c.req.param()
    let sql = 'SELECT * FROM Policy WHERE PolicyID = @id'
    let stmt = db.prepare<{ id: string }, Policy>(sql)
    let policy = stmt.get({ id: id })

    if (!policy) {
        return c.json({ message: `Policy not found` }, 404)
    }
    return c.json({
        message: `Policy details for ID : ${id}`,
        data: policy
    })
})

const createPolicySchema = z.object({
    Coverage: z.string("กรุณาระบุความคุ้มครอง")
        .min(5, "ความคุ้มครองต้องมีความยาวอย่างน้อย 5 ตัวอักษร"),
    Premium: z.number("กรุณาระบุเบี้ยประกัน" )
        .positive("เบี้ยประกันต้องมากกว่า 0"),
    StartDate: z.string("ระบุวันเริ่มต้น (YYYY-MM-DD)")
        .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
    EndDate: z.string("ระบุวันสิ้นสุด (YYYY-MM-DD)" )
        .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)")
})

policyRoutes.post('/',
    zValidator('json', createPolicySchema, (result, c) => {
        if (!result.success) {
            return c.json({
                message: 'Validation Failed',
                error: result.error.issues
            }, 400)
        }
    }),
    async (c) => {
        const body = await c.req.json<Omit<Policy, 'PolicyID'>>()

        let sql = `INSERT INTO Policy
        (Coverage, Premium, StartDate, EndDate)
        VALUES(@Coverage, @Premium, @StartDate, @EndDate);
    `
        let stmt = db.prepare<Omit<Policy, 'PolicyID'>, Policy>(sql)

        try {
            let result = stmt.run(body)

            if (result.changes === 0) {
                return c.json({ message: 'Policy not created' }, 500)
            }
            let lastRowid = result.lastInsertRowid as number

            let sql2 = `SELECT * FROM Policy WHERE PolicyID = ?`
            let stmt2 = db.prepare<[number], Policy>(sql2)
            let newPolicy = stmt2.get(lastRowid)
            return c.json({ message: 'Policy created', data: newPolicy }, 201)
        } catch (error) {
            return c.json({ message: 'Database Error', error: String(error) }, 500)
        }
    })

const updatePolicySchema = z.object({
    Coverage: z.string().min(5).optional(),
    Premium: z.number().positive().optional(),
    StartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    EndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

policyRoutes.put('/:id',
    zValidator('json', updatePolicySchema), async (c) => {
        const { id } = c.req.param()
        const body = await c.req.json()

        const existing = db.prepare('SELECT * FROM Policy WHERE PolicyID = ?').get(id) as Policy
        if (!existing) return c.json({ message: 'Policy not found' }, 404)

        const updatedPolicy = {
            ...existing,
            ...body
        }

        const sql = `
            UPDATE Policy SET
                Coverage = @Coverage,
                Premium = @Premium,
                StartDate = @StartDate,
                EndDate = @EndDate
            WHERE PolicyID = @PolicyID
        `
        
        try {
            const stmt = db.prepare(sql)
            stmt.run(updatedPolicy)

            return c.json({ message: 'Policy updated', data: updatedPolicy })
        } catch (error) {
            return c.json({ message: 'Database Error', error: String(error) }, 500)
        }
    }
)

policyRoutes.delete('/:id', (c) => {
    const { id } = c.req.param()

    const stmt = db.prepare('DELETE FROM Policy WHERE PolicyID = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
        return c.json({ message: 'Policy not found' }, 404)
    }

    return c.json({ message: 'Policy deleted', id })
})

export default policyRoutes