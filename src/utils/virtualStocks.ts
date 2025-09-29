import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { redis as karinRedis } from 'node-karin'
import { dir } from '../dir'
import { random } from './common'


// Redis 内的行情与持仓存储键，方便统一管理
const PRICE_KEY = 'karin:virtualstocks:prices'
const PORTFOLIO_KEY = 'karin:virtualstocks:portfolio'

// 行情刷新节奏控制：至少间隔 1 分钟，最多一次补齐 5 个时间片
const MIN_UPDATE_INTERVAL_MS = 60_000
const MAX_INTERVALS_PER_UPDATE = 5

// 股票基础信息配置文件名（位于 data/virtual-stocks.json）
const STOCK_DATA_FILE = 'virtual-stocks.json'

interface RedisClientLike {
  hGet: (key: string, field: string) => Promise<string | null>
  hSet: (key: string, field: string, value: string) => Promise<unknown>
  hDel: (key: string, ...fields: string[]) => Promise<unknown>
}

interface VirtualStockDefinition {
  symbol: string
  name: string
  basePrice: number
  volatility: number
  bias?: number
}

interface VirtualStockState {
  symbol: string
  price: number
  openPrice: number
  highPrice: number
  lowPrice: number
  lastUpdated: number
  day: string
}

export interface VirtualStockQuote {
  symbol: string
  name: string
  price: number
  openPrice: number
  highPrice: number
  lowPrice: number
  change: number
  changePercent: number
  lastUpdated: number
}

interface StoredHolding {
  shares: number
  avgCost: number
  updatedAt: number
}

export interface PortfolioPosition {
  symbol: string
  name: string
  shares: number
  avgCost: number
  marketPrice: number
  marketValue: number
  profit: number
  profitPercent: number
}

// 缓存解析后的股票配置，避免每次调用都读文件
let cachedStocks: VirtualStockDefinition[] | null = null

function getRedisClient (): RedisClientLike {
  const client: Partial<RedisClientLike> | undefined = karinRedis as any
  if (!client || typeof client.hGet !== 'function' || typeof client.hSet !== 'function' || typeof client.hDel !== 'function') {
    throw new Error('虚拟股市需要可用的 Redis 客户端，请确认已经启用 Redis')
  }
  return client as RedisClientLike
}

function normalizeSymbol (input: string): string {
  return input.trim().toUpperCase()
}

