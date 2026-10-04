import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { Sequelize, DataTypes, Op, literal } from 'sequelize'

function loadEnvForMonorepo() {
  const loaded = new Set<string>()
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env.development.local'),
    path.resolve(process.cwd(), '.env.development'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env.local'),
    path.resolve(process.cwd(), '..', '.env.development.local'),
    path.resolve(process.cwd(), '..', '.env.development'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', '..', '.env.local'),
    path.resolve(process.cwd(), '..', '..', '.env.development.local'),
    path.resolve(process.cwd(), '..', '..', '.env.development'),
    path.resolve(process.cwd(), '..', '..', '.env'),
  ]

  for (const filePath of candidates) {
    if (loaded.has(filePath)) continue
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false, quiet: true })
      loaded.add(filePath)
    }
  }
}

loadEnvForMonorepo()

const connectionUrl = process.env.DATABASE_URL
if (!connectionUrl) {
  throw new Error(
    'DATABASE_URL is not set. Put it in /home/rguktrkvalley/Desktop/panel/.env.development or apps/main/.env.local'
  )
}

const parsed = new URL(connectionUrl)
const dbName = parsed.pathname.replace(/^\//, '')
const dbUser = decodeURIComponent(parsed.username || '')
const dbPassword = decodeURIComponent(parsed.password || '')
const dbHost = parsed.hostname || '127.0.0.1'
const dbPort = Number(parsed.port || 3306)

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
})

const shouldAutoSync =
  process.env.DB_AUTO_SYNC != null
    ? process.env.DB_AUTO_SYNC === 'true'
    : process.env.NODE_ENV !== 'production'

let dbReadyPromise: Promise<void> | null = null
async function ensureDbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      if (shouldAutoSync) {
        await sequelize.sync({ alter: true })
      } else {
        await sequelize.authenticate()
      }
    })()
  }
  await dbReadyPromise
}

const commonOptions = {
  freezeTableName: true,
  timestamps: false,
}

const Publisher = sequelize.define('Publisher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  passwordHash: DataTypes.STRING,
  mobile: DataTypes.STRING,
  websiteOrTelegram: DataTypes.STRING,
  trafficSource: DataTypes.STRING,
  paymentMethod: DataTypes.STRING,
  upiId: DataTypes.STRING,
  accountNumber: DataTypes.STRING,
  ifsc: DataTypes.STRING,
  accountHolderName: DataTypes.STRING,
  status: DataTypes.STRING,
  totalEarned: DataTypes.DECIMAL,
  walletBalance: DataTypes.DECIMAL,
  totalWithdrawn: DataTypes.DECIMAL,
  pendingWithdrawal: DataTypes.DECIMAL,
  telegramChatId: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, commonOptions)

const Offer = sequelize.define('Offer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING,
  slug: DataTypes.STRING,
  imageUrl: DataTypes.TEXT,
  category: DataTypes.STRING,
  payoutType: DataTypes.STRING,
  publisherPayout: DataTypes.DECIMAL,
  status: DataTypes.STRING,
  badge: DataTypes.STRING,
  affiliateUrl: DataTypes.TEXT,
  telegramLink: DataTypes.TEXT,
  description: DataTypes.TEXT,
  steps: DataTypes.TEXT,
  events: DataTypes.TEXT,
  sortOrder: DataTypes.INTEGER,
  isLimited: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, commonOptions)

const Camp = sequelize.define('Camp', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publisherId: DataTypes.INTEGER,
  offerId: DataTypes.INTEGER,
  campName: DataTypes.STRING,
  campSlug: DataTypes.STRING,
  status: DataTypes.STRING,
  selectedEventName: DataTypes.STRING,
  userGets: DataTypes.INTEGER,
  referrerGets: DataTypes.INTEGER,
  showMobileField: DataTypes.BOOLEAN,
  showReferField: DataTypes.BOOLEAN,
  steps: DataTypes.TEXT,
  totalClicks: DataTypes.INTEGER,
  totalConversions: DataTypes.INTEGER,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, commonOptions)

