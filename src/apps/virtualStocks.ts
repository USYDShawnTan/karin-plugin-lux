import { karin } from 'node-karin'
import { addBalance, deductBalance, getBalance } from '../utils/money'
import {
  getVirtualStockQuote,
  getAllVirtualStockQuotes,
  recordVirtualStockBuy,
  recordVirtualStockSell,
  getPortfolioPositions,
  calculateTotalMarketValue,
  estimateBuyCost,
  estimateSellProceeds,
  listVirtualStockDefinitions
} from '../utils/virtualStocks'

function formatNumber (value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits)
}

function buildQuoteMessage (quote: Awaited<ReturnType<typeof getVirtualStockQuote>>): string {
  const arrow = quote.change > 0 ? '▲' : quote.change < 0 ? '▼' : '▬'
  return [
    `📈 ${quote.symbol} ${quote.name}`,
    `现价: ${formatNumber(quote.price)} 金币`,
    `今开: ${formatNumber(quote.openPrice)} | 最高: ${formatNumber(quote.highPrice)} | 最低: ${formatNumber(quote.lowPrice)}`,
    `${arrow} ${formatNumber(quote.change)} (${formatNumber(quote.changePercent)}%)`,
    `更新时间: ${new Date(quote.lastUpdated).toLocaleString('zh-CN')}`
  ].join('\n')
}

export const virtualStockHelp = karin.command(/^#*(股市帮助|虚拟股市|虚拟股市帮助)$/i, async (e) => {
  const helpLines = [
    '欢迎来到 Karin 虚拟股市！',
    '指令示例：',
    '- #股市           查看全市场概况',
    '- #股市 001      查看单只股票',
    '- #买 001 10     买入 10 股',
    '- #卖 001 5      卖出 5 股',
    '- #持仓           查看个人持仓',
    '- #股市榜         查看涨跌榜单',
    '交易使用金币，请确保余额充足。祝你投资顺利！'
  ]
  await e.reply(helpLines.join('\n'))
  return true
}, { name: '虚拟股市帮助' })

export const virtualStockOverview = karin.command(/^#*股市(?:\s+(\S+))?$/i, async (e) => {
  const match = e.msg.trim().match(/^#*股市(?:\s+(\S+))?$/i)
  const symbol = match?.[1]

  try {
    if (symbol) {
      const quote = await getVirtualStockQuote(symbol)
      await e.reply(buildQuoteMessage(quote))
      return true
    }

    const quotes = await getAllVirtualStockQuotes()
    if (!quotes.length) {
      await e.reply('当前没有可用的虚拟股票，请稍后再试。')
      return false
    }

    const header = `📊 Karin 虚拟股市 (${new Date().toLocaleString('zh-CN')})`
    const lines = quotes.map((item, index) => {
      const arrow = item.change > 0 ? '▲' : item.change < 0 ? '▼' : '▬'
      return `${String(index + 1).padStart(2, '0')}. ${item.symbol} ${item.name} | 现价 ${formatNumber(item.price)} | ${arrow} ${formatNumber(item.change)} (${formatNumber(item.changePercent)}%)`
    })

    const chunks: string[][] = []
    for (let i = 0; i < lines.length; i += 15) {
      chunks.push(lines.slice(i, i + 15))
    }

    for (let i = 0; i < chunks.length; i++) {
      const prefix = i === 0 ? `${header}\n` : ''
      await e.reply(prefix + chunks[i].join('\n'))
    }

    return true
  } catch (error) {
    console.error('获取虚拟股市信息失败:', error)
    await e.reply('❌ 当前无法获取虚拟股市信息，请稍后再试')
    return false
  }
}, { name: '虚拟股市概览' })

export const virtualStockQuote = karin.command(/^#*(股价|quote)\s+(\S+)$/i, async (e) => {
  const match = e.msg.trim().match(/^#*(?:股价|quote)\s+(\S+)$/i)
  if (!match) {
    await e.reply('用法: #股价 股票代码，例如 #股价 KAI')
    return false
  }

  const symbol = match[1]
  try {
    const quote = await getVirtualStockQuote(symbol)
    await e.reply(buildQuoteMessage(quote))
    return true
  } catch (error) {
    console.error('获取虚拟股价失败:', error)
    await e.reply('❌ 未找到该虚拟股票代码')
    return false
  }
}, { name: '虚拟股价查询' })

