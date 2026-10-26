export type User = {
  phone: string
  inn: string
  name: string
  okved: string
  turnover: string
  goal: string
  revenue: number
  ageYears: number
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
  approval: number
  preapproved?: boolean
  description: string
  matchScore?: number
  reason?: string
}

export type CreditStatus = 'active' | 'done' | 'rejected' | 'review' | 'signing' | 'clarification'

export type StatusEvent = {
  from: string | null
  to: string
  at: string
  comment: string
}

export type CreditItem = {
  id: string
  backendId?: number
  productName: string
  bank: string
  amount: number
  rate: number
  termMonths: number
  status: CreditStatus
  statusRaw?: string
  purpose?: string
  score?: number
  decisionComment?: string
  history?: StatusEvent[]
  paid?: number
  createdAt: string
  nextPayment?: { date: string; amount: number }
}

export type ApiApplication = {
  id: number
  status: string
  amount: number
  term_months: number
  purpose: string
  score: number | null
  offer_rate: number | null
  decision_comment: string | null
  created_at: string
  company: { name: string; inn: string }
  product: {
    id: number
    name: string
    bank: string
    base_rate: number
  }
  history: StatusEvent[]
}

export const fmt = (n: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽'

export const monthlyPay = (amount: number, annualRate: number, months: number): number => {
  const r = annualRate / 100 / 12
  return Math.round((amount * r) / (1 - Math.pow(1 + r, -months)))
}

export const applicationToCredit = (a: ApiApplication): CreditItem => ({
  id: `a${a.id}`,
  backendId: a.id,
  productName: a.product.name,
  bank: a.product.bank,
  amount: a.amount,
  rate: a.offer_rate ?? a.product.base_rate + 1.5,
  termMonths: a.term_months,
  status: a.status === 'issued' ? 'active' : a.status === 'rejected' ? 'rejected' : a.status === 'signing' ? 'signing' : a.status === 'clarification' ? 'clarification' : 'review',
  statusRaw: a.status,
  purpose: a.purpose,
  score: a.score ?? undefined,
  decisionComment: a.decision_comment ?? undefined,
  history: a.history,
  createdAt: new Date(a.created_at).toLocaleDateString('ru-RU'),
})

// Исторические сделки — синтетические данные для демонстрации кабинета, не новые заявки.
export const INITIAL_CREDITS: CreditItem[] = [
  {
    id: 'demo-1', productName: 'Кредит на развитие бизнеса', bank: 'Альфа-Банк',
    amount: 500_000, rate: 15.0, termMonths: 24, status: 'active', paid: 210_000,
    createdAt: '12.03.2026', nextPayment: { date: '01.11.2026', amount: 24_300 },
  },
  {
    id: 'demo-2', productName: 'Оборотный кредит', bank: 'Альфа-Банк',
    amount: 200_000, rate: 17.4, termMonths: 12, status: 'done', paid: 200_000,
    createdAt: '14.02.2025',
  },
]

export const STATUS_LABEL: Record<CreditStatus, string> = {
  active: 'Выдан',
  done: 'Погашен',
  rejected: 'Отклонён',
  review: 'В обработке',
  signing: 'Подписание',
  clarification: 'Нужно уточнение',
}