const CampLead = sequelize.define('CampLead', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campId: DataTypes.INTEGER,
  publisherId: DataTypes.INTEGER,
  offerId: DataTypes.INTEGER,
  clickId: DataTypes.STRING,
  p1: DataTypes.STRING,
  p2: DataTypes.STRING,
  p3: DataTypes.STRING,
  p4: DataTypes.STRING,
  p5: DataTypes.STRING,
  sub1: DataTypes.STRING,
  sub2: DataTypes.STRING,
  sub3: DataTypes.STRING,
  sub4: DataTypes.STRING,
  sub5: DataTypes.STRING,
  idfa: DataTypes.STRING,
  browser: DataTypes.STRING,
  userUpi: DataTypes.STRING,
  mobileNumber: DataTypes.STRING,
  referrerUpi: DataTypes.STRING,
  eventName: DataTypes.STRING,
  payout: DataTypes.DECIMAL,
  status: DataTypes.STRING,
  adminNote: DataTypes.TEXT,
  ipAddress: DataTypes.STRING,
  userAgent: DataTypes.TEXT,
  device: DataTypes.STRING,
  location: DataTypes.STRING,
  googleAid: DataTypes.STRING,
  postbackSent: DataTypes.BOOLEAN,
  postbackSentAt: DataTypes.DATE,
  postbackResponse: DataTypes.TEXT,
  isAutoApproved: DataTypes.BOOLEAN,
  clickedAt: DataTypes.DATE,
  convertedAt: DataTypes.DATE,
  approvedAt: DataTypes.DATE,
}, commonOptions)

const CampLeadEvent = sequelize.define('CampLeadEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campLeadId: DataTypes.INTEGER,
  campId: DataTypes.INTEGER,
  publisherId: DataTypes.INTEGER,
  offerId: DataTypes.INTEGER,
  clickId: DataTypes.STRING,
  eventName: DataTypes.STRING,
  payout: DataTypes.DECIMAL,
  status: DataTypes.STRING,
  p1: DataTypes.STRING,
  p2: DataTypes.STRING,
  p3: DataTypes.STRING,
  p4: DataTypes.STRING,
  p5: DataTypes.STRING,
  sub1: DataTypes.STRING,
  sub2: DataTypes.STRING,
  sub3: DataTypes.STRING,
  sub4: DataTypes.STRING,
  sub5: DataTypes.STRING,
  idfa: DataTypes.STRING,
  googleAid: DataTypes.STRING,
  browser: DataTypes.STRING,
  ipAddress: DataTypes.STRING,
  device: DataTypes.STRING,
  postbackSent: DataTypes.BOOLEAN,
  postbackSentAt: DataTypes.DATE,
  postbackResponse: DataTypes.TEXT,
  convertedAt: DataTypes.DATE,
  approvedAt: DataTypes.DATE,
  createdAt: DataTypes.DATE,
  affiliateConversionId: DataTypes.STRING,
}, commonOptions)

const PublisherPostback = sequelize.define('PublisherPostback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publisherId: DataTypes.INTEGER,
  postbackUrl: DataTypes.TEXT,
  isActive: DataTypes.BOOLEAN,
  lastTestedAt: DataTypes.DATE,
  lastTestResult: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, commonOptions)

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publisherId: DataTypes.INTEGER,
  amount: DataTypes.DECIMAL,
  type: DataTypes.STRING,
  details: DataTypes.TEXT,
  status: DataTypes.STRING,
  reference: DataTypes.STRING,
  createdAt: DataTypes.DATE,
}, commonOptions)

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publisherId: DataTypes.INTEGER,
  amount: DataTypes.DECIMAL,
  method: DataTypes.STRING,
  paymentDetails: DataTypes.TEXT,
  status: DataTypes.STRING,
  adminNote: DataTypes.TEXT,
  transactionRef: DataTypes.STRING,
  requestedAt: DataTypes.DATE,
  processedAt: DataTypes.DATE,
}, commonOptions)

