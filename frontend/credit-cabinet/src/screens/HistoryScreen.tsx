import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarClock,
  FileText,
  Wallet,
  ChevronRight,
  CircleDollarSign,
} from 'lucide-react'
import { fmt, monthlyPay, STATUS_LABEL, type CreditItem, type CreditStatus } from '@/lib/data'

type Tab = 'all' | CreditStatus

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Действующие' },
  { id: 'review', label: 'На рассмотрении' },
  { id: 'done', label: 'Завершённые' },
  { id: 'rejected', label: 'Отклонённые' },
]

const STATUS_ICON: Record<CreditStatus, typeof CheckCircle2> = {
  active: Wallet,
  done: CheckCircle2,
  rejected: XCircle,
  review: Clock,
}

const STATUS_COLOR: Record<CreditStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  done: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  review: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
}

const TIMELINE = ['Подана', 'Проверка документов', 'Скоринг', 'Решение', 'Договор', 'Деньги']

type Props = { items: CreditItem[] }

export function HistoryScreen({ items }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<CreditItem | null>(null)

  const list = useMemo(
    () => (tab === 'all' ? items : items.filter((i) => i.status === tab)),
    [tab, items],
  )

  const active = items.filter((i) => i.status === 'active')
  const totalDebt = active.reduce((s, i) => s + i.amount - (i.paid ?? 0), 0)
  const totalPay = active.reduce((s, i) => s + monthlyPay(i.amount - (i.paid ?? 0), i.rate, Math.max(1, i.termMonths - 12)), 0)
  const nearest = active
    .filter((i) => i.nextPayment)
    .sort((a, b) => a.nextPayment!.date.localeCompare(b.nextPayment!.date))[0]?.nextPayment

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b bg-card space-y-3">
        <h2 className="text-lg font-bold">История кредитов</h2>
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2.5">
            <div className="text-[11px] text-muted-foreground">Остаток долга</div>
            <div className="font-bold text-sm leading-tight">{(totalDebt / 1000).toLocaleString('ru-RU')} тыс ₽</div>
          </Card>
          <Card className="p-2.5">
            <div className="text-[11px] text-muted-foreground">Платёж / мес</div>
            <div className="font-bold text-sm leading-tight">{fmt(totalPay)}</div>
          </Card>
          <Card className="p-2.5 bg-primary text-primary-foreground border-primary">
            <div className="text-[11px] opacity-80">Ближайший</div>
            <div className="font-bold text-sm leading-tight">{nearest ? fmt(nearest.amount) : '—'}</div>
            <div className="text-[10px] opacity-80">{nearest?.date ?? ''}</div>
          </Card>
        </div>
        {nearest && (
          <Button className="w-full" size="sm" onClick={() => alert('Демо: переход к оплате через СБП')}>
            <CircleDollarSign className="h-4 w-4 mr-1.5" /> Погасить ближайший платёж
          </Button>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Badge
              key={t.id}
              variant={tab === t.id ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap font-normal"
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id !== 'all' && (
                <span className="ml-1 opacity-60">{items.filter((i) => i.status === t.id).length}</span>
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">В этой категории пока ничего нет</p>
        )}
        {list.map((c) => {
          const Icon = STATUS_ICON[c.status]
          const progress = c.status === 'active' ? Math.round(((c.paid ?? 0) / c.amount) * 100) : c.status === 'done' ? 100 : 0
          return (
            <Card key={c.id} className="p-4 space-y-2.5 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setSelected(c)}>
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${c.status === 'rejected' ? 'text-red-500' : c.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-tight truncate">{c.productName}</div>
                  <div className="text-xs text-muted-foreground">{c.bank} · от {c.createdAt}</div>
                </div>
                <Badge className={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              </div>

              <div className="flex justify-between text-sm">
                <span className="font-bold">{fmt(c.amount)}</span>
                <span className="text-muted-foreground">ставка {c.rate}% · {c.termMonths} мес</span>
              </div>

              {c.status === 'active' && (
                <>
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>выплачено {fmt(c.paid ?? 0)}</span>
                    <span>{progress}%</span>
                  </div>
                </>
              )}

              {c.status === 'review' && (
                <div className="flex items-center gap-1">
                  {TIMELINE.slice(0, 4).map((s, i) => (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full h-1 rounded-full ${i < 2 ? 'bg-primary' : 'bg-muted'}`} />
                      <span className={`text-[9px] text-center leading-tight ${i < 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-primary font-medium">
                <span className="flex items-center gap-1">
                  {c.status === 'active' && <><CalendarClock className="h-3.5 w-3.5" /> график и платежи</>}
                  {c.status === 'done' && <><FileText className="h-3.5 w-3.5" /> закрывающие документы</>}
                  {c.status === 'rejected' && 'причины и план улучшения'}
                  {c.status === 'review' && 'отследить статус'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.productName}</DialogTitle>
                <DialogDescription>{selected.bank} · оформлен {selected.createdAt}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Сумма</span><span className="font-semibold">{fmt(selected.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ставка</span><span className="font-semibold">{selected.rate}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Срок</span><span className="font-semibold">{selected.termMonths} мес</span></div>
                {selected.status === 'active' && (
                  <>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">Выплачено</span><span className="font-semibold text-emerald-700">{fmt(selected.paid ?? 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Остаток</span><span className="font-semibold">{fmt(selected.amount - (selected.paid ?? 0))}</span></div>
                    {selected.nextPayment && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Ближайший платёж</span><span className="font-semibold">{fmt(selected.nextPayment.amount)} · {selected.nextPayment.date}</span></div>
                    )}
                  </>
                )}
                {selected.status === 'rejected' && (
                  <>
                    <Separator />
                    <p className="text-xs leading-relaxed">
                      Причина: запрошенная сумма превышает подтверждённый оборот бизнеса. План: 3 месяца регулярных оборотов по счёту + снижение суммы до 3 млн ₽ поднимут вероятность одобрения до ~70%.
                    </p>
                  </>
                )}
              </div>
              {selected.status === 'active' && (
                <div>
                  <div className="text-sm font-medium mb-2">График платежей</div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {Array.from({ length: 6 }, (_, i) => {
                      const pay = monthlyPay(selected.amount - (selected.paid ?? 0), selected.rate, Math.max(1, selected.termMonths - 12))
                      return (
                        <div key={i} className="flex justify-between text-sm rounded-md bg-muted/60 px-3 py-1.5">
                          <span className="text-muted-foreground">{String(i + 1).padStart(2, '0')}.{String(((new Date().getMonth() + i) % 12) + 1).padStart(2, '0')}.2027</span>
                          <span className="font-medium">{fmt(pay)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <Button className="w-full" onClick={() => setSelected(null)}>Закрыть</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
