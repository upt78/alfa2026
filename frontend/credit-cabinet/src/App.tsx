import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { UserRound, Bot, Store, History } from 'lucide-react'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { AssistantScreen } from '@/screens/AssistantScreen'
import { MarketScreen } from '@/screens/MarketScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { ApplyWizard } from '@/components/ApplyWizard'
import {
  INITIAL_CREDITS,
  type CreditItem,
  type Product,
  type User,
} from '@/lib/data'

type Tab = 'profile' | 'assistant' | 'market' | 'history'

const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Профиль', icon: UserRound },
  { id: 'assistant', label: 'Советник', icon: Bot },
  { id: 'market', label: 'Биржа', icon: Store },
  { id: 'history', label: 'История', icon: History },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('profile')
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<CreditItem[]>(INITIAL_CREDITS)
  const [applying, setApplying] = useState<Product | null>(null)

  const openApply = (p: Product) => setApplying(p)

  const finishApply = (amount: number, term: number) => {
    if (!applying) return
    const item: CreditItem = {
      id: 'c' + Date.now(),
      productName: applying.name,
      bank: applying.bank,
      amount,
      rate: applying.rateFrom + 1.5,
      termMonths: term,
      status: 'review',
      createdAt: new Date().toLocaleDateString('ru-RU'),
    }
    setCredits((prev) => [item, ...prev])
    setTab('history')
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-8">
      {/* Подпись сбоку на десктопе */}
      <div className="hidden lg:block max-w-xs mr-12 text-slate-300">
        <h1 className="text-3xl font-extrabold text-white leading-tight">
          Умный кредитный кабинет предпринимателя
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Интерактивный прототип мобильного приложения для ММБ с ИИ-ассистентом:
          от регистрации и подбора продукта до заявки и решения.
        </p>
        <ul className="mt-6 space-y-2.5 text-sm">
          {[
            '1. Регистрация и профиль бизнеса',
            '2. ИИ-ассистент подбирает кредит',
            '3. Биржа кредитов и сравнение',
            '4. История заявок и кредитов',
          ].map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              {s.replace(/^\d\.\s/, '')}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-slate-500">Демо-данные · кликайте по элементам</p>
      </div>

      {/* Корпус телефона */}
      <div className="relative w-full max-w-[400px] h-[min(830px,92vh)] rounded-[2.6rem] border-[10px] border-slate-800 bg-background shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Статус-бар */}
        <div className="flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-semibold bg-card shrink-0">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-current opacity-70" />
            <span className="inline-block h-2 w-3.5 rounded-[3px] border border-current opacity-70 relative">
              <span className="absolute inset-[2px] right-[30%] bg-current rounded-[1px]" />
            </span>
          </div>
        </div>

        {/* Экран */}
        <div className="flex-1 min-h-0">
          {tab === 'profile' && (
            <ProfileScreen user={user} onLogin={setUser} onLogout={() => setUser(null)} />
          )}
          {tab === 'assistant' && <AssistantScreen applications={credits} onApply={openApply} />}
          {tab === 'market' && <MarketScreen onApply={openApply} onGoAssistant={() => setTab('assistant')} />}
          {tab === 'history' && <HistoryScreen items={credits} />}
        </div>

        {/* Нижняя навигация */}
        <nav className="grid grid-cols-4 border-t bg-card shrink-0 pb-1">
          {TABS.map((t) => {
            const activeTab = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  activeTab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="h-5 w-5" />
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      <ApplyWizard product={applying} onClose={() => setApplying(null)} onFinish={finishApply} />
      <Toaster position="top-center" richColors />
    </div>
  )
}