const PublisherOffer = sequelize.define('PublisherOffer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publisherId: DataTypes.INTEGER,
  offerId: DataTypes.INTEGER,
  status: DataTypes.STRING,
  requestedAt: DataTypes.DATE,
  approvedAt: DataTypes.DATE,
  createdAt: DataTypes.DATE,
}, commonOptions)

const PartnerPasswordResetToken = sequelize.define('PartnerPasswordResetToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publisherId: DataTypes.INTEGER,
  token: DataTypes.STRING,
  expiresAt: DataTypes.DATE,
  createdAt: DataTypes.DATE,
}, commonOptions)

const LeadCut = sequelize.define('LeadCut', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  offerId: DataTypes.INTEGER,
  publisherId: DataTypes.INTEGER,
  clickId: DataTypes.STRING,
  eventName: DataTypes.STRING,
  payout: DataTypes.DECIMAL,
  cutAt: DataTypes.DATE,
}, commonOptions)

const AdminUser = sequelize.define('AdminUser', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: DataTypes.STRING,
  passwordHash: DataTypes.STRING,
  name: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, commonOptions)

const IncomingPostback = sequelize.define('IncomingPostback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  receivedAt: DataTypes.DATE,
  rawUrl: DataTypes.TEXT,
  rawParams: DataTypes.TEXT,       // JSON of all query params
  clickId: DataTypes.STRING,
  eventName: DataTypes.STRING,
  offerId: DataTypes.INTEGER,
  offerName: DataTypes.STRING,
  publisherId: DataTypes.INTEGER,
  publisherName: DataTypes.STRING,
  payout: DataTypes.DECIMAL,
  ipAddress: DataTypes.STRING,
  // outcome: PROCESSED | DUPLICATE | CLICK_NOT_FOUND | LEAD_CUT | ERROR
  status: DataTypes.STRING,
  campLeadEventId: DataTypes.INTEGER,
}, commonOptions)

Publisher.hasMany(Camp, { foreignKey: 'publisherId', as: 'camps' })
Camp.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Offer.hasMany(Camp, { foreignKey: 'offerId', as: 'camps' })
Camp.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' })

Camp.hasMany(CampLead, { foreignKey: 'campId', as: 'campLeads' })
CampLead.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' })
Publisher.hasMany(CampLead, { foreignKey: 'publisherId', as: 'campLeads' })
CampLead.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Offer.hasMany(CampLead, { foreignKey: 'offerId', as: 'campLeads' })
CampLead.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' })
CampLead.hasMany(CampLeadEvent, { foreignKey: 'campLeadId', as: 'events' })
CampLeadEvent.belongsTo(CampLead, { foreignKey: 'campLeadId', as: 'lead' })
Camp.hasMany(CampLeadEvent, { foreignKey: 'campId', as: 'campLeadEvents' })
CampLeadEvent.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' })
Publisher.hasMany(CampLeadEvent, { foreignKey: 'publisherId', as: 'campLeadEvents' })
CampLeadEvent.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Offer.hasMany(CampLeadEvent, { foreignKey: 'offerId', as: 'campLeadEvents' })
CampLeadEvent.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' })

Publisher.hasOne(PublisherPostback, { foreignKey: 'publisherId', as: 'postback' })
PublisherPostback.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Publisher.hasMany(WalletTransaction, { foreignKey: 'publisherId', as: 'walletTransactions' })
WalletTransaction.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Publisher.hasMany(WithdrawalRequest, { foreignKey: 'publisherId', as: 'withdrawalRequests' })
WithdrawalRequest.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Publisher.hasMany(PublisherOffer, { foreignKey: 'publisherId', as: 'publisherOffers' })
PublisherOffer.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })
Offer.hasMany(PublisherOffer, { foreignKey: 'offerId', as: 'publisherOffers' })
PublisherOffer.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' })
Publisher.hasMany(PartnerPasswordResetToken, { foreignKey: 'publisherId', as: 'passwordResetTokens' })
PartnerPasswordResetToken.belongsTo(Publisher, { foreignKey: 'publisherId', as: 'publisher' })

