export type User = {
  phone: string
  inn: string
  name: string
  okved: string
  turnover: string
  goal: string
}

export type Product = {
  id: string
  name: string
  bank: string
  amountFrom: number
  amountTo: number
  rateFrom: number
  termFrom: number
  termTo: number
  tags: string[]
  approval: number // вероятность одобрения, %
  preapproved?: boolean
  description: string
}

export type CreditStatus = 'active' | 'done' | 'rejected' | 'review'

export type CreditItem = {
  id: string
  productName: string
  bank: string
  amount: number
  rate: number
  termMonths: number
  status: CreditStatus
  paid?: number // сколько выплачено (для active)
  createdAt: string
  nextPayment?: { date: string; amount: number }
}

export const fmt = (n: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽'

export const monthlyPay = (amount: number, annualRate: number, months: number): number => {
  const r = annualRate / 100 / 12
  return Math.round((amount * r) / (1 - Math.pow(1 + r, -months)))
}

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Бизнес-Старт',
    bank: 'Банк «Север»',
    amountFrom: 100_000,
    amountTo: 3_000_000,
    rateFrom: 15.9,
    termFrom: 6,
    termTo: 36,
    tags: ['Без залога', 'Без справок', 'Решение за 15 минут'],
    approval: 85,
    preapproved: true,
    description: 'Предодобренный оборотный кредит для пополнения рабочего капитала.',
  },
  {
    id: 'p2',
    name: 'Развитие',
    bank: 'Банк «Север»',
    amountFrom: 1_000_000,
    amountTo: 30_000_000,
    rateFrom: 13.5,
    termFrom: 12,
    termTo: 84,
    tags: ['Инвестиции', 'Под залог'],
    approval: 62,
    description: 'Инвестиционный кредит на покупку оборудования, недвижимости и модернизацию.',
  },
  {
    id: 'p3',
    name: 'Гибкая линия',
    bank: 'Финбанк',
    amountFrom: 500_000,
    amountTo: 10_000_000,
    rateFrom: 16.9,
    termFrom: 12,
    termTo: 36,
    tags: ['Без залога', 'Платишь только за использование'],
    approval: 74,
    description: 'Кредитная линия на пополнение оборотки: деньги доступны всегда, проценты — только на использованную сумму.',
  },
  {
    id: 'p4',
    name: 'Прозрачный овердрафт',
    bank: 'Банк «Север»',
    amountFrom: 50_000,
    amountTo: 1_000_000,
    rateFrom: 18.0,
    termFrom: 6,
    termTo: 24,
    tags: ['К расчётному счёту', 'Без документов'],
    approval: 90,
    description: 'Подключение к вашему расчётному счёту — закрывает кассовые разрывы автоматически.',
  },
  {
    id: 'p5',
    name: 'Техника в работу',
    bank: 'ЛизингПро',
    amountFrom: 300_000,
    amountTo: 50_000_000,
    rateFrom: 11.9,
    termFrom: 12,
    termTo: 60,
    tags: ['Лизинг', 'Аванс от 0%'],
    approval: 78,
    description: 'Лизинг оборудования и техники: она сразу работает на бизнес, а платите помесячно.',
  },
  {
    id: 'p6',
    name: 'Экспресс до 500',
    bank: 'Финбанк',
    amountFrom: 50_000,
    amountTo: 500_000,
    rateFrom: 21.0,
    termFrom: 3,
    termTo: 12,
    tags: ['Без залога', 'Решение за 5 минут', 'По паспорту'],
    approval: 93,
    description: 'Микрокредит на срочные нужды: только паспорт и ИНН, деньги за 5 минут.',
  },
  {
    id: 'p7',
    name: 'Сезонный рост',
    bank: 'Банк «Восток»',
    amountFrom: 500_000,
    amountTo: 5_000_000,
    rateFrom: 16.4,
    termFrom: 6,
    termTo: 18,
    tags: ['Без залога', 'График под сезон'],
    approval: 71,
    description: 'Кредит на закупку товара к сезону с графиком платежей, привязанным к вашим продажам.',
  },
  {
    id: 'p8',
    name: 'Крупный шаг',
    bank: 'Банк «Восток»',
    amountFrom: 10_000_000,
    amountTo: 100_000_000,
    rateFrom: 12.9,
    termFrom: 24,
    termTo: 120,
    tags: ['Под залог', 'До 100 млн'],
    approval: 48,
    description: 'Долгосрочное финансирование крупных проектов под залог недвижимости.',
  },
]

export const INITIAL_CREDITS: CreditItem[] = [
  {
    id: 'c1',
    productName: 'Инвестиционный «Развитие»',
    bank: 'Банк «Север»',
    amount: 500_000,
    rate: 15.2,
    termMonths: 24,
    status: 'active',
    paid: 210_000,
    createdAt: '12.03.2026',
    nextPayment: { date: '01.11.2026', amount: 24_300 },
  },
  {
    id: 'c2',
    productName: 'Овердрафт «Прозрачный»',
    bank: 'Банк «Север»',
    amount: 300_000,
    rate: 18.0,
    termMonths: 12,
    status: 'active',
    paid: 60_000,
    createdAt: '20.06.2026',
    nextPayment: { date: '05.11.2026', amount: 5_400 },
  },
  {
    id: 'c3',
    productName: 'Оборотный «Бизнес-Старт»',
    bank: 'Банк «Север»',
    amount: 200_000,
    rate: 17.1,
    termMonths: 12,
    status: 'done',
    paid: 200_000,
    createdAt: '14.02.2025',
  },
  {
    id: 'c4',
    productName: 'Заявка «Крупный шаг»',
    bank: 'Банк «Восток»',
    amount: 5_000_000,
    rate: 12.9,
    termMonths: 60,
    status: 'rejected',
    createdAt: '02.09.2026',
  },
]

export const STATUS_LABEL: Record<CreditStatus, string> = {
  active: 'Активен',
  done: 'Погашен',
  rejected: 'Отклонён',
  review: 'На рассмотрении',
}
