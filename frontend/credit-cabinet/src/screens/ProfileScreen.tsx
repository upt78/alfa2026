import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { UserRound, ShieldCheck, Building2, Gauge, Landmark, LogOut, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import type { User } from '@/lib/data'

type Props = { user: User | null; onLogin: (u: User) => void; onLogout: () => void }

const TURNOVERS = [
  { label: 'до 300 тыс ₽/мес', revenue: 2_400_000 },
  { label: '300 тыс – 1 млн ₽/мес', revenue: 9_600_000 },
  { label: '1 – 5 млн ₽/мес', revenue: 24_000_000 },
  { label: 'свыше 5 млн ₽/мес', revenue: 96_000_000 },
]
const GOALS = ['Пополнение оборотных средств', 'Развитие бизнеса и оборудование', 'Закупка товара к сезону']
const COMPANIES: Record<string, { name: string; okved: string; age: number }> = {
  '7701234567': { name: 'ООО Ромашка', okved: '47.11', age: 7 },
  '7707654321': { name: 'ООО Лютик', okved: '56.10', age: 4 },
  '501234567890': { name: 'ИП Смирнов Алексей Викторович', okved: '47.11', age: 7 },
}

export function ProfileScreen({ user, onLogin, onLogout }: Props) {
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('+7 900 000-00-00')
  const [code, setCode] = useState('')
  const [inn, setInn] = useState('7701234567')
  const [autofilled, setAutofilled] = useState(false)
  const [turnover, setTurnover] = useState(TURNOVERS[2])
  const [goal, setGoal] = useState(GOALS[0])
  const company = COMPANIES[inn]

  const findCompany = () => {
    if (!company) {
      setAutofilled(false)
      toast.error('ИНН нет в локальном моке', { description: 'Используйте 7701234567, 7707654321 или 501234567890.' })
      return
    }
    setAutofilled(true)
    toast.success('Данные найдены в локальном моке реестра', { description: `${company.name} · ОКВЭД ${company.okved}` })
  }

  if (!user) return (
    <div className="h-full overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-teal-50/60 to-background">
      {step === 0 && <>
        <div className="text-center pt-8 space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center"><Landmark className="h-8 w-8" /></div>
          <h1 className="text-xl font-extrabold leading-tight">Умный кредитный<br />кабинет предпринимателя</h1>
          <p className="text-sm text-muted-foreground">Персональный подбор и реальная обработка заявки в локальном конвейере</p>
        </div>
        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">Вход в демо-кабинет</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" aria-label="Телефон" />
          <Button className="w-full" disabled={phone.replace(/\D/g, '').length < 10} onClick={() => setStep(1)}>Продолжить <ArrowRight className="h-4 w-4 ml-1" /></Button>
          <p className="text-xs text-center text-muted-foreground">Без SMS и внешних сервисов: подтверждение выполняется локально</p>
        </Card>
      </>}
      {step === 1 && <Card className="p-4 space-y-3 mt-16">
        <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-primary" />Локальный код подтверждения</div>
        <p className="text-xs text-muted-foreground">Введите любые 4 цифры, например 2026</p>
        <Input placeholder="••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" className="text-center text-2xl tracking-[0.6em]" />
        <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" />Назад</Button><Button className="flex-1" disabled={code.length < 4} onClick={() => setStep(2)}>Подтвердить <ArrowRight className="h-4 w-4 ml-1" /></Button></div>
      </Card>}
      {step === 2 && <Card className="p-4 space-y-4 mt-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-primary" />Данные бизнеса</div>
        <div className="space-y-2"><label className="text-xs text-muted-foreground">ИНН</label><div className="flex gap-2"><Input value={inn} onChange={(e) => { setInn(e.target.value.replace(/\D/g, '').slice(0, 12)); setAutofilled(false) }} inputMode="numeric" /><Button variant="secondary" disabled={inn.length !== 10 && inn.length !== 12} onClick={findCompany}>Найти</Button></div><p className="text-[11px] text-muted-foreground">Успешный сценарий: 7701234567 · отказ: 7707654321</p></div>
        {autofilled && company && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm space-y-1"><div className="font-medium">{company.name}</div><div className="text-xs text-muted-foreground">ОКВЭД {company.okved} · возраст бизнеса {company.age} лет</div><div className="text-xs text-muted-foreground">Все сведения синтетические</div></div>}
        <div className="space-y-2"><label className="text-xs text-muted-foreground">Средний оборот в месяц</label><div className="flex flex-wrap gap-1.5">{TURNOVERS.map((t) => <Badge key={t.label} variant={turnover.label === t.label ? 'default' : 'outline'} className="cursor-pointer font-normal" onClick={() => setTurnover(t)}>{t.label}</Badge>)}</div></div>
        <div className="space-y-2"><label className="text-xs text-muted-foreground">Цель кредитования</label><div className="flex flex-wrap gap-1.5">{GOALS.map((g) => <Badge key={g} variant={goal === g ? 'default' : 'outline'} className="cursor-pointer font-normal" onClick={() => setGoal(g)}>{g}</Badge>)}</div></div>
        <Button className="w-full" disabled={!autofilled} onClick={() => {
          if (!company) return
          onLogin({ phone, inn, name: company.name, okved: company.okved, turnover: turnover.label, goal, revenue: turnover.revenue, ageYears: company.age })
          toast.success('Кабинет готов', { description: 'Профиль сохранён в браузере, заявки будут храниться в базе.' })
        }}><Sparkles className="h-4 w-4 mr-1.5" />Создать кабинет</Button>
      </Card>}
    </div>
  )

  return <div className="h-full overflow-y-auto p-5 space-y-4">
    <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><UserRound className="h-6 w-6" /></div><div className="flex-1"><div className="font-semibold leading-tight">{user.name}</div><div className="text-xs text-muted-foreground">ИНН {user.inn} · ОКВЭД {user.okved}</div></div><Button variant="ghost" size="icon" onClick={onLogout} title="Выйти"><LogOut className="h-4 w-4" /></Button></div>
    <Card className="p-4"><div className="flex items-center gap-2 text-sm font-medium mb-3"><Gauge className="h-4 w-4 text-primary" />Профиль для персонального подбора</div><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-muted p-2.5"><div className="text-muted-foreground">Оборот</div><div className="font-medium">{user.turnover}</div></div><div className="rounded-lg bg-muted p-2.5"><div className="text-muted-foreground">Возраст</div><div className="font-medium">{user.ageYears} лет</div></div><div className="rounded-lg bg-muted p-2.5 col-span-2"><div className="text-muted-foreground">Цель</div><div className="font-medium">{user.goal}</div></div></div><p className="text-xs text-muted-foreground mt-3">Эти данные передаются в API рекомендаций и в скоринг заявки.</p></Card>
    <Card className="p-4 text-sm space-y-2"><div className="font-medium">Границы прототипа</div><p className="text-xs text-muted-foreground leading-relaxed">Вход, реестр, БКИ, подписание и выдача смоделированы локально. Это не банковское одобрение и не реальная кредитная операция.</p></Card>
  </div>
}