// 从数据文件中读取股票列表，若读取失败直接抛错提醒维护者补充配置。
function getStockDefinitions (): VirtualStockDefinition[] {
  if (cachedStocks) return cachedStocks

  const candidates = [
    path.join(dir.dataDir, STOCK_DATA_FILE),
    path.join(dir.pluginDir, 'data', STOCK_DATA_FILE)
  ]

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        throw new Error(`[virtualStocks] 股票配置文件格式不正确: ${filePath}`)
      }

      const sanitized: VirtualStockDefinition[] = parsed.map((item, index) => {
        const symbol = typeof item.symbol === 'string' ? item.symbol.trim().toUpperCase() : ''
        const name = typeof item.name === 'string' ? item.name.trim() : ''
        const basePrice = Number(item.basePrice)
        const volatility = Number(item.volatility)
        const bias = item.bias !== undefined ? Number(item.bias) : undefined

        if (!symbol || !Number.isFinite(basePrice) || !Number.isFinite(volatility)) {
          throw new Error(`配置第 ${index + 1} 条数据缺少必要字段`)
        }

        return {
          symbol,
          name: name || symbol,
          basePrice: Math.max(1, basePrice),
          volatility: Math.max(0.001, volatility),
          bias
        }
      })

      cachedStocks = sanitized
      return cachedStocks
    } catch (error) {
      throw new Error(`[virtualStocks] 读取股票配置失败: ${filePath} -> ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`[virtualStocks] 未找到股票配置文件，请在 data/${STOCK_DATA_FILE} 中提供配置`)
}

function getStockDefinition (symbol: string): VirtualStockDefinition {
  const normalized = normalizeSymbol(symbol)
  const matched = getStockDefinitions().find(item => item.symbol === normalized)
  if (!matched) {
    throw new Error(`不存在的虚拟股票代码: ${symbol}`)
  }
  return matched
}

function toDayKey (timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function roundPrice (value: number): number {
  return Math.max(1, Math.round(value * 100) / 100)
}

function createInitialState (definition: VirtualStockDefinition, timestamp: number): VirtualStockState {
  const base = roundPrice(definition.basePrice)
  const day = toDayKey(timestamp)
  return {
    symbol: definition.symbol,
    price: base,
    openPrice: base,
    highPrice: base,
    lowPrice: base,
    lastUpdated: timestamp,
    day
  }
}

// 使用“随机游走 + 微偏移”的方式模拟股价涨跌。
// 每次调用都会在当前价位附近随机波动，bias 用于给某些股票长期趋势。
function applyDriftOnce (state: VirtualStockState, definition: VirtualStockDefinition): VirtualStockState {
  const bias = definition.bias ?? 0
  const volatility = definition.volatility
  const swing = (random(-volatility, volatility) + bias) * state.price
  const nextPrice = roundPrice(state.price + swing)
  const highPrice = Math.max(state.highPrice, nextPrice)
  const lowPrice = Math.min(state.lowPrice, nextPrice)
  return {
    ...state,
    price: nextPrice,
    highPrice,
    lowPrice
  }
}

async function saveState (state: VirtualStockState): Promise<void> {
  const client = getRedisClient()
  await client.hSet(PRICE_KEY, state.symbol, JSON.stringify(state))
}

async function loadState (symbol: string): Promise<VirtualStockState | null> {
  const client = getRedisClient()
  const raw = await client.hGet(PRICE_KEY, symbol)
  if (!raw) return null
  try {
    return JSON.parse(raw) as VirtualStockState
  } catch (error) {
    console.warn('虚拟股票价格记录解析失败:', error)
    return null
  }
}

// 读取（并必要时刷新）股票的当日状态。
// - 每天零点会重置开盘价
// - 最快每分钟更新一次，避免短时间内被刷数
// - 若长时间未访问，会补齐多个时间片的波动
async function ensureState (definition: VirtualStockDefinition): Promise<VirtualStockState> {
  const now = Date.now()
  const today = toDayKey(now)
  let state = await loadState(definition.symbol)
  if (!state) {
    state = createInitialState(definition, now)
    await saveState(state)
    return state
  }

  if (state.day !== today) {
    const reset: VirtualStockState = {
      symbol: definition.symbol,
      price: state.price,
      openPrice: state.price,
      highPrice: state.price,
      lowPrice: state.price,
      lastUpdated: now,
      day: today
    }
    await saveState(reset)
    return reset
  }

  const elapsed = now - state.lastUpdated
  if (elapsed < MIN_UPDATE_INTERVAL_MS) {
    return state
  }

  const steps = Math.min(MAX_INTERVALS_PER_UPDATE, Math.max(1, Math.floor(elapsed / MIN_UPDATE_INTERVAL_MS)))
  let nextState = { ...state }
  for (let i = 0; i < steps; i++) {
    nextState = applyDriftOnce(nextState, definition)
  }
  nextState.lastUpdated = now
  await saveState(nextState)
  return nextState
}

export async function getVirtualStockQuote (symbol: string): Promise<VirtualStockQuote> {
  const definition = getStockDefinition(symbol)
  const state = await ensureState(definition)
  const change = Number((state.price - state.openPrice).toFixed(2))
  const base = state.openPrice || 1
  const changePercent = Number(((state.price - state.openPrice) / base * 100).toFixed(2))

  return {
    symbol: definition.symbol,
    name: definition.name,
    price: state.price,
    openPrice: state.openPrice,
    highPrice: state.highPrice,
    lowPrice: state.lowPrice,
    change,
    changePercent,
    lastUpdated: state.lastUpdated
  }
}

export async function getAllVirtualStockQuotes (): Promise<VirtualStockQuote[]> {
  const quotes = await Promise.all(getStockDefinitions().map(item => getVirtualStockQuote(item.symbol)))
  return quotes.sort((a, b) => b.changePercent - a.changePercent)
}

// 从 Redis 中读取用户持仓映射（symbol -> { shares, avgCost }）
async function loadPortfolio (userId: string): Promise<Record<string, StoredHolding>> {
  const client = getRedisClient()
  const raw = await client.hGet(PORTFOLIO_KEY, userId)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, StoredHolding>
  } catch (error) {
    console.warn('虚拟股市持仓解析失败:', error)
    return {}
  }
}

// 将最新持仓写回 Redis；当持仓为空时清理对应字段
async function savePortfolio (userId: string, holdings: Record<string, StoredHolding>): Promise<void> {
  const client = getRedisClient()
  const symbols = Object.keys(holdings)
  if (symbols.length === 0) {
    await client.hDel(PORTFOLIO_KEY, userId)
    return
  }
  await client.hSet(PORTFOLIO_KEY, userId, JSON.stringify(holdings))
}

export async function recordVirtualStockBuy (userId: string, symbol: string, quantity: number, price: number): Promise<PortfolioPosition> {
  if (quantity <= 0) throw new Error('买入数量必须大于 0')
  const definition = getStockDefinition(symbol)
  const holdings = await loadPortfolio(userId)
  const key = definition.symbol
  const existing = holdings[key]
  const totalShares = (existing?.shares ?? 0) + quantity
  const totalCost = (existing?.shares ?? 0) * (existing?.avgCost ?? 0) + quantity * price
  const avgCost = Number((totalCost / totalShares).toFixed(2))

  holdings[key] = {
    shares: totalShares,
    avgCost,
    updatedAt: Date.now()
  }

  await savePortfolio(userId, holdings)

  const quote = await getVirtualStockQuote(key)
  const marketValue = Number((quote.price * totalShares).toFixed(2))
  const profit = Number((marketValue - totalShares * avgCost).toFixed(2))
  const profitPercent = avgCost === 0 ? 0 : Number(((quote.price - avgCost) / avgCost * 100).toFixed(2))

  return {
    symbol: quote.symbol,
    name: quote.name,
    shares: totalShares,
    avgCost,
    marketPrice: quote.price,
    marketValue,
    profit,
    profitPercent
  }
}

export async function recordVirtualStockSell (userId: string, symbol: string, quantity: number, price: number): Promise<{ position: PortfolioPosition | null, proceeds: number, realizedProfit: number, avgCost: number }> {
  if (quantity <= 0) throw new Error('卖出数量必须大于 0')
  const definition = getStockDefinition(symbol)
  const holdings = await loadPortfolio(userId)
  const key = definition.symbol
  const existing = holdings[key]

  if (!existing || existing.shares < quantity) {
    throw new Error('持仓不足，无法卖出')
  }

  const remaining = existing.shares - quantity
  const proceeds = Number((price * quantity).toFixed(2))
  const avgCost = existing.avgCost
  const realizedProfit = Number(((price - avgCost) * quantity).toFixed(2))

  if (remaining === 0) {
    delete holdings[key]
  } else {
    holdings[key] = {
      shares: remaining,
      avgCost,
      updatedAt: Date.now()
    }
  }

  await savePortfolio(userId, holdings)

  if (remaining === 0) {
    return {
      position: null,
      proceeds,
      realizedProfit,
      avgCost
    }
  }

  const quote = await getVirtualStockQuote(key)
  const marketValue = Number((quote.price * remaining).toFixed(2))
  const profit = Number((marketValue - remaining * avgCost).toFixed(2))
  const profitPercent = avgCost === 0 ? 0 : Number(((quote.price - avgCost) / avgCost * 100).toFixed(2))

  const position: PortfolioPosition = {
    symbol: quote.symbol,
    name: quote.name,
    shares: remaining,
    avgCost,
    marketPrice: quote.price,
    marketValue,
    profit,
    profitPercent
  }

  return {
    position,
    proceeds,
    realizedProfit,
    avgCost
  }
}

export async function getPortfolioPositions (userId: string): Promise<PortfolioPosition[]> {
  const holdings = await loadPortfolio(userId)
  const symbols = Object.keys(holdings)
  if (symbols.length === 0) return []

  const positions = await Promise.all(symbols.map(async (symbol) => {
    const quote = await getVirtualStockQuote(symbol)
    const record = holdings[symbol]
    const marketValue = Number((quote.price * record.shares).toFixed(2))
    const profit = Number((marketValue - record.shares * record.avgCost).toFixed(2))
  const profitPercent = record.avgCost === 0 ? 0 : Number(((quote.price - record.avgCost) / record.avgCost * 100).toFixed(2))

    return {
      symbol: quote.symbol,
      name: quote.name,
      shares: record.shares,
      avgCost: record.avgCost,
      marketPrice: quote.price,
      marketValue,
      profit,
      profitPercent
    } satisfies PortfolioPosition
  }))

  return positions.sort((a, b) => b.marketValue - a.marketValue)
}

export function listVirtualStockDefinitions (): VirtualStockDefinition[] {
  return getStockDefinitions().map(item => ({ ...item }))
}

export function calculateTotalMarketValue (positions: PortfolioPosition[]): { marketValue: number, costBasis: number, profit: number, profitPercent: number } {
  let marketValue = 0
  let costBasis = 0
  positions.forEach((item) => {
    marketValue += item.marketValue
    costBasis += item.shares * item.avgCost
  })
  marketValue = Number(marketValue.toFixed(2))
  costBasis = Number(costBasis.toFixed(2))
  const profit = Number((marketValue - costBasis).toFixed(2))
  const profitPercent = costBasis === 0 ? 0 : Number(((profit / costBasis) * 100).toFixed(2))
  return { marketValue, costBasis, profit, profitPercent }
}

export function estimateBuyCost (price: number, quantity: number): number {
  return Number((price * quantity).toFixed(2))
}

export function estimateSellProceeds (price: number, quantity: number): number {
  return Number((price * quantity).toFixed(2))
}
