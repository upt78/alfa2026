import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Bot, GitCompareArrows, X } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { fmt, monthlyPay, type Product } from '@/lib/data'

type Filter = 'all' | 'no-collateral' | 'fast' | 'preapproved'

type Props = {
  products: Product[]
  onApply: (p: Product) => void
  onGoAssistant: () => void
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все предложения' },
  { id: 'preapproved', label: 'Предодобрено' },
  { id: 'no-collateral', label: 'Без залога' },
  { id: 'fast', label: 'Быстрое решение' },
]

export function MarketScreen({ products, onApply, onGoAssistant }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [requestedAmount, setRequestedAmount] = useState(1_000_000)
  const [compare, setCompare] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  const list = useMemo(() => {
    let filtered = products.filter((p) => p.amountFrom <= requestedAmount && p.amountTo >= requestedAmount)
    if (filter === 'preapproved') filtered = filtered.filter((p) => p.preapproved)
    if (filter === 'no-collateral') filtered = filtered.filter((p) => p.tags.some((t) => t === 'Без залога'))
    if (filter === 'fast') filtered = filtered.filter((p) => p.tags.some((t) => t.toLowerCase().includes('решение')))
    return [...filtered].sort((a, b) => Number(b.preapproved ?? false) - Number(a.preapproved ?? false) || b.approval - a.approval)
  }, [filter, requestedAmount, products])

  const changeFilter = (value: Filter) => {
    setFilter(value)
    setCompare([])
  }

  const changeAmount = (value: number) => {
    setRequestedAmount(value)
    setCompare([])
  }

  const resetFilters = () => {
    setFilter('all')
    setRequestedAmount(1_000_000)
    setCompare([])
  }

  const toggleCompare = (id: string) =>
    setCompare((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev)

  const compareProducts = compare.map((id) => products.find((p) => p.id === id)!).filter(Boolean)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 space-y-3 border-b bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Кредиты для бизнеса</h2>
          <Button variant="outline" size="sm" onClick={onGoAssistant}>
            <Bot className="h-4 w-4 mr-1.5" /> Подобрать мне
          </Button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={filter === f.id ? 'default' : 'outline'}
              aria-pressed={filter === f.id}
              className="whitespace-nowrap font-normal"
              onClick={() => changeFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Нужная сумма</span>
            <span className="font-semibold">{fmt(requestedAmount)}</span>
          </div>
          <Slider
            aria-label="Нужная сумма кредита"
            value={[requestedAmount]}
            onValueChange={([value]) => changeAmount(value)}
            min={50_000}
            max={50_000_000}
            step={50_000}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>50 тыс ₽</span><span>50 млн ₽</span></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Найдено предложений: {list.length} · для суммы {fmt(requestedAmount)}</p>
        {list.length === 0 && <div className="rounded-lg border p-4 text-center space-y-3"><p className="text-sm text-muted-foreground">Нет продуктов с такими параметрами. Измените сумму или сбросьте фильтры.</p><Button variant="outline" size="sm" onClick={resetFilters}>Сбросить фильтры</Button></div>}
        {list.map((p) => (
          <div key={p.id} className="relative">
            <ProductCard product={p} onApply={onApply} selectedAmount={requestedAmount} />
            <button
              onClick={() => toggleCompare(p.id)}
              className={`absolute top-3 right-3 text-xs underline underline-offset-2 ${
                compare.includes(p.id) ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              {compare.includes(p.id) ? '✓ в сравнении' : 'сравнить'}
            </button>
          </div>
        ))}
      </div>

      {compare.length > 0 && (
        <div className="border-t bg-card p-3 flex items-center gap-2">
          <div className="flex -space-x-2 flex-1 overflow-hidden">
            {compareProducts.map((p) => (
              <div key={p.id} className="h-8 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 flex items-center border-2 border-card">
                {p.name}
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}>
            <GitCompareArrows className="h-4 w-4 mr-1" /> Сравнить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCompare([])}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Сравнение продуктов</DialogTitle>
            <DialogDescription>До 3 предложений рядом — ставки, переплата, требования</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Параметр</th>
                  {compareProducts.map((p) => (
                    <th key={p.id} className="py-2 pr-2 font-semibold text-foreground">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Ставка от', render: (p: Product) => p.rateFrom + '%' },
                  { label: 'Сумма', render: (p: Product) => `${(p.amountFrom / 1_000).toLocaleString('ru-RU')} тыс – ${p.amountTo / 1_000_000} млн ₽` },
                  { label: 'Срок', render: (p: Product) => `${p.termFrom}–${p.termTo} мес` },
                  {
                    label: 'Платёж¹',
                    render: (p: Product) => fmt(monthlyPay(requestedAmount, p.rateFrom + 1.5, Math.min(12, p.termTo)) ),
                  },
                  { label: 'Одобрение', render: (p: Product) => `~${p.approval}%` },
                  { label: 'Залог', render: (p: Product) => (p.tags.some((t) => t === 'Без залога' || t === 'Без документов' || t === 'Без справок') ? 'не нужен' : 'нужен') },
                  { label: 'Банк', render: (p: Product) => p.bank },
                ].map((row) => (
                  <tr key={row.label} className="border-t">
                    <td className="py-2 pr-2 text-muted-foreground">{row.label}</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2 pr-2 font-medium">{row.render(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">¹ Платёж на выбранную сумму {fmt(requestedAmount)} на 12 мес, ставка = минимальная + 1,5 п.п.</p>
          <div className="flex gap-2 justify-end">
            {compareProducts.map((p) => (
              <Button key={p.id} size="sm" onClick={() => { setCompareOpen(false); onApply(p) }}>
                Оформить: {p.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