const modelMap: Record<string, any> = {
  publisher: Publisher,
  offer: Offer,
  camp: Camp,
  campLead: CampLead,
  campLeadEvent: CampLeadEvent,
  publisherPostback: PublisherPostback,
  walletTransaction: WalletTransaction,
  withdrawalRequest: WithdrawalRequest,
  publisherOffer: PublisherOffer,
  partnerPasswordResetToken: PartnerPasswordResetToken,
  adminUser: AdminUser,
  leadCut: LeadCut,
  incomingPostback: IncomingPostback,
}

function normalizeWhere(where: Record<string, any> | undefined): Record<string, any> {
  if (!where) return {}
  const direct = { ...where }
  for (const [key, value] of Object.entries(where)) {
    if (key.includes('_') && value && typeof value === 'object' && !Array.isArray(value)) {
      delete direct[key]
      Object.assign(direct, value)
    }
  }
  return direct
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
}

function parseFieldOperator(value: Record<string, any>) {
  const op: Record<symbol, any> = {}
  if ('in' in value) op[Op.in] = value.in
  if ('notIn' in value) op[Op.notIn] = value.notIn
  if ('not' in value) op[Op.ne] = value.not
  if ('contains' in value) op[Op.like] = `%${value.contains}%`
  if ('startsWith' in value) op[Op.like] = `${value.startsWith}%`
  if ('endsWith' in value) op[Op.like] = `%${value.endsWith}`
  if ('gte' in value) op[Op.gte] = value.gte
  if ('lte' in value) op[Op.lte] = value.lte
  if ('gt' in value) op[Op.gt] = value.gt
  if ('lt' in value) op[Op.lt] = value.lt
  if ('equals' in value) op[Op.eq] = value.equals
  return Object.getOwnPropertySymbols(op).length ? op : value
}

function parseWhere(where: Record<string, any> | undefined): Record<string, any> {
  const normalized = normalizeWhere(where)
  const output: Record<string, any> = {}

  for (const [key, value] of Object.entries(normalized)) {
    if (key === 'AND' && Array.isArray(value)) {
      output[Op.and as any] = value.map((item) => parseWhere(item))
      continue
    }
    if (key === 'OR' && Array.isArray(value)) {
      output[Op.or as any] = value.map((item) => parseWhere(item))
      continue
    }
    if (key === 'NOT') {
      if (Array.isArray(value)) {
        output[Op.not as any] = value.map((item) => parseWhere(item))
      } else if (isPlainObject(value)) {
        output[Op.not as any] = parseWhere(value)
      } else {
        output[Op.not as any] = value
      }
      continue
    }

    if (isPlainObject(value)) {
      output[key] = parseFieldOperator(value)
    } else {
      output[key] = value
    }
  }

  return output
}

function parseOrderBy(orderBy: any): any[] {
  if (!orderBy) return []
  const list = Array.isArray(orderBy) ? orderBy : [orderBy]
  return list.flatMap((item) => Object.entries(item).map(([key, direction]) => [key, String(direction).toUpperCase()]))
}

function parseInclude(include: any): any[] {
  if (!include) return []
  const out: any[] = []
  for (const [alias, cfg] of Object.entries(include)) {
    const associationCfg: any = { association: alias }
    if (cfg && typeof cfg === 'object' && 'select' in cfg && cfg.select && typeof cfg.select === 'object') {
      associationCfg.attributes = Object.entries(cfg.select).filter(([, v]) => Boolean(v)).map(([k]) => k)
    }
    out.push(associationCfg)
  }
  return out
}