export const virtualStockBuy = karin.command(/^#*(买|买入)\s+(\S+)\s+(\d+)$/i, async (e) => {
  const match = e.msg.trim().match(/^#*(?:买|买入)\s+(\S+)\s+(\d+)$/i)
  if (!match) {
    await e.reply('用法: #买 股票代码 数量，例如 #买 KAI 10')
    return false
  }

  const userId = e.sender?.userId
  if (!userId) {
    await e.reply('❌ 无法识别用户信息')
    return false
  }

  const symbol = match[1]
  const quantity = Number(match[2])
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    await e.reply('❌ 数量必须为正整数')
    return false
  }

  try {
    const quote = await getVirtualStockQuote(symbol)
    const cost = estimateBuyCost(quote.price, quantity)

    await deductBalance(userId, cost)

    try {
      const position = await recordVirtualStockBuy(userId, symbol, quantity, quote.price)
      await e.reply([
        `✅ 买入成功：${symbol} x ${quantity}，成本 ${formatNumber(cost)} 金币`,
        `持仓均价: ${formatNumber(position.avgCost)} | 最新价: ${formatNumber(position.marketPrice)}`,
        `当前浮盈: ${formatNumber(position.profit)} (${formatNumber(position.profitPercent)}%)`
      ].join('\n'))
      return true
    } catch (updateError) {
      console.error('记录虚拟股市买入失败:', updateError)
      await addBalance(userId, cost)
      await e.reply('❌ 购买失败，请稍后再试')
      return false
    }
  } catch (error) {
    console.error('虚拟股市买入失败:', error)
    if (error instanceof Error && /余额不足/.test(error.message)) {
      const balance = await getBalance(userId)
      await e.reply(`❌ 余额不足，当前余额 ${formatNumber(balance)} 金币`)
    } else {
      await e.reply('❌ 买入失败，请确认股票代码或稍后再试')
    }
    return false
  }
}, { name: '虚拟股票买入' })

export const virtualStockSell = karin.command(/^#*(卖|卖出)\s+(\S+)\s+(\d+)$/i, async (e) => {
  const match = e.msg.trim().match(/^#*(?:卖|卖出)\s+(\S+)\s+(\d+)$/i)
  if (!match) {
    await e.reply('用法: #卖 股票代码 数量，例如 #卖 KAI 5')
    return false
  }

  const userId = e.sender?.userId
  if (!userId) {
    await e.reply('❌ 无法识别用户信息')
    return false
  }

  const symbol = match[1]
  const quantity = Number(match[2])
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    await e.reply('❌ 数量必须为正整数')
    return false
  }

  try {
    const quote = await getVirtualStockQuote(symbol)
    const proceeds = estimateSellProceeds(quote.price, quantity)

    const result = await recordVirtualStockSell(userId, symbol, quantity, quote.price)
    await addBalance(userId, proceeds)

    const lines = [
      `✅ 卖出成功：${symbol} x ${quantity}，收入 ${formatNumber(proceeds)} 金币`,
      `本次收益: ${formatNumber(result.realizedProfit)} (均价 ${formatNumber(result.avgCost)} → 现价 ${formatNumber(quote.price)})`
    ]

    if (result.position) {
      lines.push(`剩余持仓 ${result.position.shares} 股，浮盈 ${formatNumber(result.position.profit)} (${formatNumber(result.position.profitPercent)}%)`)
    } else {
      lines.push('持仓已清空，欢迎常来看看~')
    }

    await e.reply(lines.join('\n'))
    return true
  } catch (error) {
    console.error('虚拟股市卖出失败:', error)
    if (error instanceof Error && /持仓不足/.test(error.message)) {
      await e.reply('❌ 持仓不足，无法卖出这么多')
    } else {
      await e.reply('❌ 卖出失败，请确认股票代码或稍后再试')
    }
    return false
  }
}, { name: '虚拟股票卖出' })

