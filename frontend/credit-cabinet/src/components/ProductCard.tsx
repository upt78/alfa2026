import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Landmark, ShieldCheck, Zap } from 'lucide-react'
import { fmt, monthlyPay, type Product } from '@/lib/data'

type Props = {
  product: Product
  onApply: (p: Product) => void
  compact?: boolean
  selectedAmount?: number
}

export function ProductCard({ product: p, onApply, compact, selectedAmount }: Props) {
  const amount = selectedAmount
    ? Math.min(Math.max(selectedAmount, p.amountFrom), p.amountTo)
    : Math.min(p.amountTo, Math.max(p.amountFrom, 1_000_000))
  const months = Math.min(Math.max(12, p.termFrom), p.termTo)
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" />
            {p.bank}
          </div>
          <div className="font-semibold leading-tight">{p.name}</div>
        </div>
        {p.preapproved && (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Предодобрено</Badge>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-lg font-bold leading-none">
            {fmt(p.amountFrom)} – {p.amountTo >= 1_000_000 ? p.amountTo / 1_000_000 + ' млн ₽' : fmt(p.amountTo)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">ставка от {p.rateFrom}% годовых</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{fmt(monthlyPay(amount, p.rateFrom + 1.5, months))}</div>
          <div className="text-xs text-muted-foreground">в месяц*</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Progress value={p.matchScore ?? p.approval} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {p.matchScore !== undefined ? `совпадение ${p.matchScore}%` : `базовый рейтинг ${p.approval}%`}
        </span>
      </div>
      {p.reason && <p className="text-xs text-emerald-700 leading-relaxed">{p.reason}</p>}

      {!compact && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <Badge key={t} variant="secondary" className="font-normal text-xs">
                {t.includes('Решение') ? <Zap className="h-3 w-3 mr-1" /> : t.includes('Без') || t.includes('Под') ? <ShieldCheck className="h-3 w-3 mr-1" /> : null}
                {t}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
        </>
      )}

      <Button className="w-full" onClick={() => onApply(p)}>
        Оформить
      </Button>
    </Card>
  )
}