function parseData(data: Record<string, any> | undefined): Record<string, any> {
  if (!data) return {}
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('increment' in value) {
        out[key] = literal(`\`${key}\` + ${Number(value.increment)}`)
        continue
      }
      if ('decrement' in value) {
        out[key] = literal(`\`${key}\` - ${Number(value.decrement)}`)
        continue
      }
    }
    out[key] = value
  }
  return out
}

function mapResult(record: any) {
  if (!record) return null
  if (Array.isArray(record)) return record.map((item) => (item?.toJSON ? item.toJSON() : item))
  return record.toJSON ? record.toJSON() : record
}

function createDelegate(model: any, transaction?: any) {
  return {
    async findUnique(args: any) {
      await ensureDbReady()
      const result = await model.findOne({ where: parseWhere(args?.where), include: parseInclude(args?.include), transaction })
      return mapResult(result)
    },
    async findFirst(args: any) {
      await ensureDbReady()
      const result = await model.findOne({ where: parseWhere(args?.where), include: parseInclude(args?.include), order: parseOrderBy(args?.orderBy), transaction })
      return mapResult(result)
    },
    async findMany(args: any = {}) {
      await ensureDbReady()
      const result = await model.findAll({
        where: parseWhere(args.where),
        include: parseInclude(args.include),
        order: parseOrderBy(args.orderBy),
        limit: args.take,
        offset: args.skip,
        transaction,
      })
      return mapResult(result)
    },
    async count(args: any = {}) {
      await ensureDbReady()
      return model.count({ where: parseWhere(args.where), transaction })
    },
    async aggregate(args: any = {}) {
      await ensureDbReady()
      const where = parseWhere(args.where)
      const result: any = {}
      if (args._sum) {
        result._sum = {}
        for (const key of Object.keys(args._sum)) {
          result._sum[key] = await model.sum(key, { where, transaction })
        }
      }
      if (args._count) {
        result._count = { _all: await model.count({ where, transaction }) }
      }
      return result
    },
    async create(args: any) {
      await ensureDbReady()
      const result = await model.create(parseData(args.data), { transaction })
      return mapResult(result)
    },
    async update(args: any) {
      await ensureDbReady()
      const where = parseWhere(args.where)
      await model.update(parseData(args.data), { where, transaction })
      const result = await model.findOne({ where, transaction })
      return mapResult(result)
    },
    async updateMany(args: any) {
      await ensureDbReady()
      const [count] = await model.update(parseData(args.data), { where: parseWhere(args.where), transaction })
      return { count }
    },
    async upsert(args: any) {
      await ensureDbReady()
      const where = parseWhere(args.where)
      const found = await model.findOne({ where, transaction })
      if (found) {
        await model.update(parseData(args.update), { where, transaction })
        const updated = await model.findOne({ where, transaction })
        return mapResult(updated)
      }
      const created = await model.create(parseData({ ...where, ...args.create }), { transaction })
      return mapResult(created)
    },
    async delete(args: any) {
      await ensureDbReady()
      const where = parseWhere(args.where)
      const record = await model.findOne({ where, transaction })
      await model.destroy({ where, transaction })
      return mapResult(record)
    },
  }
}

function createClient(transaction?: any) {
  const client: any = {
    async $queryRawUnsafe(query: string, ...replacements: any[]) {
      await ensureDbReady()
      const [result] = await sequelize.query(query, { replacements, transaction })
      return result
    },
    async $executeRawUnsafe(query: string, ...replacements: any[]) {
      await ensureDbReady()
      const [result]: any = await sequelize.query(query, { replacements, transaction })
      if (typeof result === 'number') return result
      return result?.affectedRows ?? 0
    },
    async $transaction(fn: any) {
      await ensureDbReady()
      return sequelize.transaction(async (tx) => fn(createClient(tx)))
    },
  }

  for (const [key, model] of Object.entries(modelMap)) {
    client[key] = createDelegate(model, transaction)
  }

  return client
}

const globalForDb = globalThis as unknow  
  db: any
}

export const db = globalForDb.db ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}

export { firePostback, firePublisherPostback } from './postback'
