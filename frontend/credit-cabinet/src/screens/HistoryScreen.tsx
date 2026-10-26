import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Clock, XCircle, FileText, Wallet, ChevronRight, PenLine, MessageSquareText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fmt, STATUS_LABEL, type CreditItem, type CreditStatus } from '@/lib/data'

type Tab = 'all' | CreditStatus
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Все' }, { id: 'review', label: 'В работе' }, { id: 'clarification', label: 'Уточнения' },
  { id: 'signing', label: 'Договор' }, { id: 'active', label: 'Выданные' }, { id: 'rejected', label: 'Отказы' }, { id: 'done', label: 'Закрытые' },
]
const STATUS_ICON: Record<CreditStatus, typeof CheckCircle2> = {
  active: Wallet, done: CheckCircle2, rejected: XCircle, review: Clock, signing: PenLine, clarification: MessageSquareText,
}
const STATUS_COLOR: Record<CreditStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100', done: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100', review: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  signing: 'bg-blue-100 text-blue-800 hover:bg-blue-100', clarification: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
}
const STAGES = ['submitted', 'data_check', 'external_check', 'scoring', 'decision', 'signing', 'issued']
const STAGE_LABELS = ['Подача', 'Данные', 'Проверки', 'Скоринг', 'Решение', 'Договор', 'Выдача']

type Props = {
  items: CreditItem[]
  onSign: (item: CreditItem) => Promise<void>
  onClarify: (item: CreditItem, comment: string) => Promise<void>
}

export function HistoryScreen({ items, onSign, onClarify }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useMemo(() => tab === 'all' ? items : items.filter((i) => i.status === tab), [tab, items])
  const selected = items.find((item) => item.id === selectedId) ?? null

  const perform = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
      setComment('')
    } catch (error) {
      toast.error('Действие не выполнено', { description: error instanceof Error ? error.message : 'Проверьте API' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b bg-card space-y-3">
        <div><h2 className="text-lg font-bold">Заявки и кредиты</h2><p className="text-xs text-muted-foreground">Статусы обновляются автоматически каждые 2 секунды</p></div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">{TABS.map((t) => <Badge key={t.id} variant={tab === t.id ? 'default' : 'outline'} className="cursor-pointer whitespace-nowrap font-normal" onClick={() => setTab(t.id)}>{t.label}{t.id !== 'all' && <span className="ml-1 opacity-60">{items.filter((i) => i.status === t.id).length}</span>}</Badge>)}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">В этой категории пока ничего нет</p>}
        {list.map((credit) => {
          const Icon = STATUS_ICON[credit.status]
          const stageIndex = credit.statusRaw ? STAGES.indexOf(credit.statusRaw) : credit.status === 'active' ? 6 : -1
          return <Card key={credit.id} className="p-4 space-y-2.5 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setSelectedId(credit.id)}>
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 shrink-0 ${credit.status === 'rejected' ? 'text-red-500' : credit.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0"><div className="font-medium text-sm leading-tight truncate">{credit.productName}</div><div className="text-xs text-muted-foreground">{credit.backendId ? `Заявка №${credit.backendId}` : 'Демо-кредит'} · {credit.createdAt}</div></div>
              <Badge className={STATUS_COLOR[credit.status]}>{STATUS_LABEL[credit.status]}</Badge>
            </div>
            <div className="flex justify-between text-sm gap-2"><span className="font-bold">{fmt(credit.amount)}</span><span className="text-muted-foreground text-right">{credit.rate}% · {credit.termMonths} мес</span></div>
            {credit.backendId && credit.status !== 'rejected' && credit.status !== 'active' && <div className="flex gap-1">{STAGE_LABELS.map((label, i) => <div key={label} className="flex-1" title={label}><div className={`h-1 rounded-full ${i <= stageIndex ? 'bg-primary' : 'bg-muted'}`} /></div>)}</div>}
            <div className="flex items-center justify-between text-xs text-primary font-medium"><span>{credit.status === 'clarification' ? 'ответить банку' : credit.status === 'signing' ? 'подписать договор' : credit.status === 'rejected' ? 'причина решения' : 'подробности и история'}</span><ChevronRight className="h-4 w-4" /></div>
          </Card>
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelectedId(null); setComment('') } }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {selected && <>
            <DialogHeader><DialogTitle>{selected.productName}</DialogTitle><DialogDescription>{selected.bank} · {selected.backendId ? `заявка №${selected.backendId}` : 'синтетический кредит'}</DialogDescription></DialogHeader>
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Статус</span><span className="font-semibold">{STATUS_LABEL[selected.status]}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Сумма</span><span className="font-semibold">{fmt(selected.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ставка</span><span className="font-semibold">{selected.rate}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Срок</span><span className="font-semibold">{selected.termMonths} мес</span></div>
              {selected.score !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Скоринг</span><span className="font-semibold">{selected.score}/100</span></div>}
              {selected.purpose && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Цель</span><span className="font-semibold text-right">{selected.purpose}</span></div>}
            </div>
            {selected.decisionComment && <div className="rounded-lg border p-3"><div className="text-xs font-medium mb-1">Последнее событие</div><p className="text-sm leading-relaxed">{selected.decisionComment}</p></div>}
            {selected.status === 'clarification' && selected.backendId && <div className="space-y-2"><label className="text-sm font-medium">Ответ банку</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Уточните финансовые показатели или параметры запроса" className="w-full min-h-20 rounded-md border bg-background p-3 text-sm" /><Button className="w-full" disabled={comment.trim().length < 3 || busy} onClick={() => perform(() => onClarify(selected, comment.trim()))}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquareText className="h-4 w-4 mr-2" />}Отправить уточнение</Button></div>}
            {selected.status === 'signing' && selected.backendId && <Button className="w-full" disabled={busy} onClick={() => perform(() => onSign(selected))}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenLine className="h-4 w-4 mr-2" />}Подписать и смоделировать выдачу</Button>}
            {selected.history && selected.history.length > 0 && <div><div className="text-sm font-medium mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />История обработки</div><div className="space-y-3 border-l pl-3">{[...selected.history].reverse().map((event, index) => <div key={`${event.at}-${index}`}><div className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString('ru-RU')} · {event.to}</div><p className="text-xs leading-relaxed mt-0.5">{event.comment}</p></div>)}</div></div>}
            <Button variant="outline" className="w-full" onClick={() => setSelectedId(null)}>Закрыть</Button>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
