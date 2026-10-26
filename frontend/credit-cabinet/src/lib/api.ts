import { applicationToCredit, type ApiApplication, type CreditItem, type Product, type User } from './data'

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : `Ошибка API (${response.status})`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

type ApiProduct = {
  id: number
  name: string
  bank: string
  min_amount: number
  max_amount: number
  min_term_months: number
  max_term_months: number
  base_rate: number
  description: string
  tags: string[]
  approval: number
  preapproved: boolean
  match_score?: number
  reason?: string
}

const mapProduct = (p: ApiProduct): Product => ({
  id: String(p.id),
  name: p.name,
  bank: p.bank,
  amountFrom: p.min_amount,
  amountTo: p.max_amount,
  rateFrom: p.base_rate,
  termFrom: p.min_term_months,
  termTo: p.max_term_months,
  tags: p.tags,
  approval: p.approval,
  preapproved: p.preapproved,
  description: p.description,
  matchScore: p.match_score,
  reason: p.reason,
})

export async function getProducts(): Promise<Product[]> {
  const items = await request<ApiProduct[]>('/products')
  return items.map(mapProduct)
}

export async function getRecommendations(user: User, amount: number, term: number, purpose: string): Promise<Product[]> {
  const result = await request<{ items: ApiProduct[] }>('/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      company_name: user.name,
      inn: user.inn,
      revenue: user.revenue,
      age_years: user.ageYears,
      amount,
      term_months: term,
      purpose,
    }),
  })
  return result.items.map(mapProduct)
}

export async function createApplication(user: User, product: Product, amount: number, term: number, purpose: string): Promise<CreditItem> {
  const application = await request<ApiApplication>('/applications', {
    method: 'POST',
    body: JSON.stringify({
      company_name: user.name,
      inn: user.inn,
      revenue: user.revenue,
      age_years: user.ageYears,
      product_id: Number(product.id),
      amount,
      term_months: term,
      purpose,
    }),
  })
  return applicationToCredit(application)
}

export async function getApplications(inn: string): Promise<CreditItem[]> {
  const items = await request<ApiApplication[]>(`/applications?inn=${encodeURIComponent(inn)}`)
  return items.map(applicationToCredit)
}

export async function signApplication(id: number): Promise<CreditItem> {
  return applicationToCredit(await request<ApiApplication>(`/applications/${id}/sign`, { method: 'POST' }))
}

export async function clarifyApplication(id: number, comment: string): Promise<CreditItem> {
  return applicationToCredit(await request<ApiApplication>(`/applications/${id}/clarify`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  }))
}
