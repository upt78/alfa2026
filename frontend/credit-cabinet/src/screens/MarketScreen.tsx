import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { fmt, monthlyPay, PRODUCTS, type Product } from '@/lib/data'

type Filter = 'all' | 'no-collateral' | 'fast' | 'preapproved'

type Props = {
  onApply: (p: Product) => void
  onGoAssistant: () => void
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все предложения' },
  { id: 'preapproved', label: 'Предодобрено' },
  { id: 'no-collateral', label: 'Без залога' },
  { id: 'fast', label: 'Быстрое решение' },
]

export function MarketScreen({ onApply, onGoAssistant }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [maxAmount, setMaxAmount] = useState(30_000_000)
  const [compare, setCompare] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  const list = useMemo(() => {
    let l = PRODUCTS.filter((p) => p.amountFrom <= maxAmount)
    if (filter === 'preapproved') l = l.filter((p) => p.preapproved)
    if (filter === 'no-collateral') l = l.filter((p) => p.tags.some((t) => t === 'Без залога'))
    if (filter === 'fast') l = l.filter((p) => p.tags.some((t) => t.includes('Решение')))
    // предодобренные первыми
    return [...l].sort((a, b) => Number(b.preapproved ?? false) - Number(a.preapproved ?? false) || b.approval - a.approval)
  }, [filter, maxAmount])

  const toggleCompare = (id: string) =>
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    )

  const compareProducts = compare.map((id) => PRODUCTS.find((p) => p.id === id)!).filter(Boolean)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 space-y-3 border-b bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Биржа кредитов</h2>
          <Button variant="outline" size="sm" onClick={onGoAssistant}>
            <Bot className="h-4 w-4 mr-1.5" /> Подобрать мне
          </Button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Badge
              key={f.id}
              variant={filter === f.id ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap font-normal"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Нужная сумма</span>
            <span className="font-semibold">до {maxAmount / 1_000_000} млн ₽</span>
          </div>
          <Slider
            value={[maxAmount]}
            onValueChange={([v]) => setMaxAmount(v)}
            min={500_000}
            max={100_000_000}
            step={500_000}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filter !== 'all' && (
          <p className="text-xs text-muted-foreground">Найдено предложений: {list.length}</p>
        )}
        {list.map((p) => (
          <div key={p.id} className="relative">
            <ProductCard product={p} onApply={onApply} selectedAmount={Math.min(Math.max(maxAmount / 3, p.amountFrom), p.amountTo)} />
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
                    render: (p: Product) => fmt(monthlyPay(Math.min(Math.max(maxAmount / 3, p.amountFrom), p.amountTo), p.rateFrom + 1.5, Math.min(12, p.termTo)) ),
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
          <p className="text-xs text-muted-foreground">¹ Платёж на 1 млн ₽ на 12 мес, ставка = минимальная + 1,5 п.п.</p>
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
