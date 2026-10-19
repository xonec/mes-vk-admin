// 云函数测试用内存数据库：支持本项目实际使用的筛选、分页、原子更新与固定主键。
const clone = value => JSON.parse(JSON.stringify(value))

function createMemoryDb() {
    const store = new Map()
    // gte/lte 额外支持链式 .and()（uniCloud 真实语义：同字段区间），其余命令保持简单对象。
    const bound = (op, value) => ({
        op, value,
        and(other) { return { op: 'range', min: op === 'gte' ? value : other.value, max: op === 'gte' ? other.value : value } }
    })
    const command = { gte: value => bound('gte', value), lte: value => bound('lte', value) }
    for (const op of ['lt', 'neq', 'exists', 'inc']) command[op] = value => ({ op, value })
    command.aggregate = { sum: value => ({ $sum: value }) }
    command.in = value => ({ op: 'in', value })
    command.nin = value => ({ op: 'nin', value })
    command.or = (...items) => ({ op: 'or', value: items.flat() })
    command.and = (...items) => ({ op: 'and', value: items.flat() })
    const ensure = name => {
        if (!store.has(name)) store.set(name, new Map())
        return store.get(name)
    }
    /** 支持 a.b.c 形式的嵌套字段读取（真实 uniCloud 支持点路径查询）。 */
    const readPath = (doc, key) => (key.indexOf('.') < 0 ? doc[key] : key.split('.').reduce((value, part) => (value == null ? undefined : value[part]), doc))
    const match = (doc, where) => {
        if (!where) return true
        if (where.op === 'or') return where.value.some(item => match(doc, item))
        if (where.op === 'and') return where.value.every(item => match(doc, item))
        return Object.entries(where).every(([key, value]) => {
            if (value instanceof RegExp) return value.test(String(readPath(doc, key) || ''))
            if (value && value.op === 'lt') return readPath(doc, key) < value.value
            if (value && value.op === 'lte') return readPath(doc, key) <= value.value
            if (value && value.op === 'gte') return readPath(doc, key) >= value.value
            if (value && value.op === 'neq') return readPath(doc, key) !== value.value
            if (value && value.op === 'exists') return (readPath(doc, key) !== undefined) === value.value
            if (value && value.op === 'range') return readPath(doc, key) >= value.min && readPath(doc, key) <= value.max
            if (value && value.op === 'in') { const target = readPath(doc, key); const list = value.value || []; return Array.isArray(target) ? target.some(item => list.includes(item)) : list.includes(target) }
            if (value && value.op === 'nin') { const target = readPath(doc, key); const list = value.value || []; return Array.isArray(target) ? !target.some(item => list.includes(item)) : !list.includes(target) }
            return readPath(doc, key) === value
        })
    }
    const apply = (old, data) => Object.assign({}, old, Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
        value && value.op === 'inc' ? (Number(old[key]) || 0) + value.value : clone(value)
    ])))
    const db = {
        command,
        RegExp: ({ regexp, options }) => new RegExp(regexp, options),
        store, ensure,
        failWrite: null,
        collection(name) {
            const query = where => {
                let limit = Infinity, skip = 0, order = [], fields = null
                const all = () => [...ensure(name).values()].filter(doc => match(doc, where))
                const q = {
                    where: value => query(value),
                    limit(value) { limit = value; return q },
                    skip(value) { skip = value; return q },
                    orderBy(key, direction) { order.push([key, direction]); return q },
                    field(value) { fields = value; return q },
                    async count() { return { total: all().length } },
                    async get() {
                        const rows = all().sort((a, b) => {
                            for (const [key, direction] of order) {
                                const cmp = a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0
                                if (cmp) return direction === 'desc' ? -cmp : cmp
                            }
                            return 0
                        }).slice(skip, skip + limit).map(clone)
                        return { data: fields ? rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key === '_id' || fields[key]))) : rows }
                    },
                    async update(data) {
                        if (db.failWrite === name) throw new Error('write failed')
                        let updated = 0
                        for (const [id, old] of ensure(name)) {
                            if (match(old, where)) { ensure(name).set(id, apply(old, data)); updated++ }
                        }
                        return { updated }
                    },
                    async add(data) {
                        if (db.failWrite === name) throw new Error('write failed')
                        const id = data._id
                        if (ensure(name).has(id)) throw new Error('duplicate key')
                        ensure(name).set(id, clone(data))
                        return { id }
                    },
                    doc(id) {
                        return {
                            field(value) { return query({ _id: id }).field(value) },
                            async get() { const doc = ensure(name).get(id); return { data: doc ? [clone(doc)] : [] } },
                            async set(data) {
                                if (db.failWrite === name) throw new Error('write failed')
                                ensure(name).set(id, { ...clone(data), _id: id }); return { updated: 1 }
                            },
                            update: data => query({ _id: id }).update(data)
                        }
                    }
                }
                return q
            }
            const aggregate = () => {
                const chain = {
                    _match: {},
                    _group: null,
                    match(condition) { chain._match = condition; return chain },
                    group(spec) { chain._group = spec; return chain },
                    async end() {
                        const rows = [...ensure(name).values()].filter(doc => match(doc, chain._match))
                        const groups = new Map()
                        for (const row of rows) {
                            const idSpec = (chain._group && chain._group._id) || {}
                            const key = Object.fromEntries(Object.entries(idSpec).map(([field, value]) => [field, String(value).startsWith('$') ? row[String(value).slice(1)] : value]))
                            const signature = JSON.stringify(key, Object.keys(key).sort())
                            const current = groups.get(signature) || { _id: key, count: 0 }
                            const countSpec = chain._group && chain._group.count
                            const amount = countSpec && countSpec.$sum !== undefined ? countSpec.$sum : 1
                            current.count += Number(amount) || 1
                            groups.set(signature, current)
                        }
                        return { data: [...groups.values()] }
                    }
                }
                return chain
            }
            const result = query(null)
            result.aggregate = aggregate
            return result
        }
    }
    return db
}
module.exports = { createMemoryDb }