export const virtualStockPortfolio = karin.command(/^#*(持仓|仓位|portfolio)$/i, async (e) => {
  const userId = e.sender?.userId
  if (!userId) {
    await e.reply('❌ 无法识别用户信息')
    return false
  }

  try {
    let balance = await getBalance(userId)
    let initNotice: string | null = null
    if (balance <= 0) {
      const grant = Math.max(1000 - balance, 1000)
      balance = await addBalance(userId, grant)
      initNotice = `💡 新手礼包：已为你发放 ${grant} 金币启动资金`
    }

    const positions = await getPortfolioPositions(userId)
    if (positions.length === 0) {
      const messageLines = ['📦 当前没有任何虚拟股票持仓，试试 #股市 查看可交易标的。']
      if (initNotice) messageLines.push(initNotice)
      messageLines.push(`💰 可用余额: ${formatNumber(balance)} 金币`)
      await e.reply(messageLines.join('\n'))
      return true
    }

    const totals = calculateTotalMarketValue(positions)

    const lines = positions.map(pos => {
      const arrow = pos.profit > 0 ? '▲' : pos.profit < 0 ? '▼' : '▬'
      return `${pos.symbol} ${pos.shares} 股 | 均价 ${formatNumber(pos.avgCost)} | 现价 ${formatNumber(pos.marketPrice)} | ${arrow} ${formatNumber(pos.profit)} (${formatNumber(pos.profitPercent)}%)`
    })

    lines.unshift(`💼 持仓总值: ${formatNumber(totals.marketValue)} 金币 (浮盈 ${formatNumber(totals.profit)} / ${formatNumber(totals.profitPercent)}%)`)
    if (initNotice) {
      lines.unshift(initNotice)
    }
    lines.push(`💰 可用余额: ${formatNumber(balance)} 金币`)

    await e.reply(lines.join('\n'))
    return true
  } catch (error) {
    console.error('查询虚拟股市持仓失败:', error)
    await e.reply('❌ 无法获取持仓信息，请稍后再试')
    return false
  }
}, { name: '虚拟股市持仓' })

export const virtualStockAssets = karin.command(/^#*(我的资产|资产|钱包)$/i, async (e) => {
  const userId = e.sender?.userId
  if (!userId) {
    await e.reply('❌ 无法识别用户信息')
    return false
  }

  try {
    const balance = await getBalance(userId)
    const positions = await getPortfolioPositions(userId)
    const totals = calculateTotalMarketValue(positions)

    const lines = [
      `💰 可用余额: ${formatNumber(balance)} 金币`,
      `📦 持仓市值: ${formatNumber(totals.marketValue)} 金币`,
      `📈 总资产: ${formatNumber(balance + totals.marketValue)} 金币`
    ]

    if (positions.length > 0) {
      lines.push(`当前浮盈: ${formatNumber(totals.profit)} (${formatNumber(totals.profitPercent)}%)`)
    }

    await e.reply(lines.join('\n'))
    return true
  } catch (error) {
    console.error('查询资产失败:', error)
    await e.reply('❌ 无法获取资产信息，请稍后再试')
    return false
  }
}, { name: '虚拟股市资产' })

export const virtualStockLeaderboard = karin.command(/^#*(股市榜|热门股|涨幅榜)$/i, async (e) => {
  try {
    const quotes = await getAllVirtualStockQuotes()
    const top = quotes.slice(0, 6)
    const bottom = quotes.slice(-3).reverse()

    const sections: string[] = []

    sections.push('🚀 涨幅榜 Top 6:')
    top.forEach((item, idx) => {
      const arrow = item.change > 0 ? '▲' : item.change < 0 ? '▼' : '▬'
      sections.push(`${idx + 1}. ${item.symbol} ${item.name} | 现价 ${formatNumber(item.price)} | ${arrow} ${formatNumber(item.change)} (${formatNumber(item.changePercent)}%)`)
    })

    sections.push('')
    sections.push('🥶 跌幅榜:')
    bottom.forEach((item) => {
      const arrow = item.change > 0 ? '▲' : item.change < 0 ? '▼' : '▬'
      sections.push(`${item.symbol} ${item.name} | 现价 ${formatNumber(item.price)} | ${arrow} ${formatNumber(item.change)} (${formatNumber(item.changePercent)}%)`)
    })

    sections.push('')
    sections.push('可交易标的：' + listVirtualStockDefinitions().map(item => item.symbol).join('、'))

    await e.reply(sections.join('\n'))
    return true
  } catch (error) {
    console.error('获取虚拟股市榜单失败:', error)
    await e.reply('❌ 暂时无法获取行情榜单')
    return false
  }
}, { name: '虚拟股市榜单' })
